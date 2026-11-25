import crypto from 'node:crypto';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { config } from '../config.ts';
import {
  db,
  getPaymentSettings,
  mapCatalogItem,
  mapOrderWithItems,
  mapPromoCode,
} from '../db.ts';
import { requireAuth } from '../middleware/auth.ts';
import { fulfillPaidOrder } from '../services/fulfillment.ts';
import { buildDynamicQrisPayload } from '../utils/qris.ts';
import type { PaymentMethod, ServiceBrief } from '../../src/types/index.ts';

export const ordersRouter = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.png';
    const safeExt = ['.png', '.jpg', '.jpeg', '.webp', '.pdf'].includes(ext)
      ? ext
      : '.png';
    cb(null, `proof-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

interface IncomingOrderItem {
  catalogItemId: string;
  tierName?: string;
  quantity?: number;
  brief?: ServiceBrief;
}

ordersRouter.post('/', requireAuth, (req, res) => {
  const {
    items,
    promoCode,
    paymentMethod,
    paymentChannel,
    customerName,
    customerEmail,
    customerPhone,
  } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Keranjang belanja masih kosong.' });
  }

  const validMethods: PaymentMethod[] = [
    'QRIS',
    'BANK_TRANSFER',
    'EWALLET',
    'WEB3_CRYPTO',
  ];
  if (!validMethods.includes(paymentMethod)) {
    return res.status(400).json({ error: 'Metode pembayaran tidak valid.' });
  }

  const resolvedItems: Array<{
    catalogItemId: string;
    itemType: string;
    itemTitle: string;
    tierName: string | null;
    unitPriceIdr: number;
    quantity: number;
    brief: ServiceBrief | null;
  }> = [];

  let subtotalIdr = 0;

  for (const rawItem of items as IncomingOrderItem[]) {
    const catRow = db
      .prepare('SELECT * FROM catalog_items WHERE id = ? AND is_active = 1')
      .get(String(rawItem.catalogItemId)) as Record<string, unknown> | undefined;

    if (!catRow) {
      return res.status(404).json({ error: 'Salah satu item katalog tidak tersedia.' });
    }

    const catalogItem = mapCatalogItem(catRow);
    const quantity = Math.max(1, Math.min(20, Number(rawItem.quantity || 1)));
    let unitPriceIdr = catalogItem.priceIdr;
    let tierName: string | null = rawItem.tierName || null;

    if (catalogItem.type === 'SERVICE' && catalogItem.metadata.tiers?.length) {
      const chosenTier =
        catalogItem.metadata.tiers.find((t) => t.name === rawItem.tierName) ||
        catalogItem.metadata.tiers[0];
      unitPriceIdr = chosenTier.priceIdr;
      tierName = chosenTier.name;
    } else if (catalogItem.type === 'PRODUCT') {
      tierName = catalogItem.metadata.licenseType || 'Standard License';
    }

    subtotalIdr += unitPriceIdr * quantity;
    resolvedItems.push({
      catalogItemId: catalogItem.id,
      itemType: catalogItem.type,
      itemTitle: catalogItem.title,
      tierName,
      unitPriceIdr,
      quantity,
      brief: rawItem.brief || null,
    });
  }

  let discountIdr = 0;
  let appliedPromo: string | null = null;
  if (promoCode && String(promoCode).trim()) {
    const cleanCode = String(promoCode).trim().toUpperCase();
    const promoRow = db
      .prepare('SELECT * FROM promo_codes WHERE code = ? AND is_active = 1')
      .get(cleanCode) as Record<string, unknown> | undefined;

    if (promoRow) {
      const promo = mapPromoCode(promoRow);
      discountIdr = Math.round((subtotalIdr * promo.discountPercent) / 100);
      if (promo.maxDiscountIdr && discountIdr > promo.maxDiscountIdr) {
        discountIdr = promo.maxDiscountIdr;
      }
      appliedPromo = promo.code;
      db.prepare('UPDATE promo_codes SET usage_count = usage_count + 1 WHERE id = ?').run(
        promo.id
      );
    }
  }

  const uniqueCode =
    paymentMethod === 'BANK_TRANSFER' || paymentMethod === 'EWALLET'
      ? Math.floor(101 + Math.random() * 880)
      : 0;

  const totalIdr = Math.max(1000, subtotalIdr - discountIdr + uniqueCode);
  const orderId = 'ord-' + crypto.randomBytes(6).toString('hex');
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const invoiceNumber = `INV-BD-${datePart}-${randomSuffix}`;
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();

  const settings = getPaymentSettings();
  const qrisPayload =
    paymentMethod === 'QRIS'
      ? buildDynamicQrisPayload({
          staticPayload: settings.qris.staticPayload,
          merchantName: settings.qris.merchantName,
          merchantCity: settings.qris.merchantCity,
          nmid: settings.qris.nmid,
          amountIdr: totalIdr,
          invoiceNumber,
        })
      : null;

  db.prepare(
    `INSERT INTO orders (
      id, invoice_number, user_id, customer_name, customer_email, customer_phone,
      payment_method, payment_channel, subtotal_idr, discount_idr, unique_code, total_idr,
      promo_code, status, qris_payload, expires_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_PAYMENT', ?, ?, ?)`
  ).run(
    orderId,
    invoiceNumber,
    req.user!.id,
    String(customerName || req.user!.name).trim(),
    String(customerEmail || req.user!.email).trim(),
    String(customerPhone || req.user!.phone || '-').trim(),
    paymentMethod,
    String(paymentChannel || paymentMethod),
    subtotalIdr,
    discountIdr,
    uniqueCode,
    totalIdr,
    appliedPromo,
    qrisPayload,
    expiresAt,
    now
  );

  const insertItem = db.prepare(
    `INSERT INTO order_items (
      id, order_id, catalog_item_id, item_type, item_title, tier_name,
      unit_price_idr, quantity, brief_json, service_status, service_updates_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'QUEUED', '[]')`
  );

  for (const item of resolvedItems) {
    insertItem.run(
      'oi-' + crypto.randomBytes(6).toString('hex'),
      orderId,
      item.catalogItemId,
      item.itemType,
      item.itemTitle,
      item.tierName,
      item.unitPriceIdr,
      item.quantity,
      item.brief ? JSON.stringify(item.brief) : null
    );
  }

  const createdRow = db
    .prepare('SELECT * FROM orders WHERE id = ?')
    .get(orderId) as Record<string, unknown>;

  res.status(201).json({ order: mapOrderWithItems(createdRow) });
});

