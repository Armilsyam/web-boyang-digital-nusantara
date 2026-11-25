import { Router } from 'express';
import {
  db,
  mapCatalogItem,
  mapEnrollment,
  mapOrderItem,
  mapOrderWithItems,
} from '../db.ts';
import { requireAuth } from '../middleware/auth.ts';

export const userRouter = Router();

userRouter.use(requireAuth);

userRouter.get('/dashboard', (req, res) => {
  const userId = req.user!.id;

  const orderRows = db
    .prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC')
    .all(userId) as Record<string, unknown>[];
  const orders = orderRows.map(mapOrderWithItems);

  const enrollmentRows = db
    .prepare('SELECT * FROM course_enrollments WHERE user_id = ? ORDER BY created_at DESC')
    .all(userId) as Record<string, unknown>[];
  const enrollments = enrollmentRows.map(mapEnrollment);

  const productItemsRows = db
    .prepare(
      `SELECT oi.*, o.invoice_number, o.paid_at, c.metadata_json, c.subtitle, c.category
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       LEFT JOIN catalog_items c ON oi.catalog_item_id = c.id
       WHERE o.user_id = ? AND o.status = 'PAID' AND oi.item_type = 'PRODUCT'
       ORDER BY o.paid_at DESC`
    )
    .all(userId) as Record<string, unknown>[];

  const digitalProducts = productItemsRows.map((row) => ({
    ...mapOrderItem(row),
    invoiceNumber: String(row.invoice_number),
    paidAt: row.paid_at ? String(row.paid_at) : null,
    subtitle: row.subtitle ? String(row.subtitle) : '',
    category: row.category ? String(row.category) : 'Digital Asset',
    productMetadata: row.metadata_json ? JSON.parse(String(row.metadata_json)) : {},
  }));

  const serviceItemsRows = db
    .prepare(
      `SELECT oi.*, o.invoice_number, o.paid_at
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.user_id = ? AND o.status = 'PAID' AND oi.item_type = 'SERVICE'
       ORDER BY o.created_at DESC`
    )
    .all(userId) as Record<string, unknown>[];

  const serviceProjects = serviceItemsRows.map((row) => ({
    ...mapOrderItem(row),
    invoiceNumber: String(row.invoice_number),
    paidAt: row.paid_at ? String(row.paid_at) : null,
  }));

  res.json({
    orders,
    enrollments,
    digitalProducts,
    serviceProjects,
  });
});

userRouter.post('/enrollments/:courseId/toggle-lesson', (req, res) => {
  const userId = req.user!.id;
  const courseId = String(req.params.courseId);
  const { lessonId } = req.body || {};

  if (!lessonId) {
    return res.status(400).json({ error: 'lessonId wajib diisi.' });
  }

  const enrollmentRow = db
    .prepare('SELECT * FROM course_enrollments WHERE user_id = ? AND catalog_item_id = ?')
    .get(userId, courseId) as Record<string, unknown> | undefined;

  if (!enrollmentRow) {
    return res.status(404).json({ error: 'Anda belum terdaftar pada kursus ini.' });
  }

  const courseRow = db
    .prepare('SELECT * FROM catalog_items WHERE id = ?')
    .get(courseId) as Record<string, unknown> | undefined;
  if (!courseRow) {
    return res.status(404).json({ error: 'Kursus tidak ditemukan.' });
  }

  const course = mapCatalogItem(courseRow);
  const totalLessons =
    course.metadata.modules?.reduce((acc, m) => acc + m.lessons.length, 0) || 1;

  const completed = new Set<string>(
    JSON.parse(String(enrollmentRow.completed_lessons_json || '[]')) as string[]
  );

  if (completed.has(String(lessonId))) {
    completed.delete(String(lessonId));
  } else {
    completed.add(String(lessonId));
  }

  const completedList = Array.from(completed);
  const progressPercent = Math.min(
    100,
    Math.round((completedList.length / totalLessons) * 100)
  );
  const issuedAt =
    progressPercent >= 100
      ? (enrollmentRow.issued_at as string | null) || new Date().toISOString()
      : null;

  db.prepare(
    `UPDATE course_enrollments
     SET completed_lessons_json = ?, progress_percent = ?, issued_at = ?
     WHERE id = ?`
  ).run(JSON.stringify(completedList), progressPercent, issuedAt, String(enrollmentRow.id));

  const updated = db
    .prepare('SELECT * FROM course_enrollments WHERE id = ?')
    .get(String(enrollmentRow.id)) as Record<string, unknown>;

  res.json({ enrollment: mapEnrollment(updated) });
});

userRouter.get('/downloads/:orderItemId', (req, res) => {
  const userId = req.user!.id;
  const orderItemId = String(req.params.orderItemId);

  const row = db
    .prepare(
      `SELECT oi.*, o.user_id, o.status as order_status, o.invoice_number, o.customer_name,
              c.title, c.slug, c.description, c.features_json, c.metadata_json
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       LEFT JOIN catalog_items c ON oi.catalog_item_id = c.id
       WHERE oi.id = ?`
    )
    .get(orderItemId) as Record<string, unknown> | undefined;

  if (!row) {
    return res.status(404).json({ error: 'Produk tidak ditemukan.' });
  }
  if (String(row.user_id) !== userId && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Akses unduhan ditolak.' });
  }
  if (String(row.order_status) !== 'PAID') {
    return res.status(403).json({ error: 'Pembayaran belum terverifikasi.' });
  }

  const metadata = row.metadata_json ? JSON.parse(String(row.metadata_json)) : {};
  const fileName = metadata.fileName || `${row.slug || 'boyang-digital-product'}.json`;

  const packageManifest = {
    brand: 'BOYANG DIGITAL',
    productTitle: row.title || row.item_title,
    version: metadata.version || 'v1.0.0',
    licenseType: metadata.licenseType || row.tier_name,
    licenseKey: row.license_key,
    licensedTo: row.customer_name,
    invoiceNumber: row.invoice_number,
    downloadedAt: new Date().toISOString(),
    techStack: metadata.techStackProduct || [],
    features: row.features_json ? JSON.parse(String(row.features_json)) : [],
    quickStartInstructions: [
      '1. Simpan License Key Anda di atas untuk aktivasi dan verifikasi di https://boyangdigital.id/verify',
      '2. Extract paket source code / aset ke workspace proyek Anda',
      '3. Salin .env.example menjadi .env dan jalankan npm install && npm run dev',
      '4. Hubungi support Boyang Digital melalui Dashboard User jika membutuhkan bantuan teknis.',
    ],
  };

  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.send(JSON.stringify(packageManifest, null, 2));
});
