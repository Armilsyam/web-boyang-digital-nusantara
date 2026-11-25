import crypto from 'node:crypto';
import { Router } from 'express';
import {
  db,
  getPaymentSettings,
  mapCatalogItem,
  mapPromoCode,
} from '../db.ts';

export const catalogRouter = Router();

catalogRouter.get('/catalog', (req, res) => {
  const { type, category, search, featured, includeInactive } = req.query;
  const clauses: string[] = [];
  const params: (string | number)[] = [];

  if (!(includeInactive === 'true' && req.user?.role === 'ADMIN')) {
    clauses.push('is_active = 1');
  }
  if (type && ['SERVICE', 'COURSE', 'PRODUCT'].includes(String(type))) {
    clauses.push('type = ?');
    params.push(String(type));
  }
  if (category && String(category) !== 'ALL') {
    clauses.push('category = ?');
    params.push(String(category));
  }
  if (featured === 'true') {
    clauses.push('is_featured = 1');
  }
  if (search && String(search).trim()) {
    const q = `%${String(search).trim().toLowerCase()}%`;
    clauses.push('(LOWER(title) LIKE ? OR LOWER(subtitle) LIKE ? OR LOWER(category) LIKE ?)');
    params.push(q, q, q);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = db
    .prepare(`SELECT * FROM catalog_items ${where} ORDER BY is_featured DESC, sales_count DESC, created_at DESC`)
    .all(...params) as Record<string, unknown>[];

  res.json({ items: rows.map(mapCatalogItem) });
});

catalogRouter.get('/catalog/:idOrSlug', (req, res) => {
  const param = String(req.params.idOrSlug);
  const row = db
    .prepare('SELECT * FROM catalog_items WHERE id = ? OR slug = ?')
    .get(param, param) as Record<string, unknown> | undefined;

  if (!row) {
    return res.status(404).json({ error: 'Item katalog tidak ditemukan.' });
  }
  res.json({ item: mapCatalogItem(row) });
});

catalogRouter.get('/payment-config', (_req, res) => {
  const settings = getPaymentSettings();
  res.json({
    qris: settings.qris,
    banks: settings.banks.filter((b) => b.isActive),
    ewallets: settings.ewallets.filter((e) => e.isActive),
    web3: {
      ...settings.web3,
      chains: settings.web3.chains.filter((c) => c.isActive),
    },
    sandboxMode: settings.sandboxMode,
  });
});

catalogRouter.post('/promo/validate', (req, res) => {
  const { code, subtotalIdr } = req.body || {};
  if (!code) {
    return res.status(400).json({ error: 'Masukkan kode promo.' });
  }
  const cleanCode = String(code).trim().toUpperCase();
  const row = db
    .prepare('SELECT * FROM promo_codes WHERE code = ? AND is_active = 1')
    .get(cleanCode) as Record<string, unknown> | undefined;

  if (!row) {
    return res.status(404).json({ error: 'Kode promo tidak ditemukan atau sudah tidak aktif.' });
  }

  const promo = mapPromoCode(row);
  const subtotal = Math.max(0, Number(subtotalIdr || 0));
  let discountIdr = Math.round((subtotal * promo.discountPercent) / 100);
  if (promo.maxDiscountIdr && discountIdr > promo.maxDiscountIdr) {
    discountIdr = promo.maxDiscountIdr;
  }

  res.json({ promo, discountIdr });
});

catalogRouter.post('/consultations', (req, res) => {
  const { name, email, whatsapp, serviceInterest, budgetRange, message } = req.body || {};
  if (!name || !email || !whatsapp || !message) {
    return res.status(400).json({ error: 'Mohon lengkapi nama, email, WhatsApp, dan detail kebutuhan.' });
  }

  const id = 'con-' + crypto.randomBytes(5).toString('hex');
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO consultations (id, name, email, whatsapp, service_interest, budget_range, message, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'NEW', ?)`
  ).run(
    id,
    String(name).trim(),
    String(email).trim(),
    String(whatsapp).trim(),
    String(serviceInterest || 'Konsultasi Umum'),
    String(budgetRange || 'Diskusi Fleksibel'),
    String(message).trim(),
    now
  );

  res.status(201).json({
    ok: true,
    id,
    message: 'Permintaan konsultasi berhasil dikirim. Tim Boyang Digital akan menghubungi Anda via WhatsApp/Email.',
  });
});

catalogRouter.get('/verify/:code', (req, res) => {
  const code = String(req.params.code).trim().toUpperCase();

  // Check Course Certificate
  const certRow = db
    .prepare(
      `SELECT ce.*, u.name as owner_name, u.wallet_address as owner_wallet, c.title as course_title, c.category as course_category
       FROM course_enrollments ce
       JOIN users u ON ce.user_id = u.id
       JOIN catalog_items c ON ce.catalog_item_id = c.id
       WHERE UPPER(ce.certificate_code) = ?`
    )
    .get(code) as Record<string, unknown> | undefined;

  if (certRow) {
    return res.json({
      found: true,
      kind: 'COURSE_CERTIFICATE',
      code: certRow.certificate_code,
      status: certRow.issued_at ? 'VERIFIED_ISSUED' : 'IN_PROGRESS',
      title: certRow.course_title,
      category: certRow.course_category,
      ownerName: certRow.owner_name,
      ownerWallet: certRow.owner_wallet || null,
      progressPercent: Number(certRow.progress_percent),
      issuedAt: certRow.issued_at || null,
      attestationHash: certRow.certificate_hash,
      standard: 'BOYANG-WEB3-ATTESTATION-V1',
    });
  }

  // Check Digital Product License Key
  const licenseRow = db
    .prepare(
      `SELECT oi.*, o.customer_name, o.status as order_status, o.paid_at, u.wallet_address as owner_wallet
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       JOIN users u ON o.user_id = u.id
       WHERE UPPER(oi.license_key) = ?`
    )
    .get(code) as Record<string, unknown> | undefined;

  if (licenseRow) {
    return res.json({
      found: true,
      kind: 'PRODUCT_LICENSE',
      code: licenseRow.license_key,
      status: licenseRow.order_status === 'PAID' ? 'ACTIVE_LICENSE' : 'PENDING',
      title: licenseRow.item_title,
      tierName: licenseRow.tier_name,
      ownerName: licenseRow.customer_name,
      ownerWallet: licenseRow.owner_wallet || null,
      issuedAt: licenseRow.paid_at || null,
      standard: 'BOYANG-COMMERCIAL-LICENSE-V1',
    });
  }

  return res.status(404).json({
    found: false,
    error: 'Kode sertifikat atau lisensi tidak ditemukan dalam registry Boyang Digital.',
  });
});