ordersRouter.get('/my', requireAuth, (req, res) => {
  const rows = db
    .prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.user!.id) as Record<string, unknown>[];

  res.json({ orders: rows.map(mapOrderWithItems) });
});

ordersRouter.get('/:id', requireAuth, (req, res) => {
  const row = db
    .prepare('SELECT * FROM orders WHERE id = ? OR invoice_number = ?')
    .get(String(req.params.id), String(req.params.id)) as
    | Record<string, unknown>
    | undefined;

  if (!row) {
    return res.status(404).json({ error: 'Order tidak ditemukan.' });
  }
  if (String(row.user_id) !== req.user!.id && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Akses ditolak.' });
  }
  res.json({ order: mapOrderWithItems(row) });
});

ordersRouter.post('/:id/proof', requireAuth, upload.single('proofFile'), (req, res) => {
  const orderId = String(req.params.id);
  const row = db
    .prepare('SELECT * FROM orders WHERE id = ?')
    .get(orderId) as Record<string, unknown> | undefined;

  if (!row) {
    return res.status(404).json({ error: 'Order tidak ditemukan.' });
  }
  if (String(row.user_id) !== req.user!.id && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Akses ditolak.' });
  }
  if (String(row.status) === 'PAID') {
    return res.status(400).json({ error: 'Order sudah berstatus lunas.' });
  }

  const {
    paymentSenderName,
    paymentReference,
    web3TxHash,
    web3Chain,
    web3FromAddress,
  } = req.body || {};

  const proofUrl = req.file
    ? `/uploads/${req.file.filename}`
    : (row.payment_proof_url as string | null);

  db.prepare(
    `UPDATE orders
     SET status = 'AWAITING_VERIFICATION',
         payment_proof_url = COALESCE(?, payment_proof_url),
         payment_sender_name = COALESCE(?, payment_sender_name),
         payment_reference = COALESCE(?, payment_reference),
         web3_tx_hash = COALESCE(?, web3_tx_hash),
         web3_chain = COALESCE(?, web3_chain),
         web3_from_address = COALESCE(?, web3_from_address)
     WHERE id = ?`
  ).run(
    proofUrl,
    paymentSenderName ? String(paymentSenderName).trim() : null,
    paymentReference ? String(paymentReference).trim() : null,
    web3TxHash ? String(web3TxHash).trim() : null,
    web3Chain ? String(web3Chain).trim() : null,
    web3FromAddress ? String(web3FromAddress).trim() : null,
    orderId
  );

  const updated = db
    .prepare('SELECT * FROM orders WHERE id = ?')
    .get(orderId) as Record<string, unknown>;

  res.json({
    order: mapOrderWithItems(updated),
    message: 'Konfirmasi pembayaran berhasil dikirim. Admin akan segera memverifikasi.',
  });
});

ordersRouter.post('/:id/sandbox-confirm', requireAuth, (req, res) => {
  const settings = getPaymentSettings();
  if (!settings.sandboxMode) {
    return res.status(403).json({
      error: 'Mode Sandbox nonaktif. Gunakan unggah bukti pembayaran atau webhook live.',
    });
  }

  const orderId = String(req.params.id);
  const row = db
    .prepare('SELECT * FROM orders WHERE id = ?')
    .get(orderId) as Record<string, unknown> | undefined;

  if (!row) {
    return res.status(404).json({ error: 'Order tidak ditemukan.' });
  }
  if (String(row.user_id) !== req.user!.id && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Akses ditolak.' });
  }

  fulfillPaidOrder(
    orderId,
    'Pembayaran terkonfirmasi otomatis melalui Boyang Sandbox Instant Payment.'
  );

  const updated = db
    .prepare('SELECT * FROM orders WHERE id = ?')
    .get(orderId) as Record<string, unknown>;
  res.json({
    order: mapOrderWithItems(updated),
    message: 'Pembayaran berhasil dikonfirmasi instan! Akses layanan/kursus/produk Anda aktif.',
  });
});
