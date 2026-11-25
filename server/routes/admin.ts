import crypto from 'node:crypto';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { config } from '../config.ts';
import {
  db,
  getPaymentSettings,
  mapCatalogItem,
  mapConsultation,
  mapOrderWithItems,
  mapPromoCode,
  mapUser,
  savePaymentSetting,
} from '../db.ts';
import { requireAdmin } from '../middleware/auth.ts';
import { fulfillPaidOrder } from '../services/fulfillment.ts';
import type { ServiceOrderStatus, ServiceUpdate } from '../../src/types/index.ts';

export const adminRouter = Router();
adminRouter.use(requireAdmin);

const qrisUploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.png';
    cb(null, `qris-merchant-${Date.now()}${ext}`);
  },
});

const qrisUpload = multer({
  storage: qrisUploadStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

adminRouter.get('/overview', (_req, res) => {
  const paidStats = db
    .prepare(
      `SELECT COUNT(*) as totalPaidOrders, COALESCE(SUM(total_idr), 0) as totalRevenueIdr
       FROM orders WHERE status = 'PAID'`
    )
    .get() as { totalPaidOrders: number; totalRevenueIdr: number };

  const pendingVerificationCount = (
    db
      .prepare(
        `SELECT COUNT(*) as cnt FROM orders WHERE status IN ('AWAITING_VERIFICATION', 'PENDING_PAYMENT')`
      )
      .get() as { cnt: number }
  ).cnt;

  const awaitingReviewCount = (
    db
      .prepare(`SELECT COUNT(*) as cnt FROM orders WHERE status = 'AWAITING_VERIFICATION'`)
      .get() as { cnt: number }
  ).cnt;

  const totalUsers = (
    db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number }
  ).cnt;

  const totalCatalogItems = (
    db.prepare('SELECT COUNT(*) as cnt FROM catalog_items WHERE is_active = 1').get() as {
      cnt: number;
    }
  ).cnt;

  const newConsultationsCount = (
    db.prepare(`SELECT COUNT(*) as cnt FROM consultations WHERE status = 'NEW'`).get() as {
      cnt: number;
    }
  ).cnt;

  const revenueByMethod = db
    .prepare(
      `SELECT payment_method as method, COUNT(*) as count, COALESCE(SUM(total_idr), 0) as total
       FROM orders WHERE status = 'PAID' GROUP BY payment_method`
    )
    .all();

  const revenueByType = db
    .prepare(
      `SELECT oi.item_type as type, COUNT(*) as count, COALESCE(SUM(oi.unit_price_idr * oi.quantity), 0) as total
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.status = 'PAID'
       GROUP BY oi.item_type`
    )
    .all();

  res.json({
    totalRevenueIdr: paidStats.totalRevenueIdr,
    totalPaidOrders: paidStats.totalPaidOrders,
    pendingVerificationCount,
    awaitingReviewCount,
    totalUsers,
    totalCatalogItems,
    newConsultationsCount,
    revenueByMethod,
    revenueByType,
  });
});

adminRouter.get('/orders', (req, res) => {
  const { status, method } = req.query;
  const clauses: string[] = [];
  const params: string[] = [];

  if (status && String(status) !== 'ALL') {
    clauses.push('status = ?');
    params.push(String(status));
  }
  if (method && String(method) !== 'ALL') {
    clauses.push('payment_method = ?');
    params.push(String(method));
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = db
    .prepare(`SELECT * FROM orders ${where} ORDER BY created_at DESC`)
    .all(...params) as Record<string, unknown>[];

  res.json({ orders: rows.map(mapOrderWithItems) });
});

adminRouter.post('/orders/:id/verify', (req, res) => {
  const orderId = String(req.params.id);
  const { action, adminNote } = req.body || {};

  const orderRow = db
    .prepare('SELECT * FROM orders WHERE id = ?')
    .get(orderId) as Record<string, unknown> | undefined;

  if (!orderRow) {
    return res.status(404).json({ error: 'Order tidak ditemukan.' });
  }

  if (action === 'APPROVE') {
    fulfillPaidOrder(
      orderId,
      adminNote || 'Pembayaran telah diverifikasi dan disetujui oleh Admin Boyang Digital.'
    );
  } else if (action === 'REJECT') {
    db.prepare(
      `UPDATE orders SET status = 'REJECTED', admin_note = ? WHERE id = ?`
    ).run(
      adminNote || 'Bukti pembayaran tidak sesuai. Silakan hubungi tim Boyang Digital.',
      orderId
    );
  } else {
    return res.status(400).json({ error: 'Aksi harus APPROVE atau REJECT.' });
  }

  const updated = db
    .prepare('SELECT * FROM orders WHERE id = ?')
    .get(orderId) as Record<string, unknown>;
  res.json({ order: mapOrderWithItems(updated) });
});

adminRouter.patch('/order-items/:itemId/service', (req, res) => {
  const itemId = String(req.params.itemId);
  const { serviceStatus, serviceDeliverableUrl, updateMessage } = req.body || {};

  const itemRow = db
    .prepare('SELECT * FROM order_items WHERE id = ?')
    .get(itemId) as Record<string, unknown> | undefined;

  if (!itemRow) {
    return res.status(404).json({ error: 'Item layanan tidak ditemukan.' });
  }

  const updates = JSON.parse(
    String(itemRow.service_updates_json || '[]')
  ) as ServiceUpdate[];

  const nextStatus = (serviceStatus || itemRow.service_status) as ServiceOrderStatus;

  if (updateMessage && String(updateMessage).trim()) {
    updates.push({
      id: 'upd-' + crypto.randomBytes(4).toString('hex'),
      status: nextStatus,
      message: String(updateMessage).trim(),
      createdAt: new Date().toISOString(),
      author: req.user!.name,
    });
  }

  db.prepare(
    `UPDATE order_items
     SET service_status = ?,
         service_deliverable_url = ?,
         service_updates_json = ?
     WHERE id = ?`
  ).run(
    nextStatus,
    serviceDeliverableUrl !== undefined
      ? serviceDeliverableUrl || null
      : itemRow.service_deliverable_url,
    JSON.stringify(updates),
    itemId
  );

  res.json({ ok: true });
});

adminRouter.post('/catalog', (req, res) => {
  const {
    type,
    title,
    subtitle,
    description,
    category,
    priceIdr,
    originalPriceIdr,
    badge,
    thumbnailGradient,
    iconName,
    features,
    metadata,
    isFeatured,
  } = req.body || {};

  if (!type || !title || !priceIdr) {
    return res.status(400).json({ error: 'Tipe, judul, dan harga wajib diisi.' });
  }

  const id = `${String(type).toLowerCase().slice(0, 3)}-${crypto
    .randomBytes(4)
    .toString('hex')}`;
  const slugBase = String(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const slug = `${slugBase}-${crypto.randomBytes(2).toString('hex')}`;
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO catalog_items (
      id, slug, type, title, subtitle, description, category,
      price_idr, original_price_idr, badge, thumbnail_gradient, icon_name,
      features_json, metadata_json, is_featured, is_active, rating, sales_count,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 5.0, 0, ?, ?)`
  ).run(
    id,
    slug,
    String(type),
    String(title).trim(),
    String(subtitle || '').trim(),
    String(description || subtitle || '').trim(),
    String(category || 'Umum').trim(),
    Math.max(0, Number(priceIdr)),
    originalPriceIdr ? Number(originalPriceIdr) : null,
    badge ? String(badge) : null,
    thumbnailGradient || 'from-cyan-500/20 via-indigo-500/20 to-slate-900',
    iconName || 'Sparkles',
    JSON.stringify(Array.isArray(features) ? features : []),
    JSON.stringify(metadata || {}),
    isFeatured ? 1 : 0,
    now,
    now
  );

  const created = db
    .prepare('SELECT * FROM catalog_items WHERE id = ?')
    .get(id) as Record<string, unknown>;
  res.status(201).json({ item: mapCatalogItem(created) });
});

adminRouter.patch('/catalog/:id', (req, res) => {
  const id = String(req.params.id);
  const existing = db
    .prepare('SELECT * FROM catalog_items WHERE id = ?')
    .get(id) as Record<string, unknown> | undefined;

  if (!existing) {
    return res.status(404).json({ error: 'Item tidak ditemukan.' });
  }

  const prev = mapCatalogItem(existing);
  const body = req.body || {};
  db.prepare(
    `UPDATE catalog_items
     SET title = ?,
         subtitle = ?,
         description = ?,
         category = ?,
         price_idr = ?,
         original_price_idr = ?,
         badge = ?,
         features_json = ?,
         metadata_json = ?,
         is_featured = ?,
         is_active = ?,
         updated_at = ?
     WHERE id = ?`
  ).run(
    body.title !== undefined ? String(body.title) : prev.title,
    body.subtitle !== undefined ? String(body.subtitle) : prev.subtitle,
    body.description !== undefined ? String(body.description) : prev.description,
    body.category !== undefined ? String(body.category) : prev.category,
    body.priceIdr !== undefined ? Number(body.priceIdr) : prev.priceIdr,
    body.originalPriceIdr !== undefined
      ? body.originalPriceIdr
        ? Number(body.originalPriceIdr)
        : null
      : prev.originalPriceIdr,
    body.badge !== undefined ? (body.badge ? String(body.badge) : null) : prev.badge,
    body.features !== undefined ? JSON.stringify(body.features) : JSON.stringify(prev.features),
    body.metadata !== undefined ? JSON.stringify(body.metadata) : JSON.stringify(prev.metadata),
    body.isFeatured !== undefined ? (body.isFeatured ? 1 : 0) : (prev.isFeatured ? 1 : 0),
    body.isActive !== undefined ? (body.isActive ? 1 : 0) : (prev.isActive ? 1 : 0),
    new Date().toISOString(),
    id
  );

  const updated = db
    .prepare('SELECT * FROM catalog_items WHERE id = ?')
    .get(id) as Record<string, unknown>;
  res.json({ item: mapCatalogItem(updated) });
});

adminRouter.delete('/catalog/:id', (req, res) => {
  db.prepare('DELETE FROM catalog_items WHERE id = ?').run(String(req.params.id));
  res.json({ ok: true });
});

adminRouter.get('/settings', (_req, res) => {
  res.json({ settings: getPaymentSettings() });
});

adminRouter.put('/settings', (req, res) => {
  const { qris, banks, ewallets, web3, sandboxMode } = req.body || {};
  if (qris) savePaymentSetting('qris', qris);
  if (banks) savePaymentSetting('banks', banks);
  if (ewallets) savePaymentSetting('ewallets', ewallets);
  if (web3) savePaymentSetting('web3', web3);
  if (sandboxMode !== undefined) savePaymentSetting('sandboxMode', Boolean(sandboxMode));
  res.json({ settings: getPaymentSettings() });
});

adminRouter.post('/settings/qris-image', qrisUpload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'File gambar QRIS belum dipilih.' });
  }
  const url = `/uploads/${req.file.filename}`;
  const current = getPaymentSettings();
  savePaymentSetting('qris', { ...current.qris, customImageUrl: url });
  res.json({ url, settings: getPaymentSettings() });
});

adminRouter.get('/promos', (_req, res) => {
  const rows = db
    .prepare('SELECT * FROM promo_codes ORDER BY created_at DESC')
    .all() as Record<string, unknown>[];
  res.json({ promos: rows.map(mapPromoCode) });
});

adminRouter.post('/promos', (req, res) => {
  const { code, discountPercent, maxDiscountIdr } = req.body || {};
  if (!code || !discountPercent) {
    return res.status(400).json({ error: 'Kode promo dan persentase diskon wajib diisi.' });
  }
  const id = 'promo-' + crypto.randomBytes(4).toString('hex');
  db.prepare(
    `INSERT INTO promo_codes (id, code, discount_percent, max_discount_idr, is_active, usage_count, created_at)
     VALUES (?, ?, ?, ?, 1, 0, ?)`
  ).run(
    id,
    String(code).trim().toUpperCase(),
    Math.min(95, Math.max(1, Number(discountPercent))),
    maxDiscountIdr ? Number(maxDiscountIdr) : null,
    new Date().toISOString()
  );
  const created = db
    .prepare('SELECT * FROM promo_codes WHERE id = ?')
    .get(id) as Record<string, unknown>;
  res.status(201).json({ promo: mapPromoCode(created) });
});

adminRouter.patch('/promos/:id', (req, res) => {
  const id = String(req.params.id);
  const { isActive } = req.body || {};
  db.prepare('UPDATE promo_codes SET is_active = ? WHERE id = ?').run(
    isActive ? 1 : 0,
    id
  );
  res.json({ ok: true });
});

adminRouter.get('/users', (_req, res) => {
  const rows = db
    .prepare('SELECT * FROM users ORDER BY created_at DESC')
    .all() as Record<string, unknown>[];
  res.json({ users: rows.map(mapUser) });
});

adminRouter.patch('/users/:id/role', (req, res) => {
  const targetId = String(req.params.id);
  const { role } = req.body || {};
  if (!['USER', 'ADMIN'].includes(role)) {
    return res.status(400).json({ error: 'Role tidak valid.' });
  }
  if (targetId === req.user!.id && role !== 'ADMIN') {
    return res.status(400).json({ error: 'Tidak dapat menurunkan role akun Anda sendiri.' });
  }
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, targetId);
  const updated = db
    .prepare('SELECT * FROM users WHERE id = ?')
    .get(targetId) as Record<string, unknown>;
  res.json({ user: mapUser(updated) });
});

adminRouter.get('/consultations', (_req, res) => {
  const rows = db
    .prepare('SELECT * FROM consultations ORDER BY created_at DESC')
    .all() as Record<string, unknown>[];
  res.json({ consultations: rows.map(mapConsultation) });
});

adminRouter.patch('/consultations/:id', (req, res) => {
  const { status } = req.body || {};
  if (!['NEW', 'CONTACTED', 'CLOSED'].includes(status)) {
    return res.status(400).json({ error: 'Status tidak valid.' });
  }
  db.prepare('UPDATE consultations SET status = ? WHERE id = ?').run(
    status,
    String(req.params.id)
  );
  res.json({ ok: true });
});
