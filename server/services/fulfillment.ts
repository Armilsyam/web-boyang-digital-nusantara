import crypto from 'node:crypto';
import { db } from '../db.ts';
import {
  generateCertificateCode,
  generateLicenseKey,
  sha256Hex,
} from '../utils/crypto.ts';
import type { ServiceUpdate } from '../../src/types/index.ts';

export function fulfillPaidOrder(orderId: string, adminNote?: string) {
  const order = db
    .prepare('SELECT * FROM orders WHERE id = ?')
    .get(orderId) as Record<string, unknown> | undefined;

  if (!order) {
    throw new Error('Order tidak ditemukan');
  }

  const now = new Date().toISOString();
  const userId = String(order.user_id);

  db.prepare(
    `UPDATE orders
     SET status = 'PAID',
         paid_at = COALESCE(paid_at, ?),
         admin_note = COALESCE(?, admin_note)
     WHERE id = ?`
  ).run(now, adminNote ?? null, orderId);

  const items = db
    .prepare('SELECT * FROM order_items WHERE order_id = ?')
    .all(orderId) as Record<string, unknown>[];

  for (const item of items) {
    const itemId = String(item.id);
    const catalogItemId = String(item.catalog_item_id);
    const itemType = String(item.item_type);

    // Increment sales count once if order wasn't already PAID
    if (String(order.status) !== 'PAID') {
      db.prepare(
        'UPDATE catalog_items SET sales_count = sales_count + ? WHERE id = ?'
      ).run(Number(item.quantity || 1), catalogItemId);
    }

    if (itemType === 'PRODUCT') {
      if (!item.license_key) {
        const key = generateLicenseKey('BYD');
        db.prepare(
          `UPDATE order_items SET license_key = ?, service_status = 'COMPLETED' WHERE id = ?`
        ).run(key, itemId);
      }
    } else if (itemType === 'COURSE') {
      db.prepare(
        `UPDATE order_items SET service_status = 'COMPLETED' WHERE id = ?`
      ).run(itemId);

      const existing = db
        .prepare(
          'SELECT id FROM course_enrollments WHERE user_id = ? AND catalog_item_id = ?'
        )
        .get(userId, catalogItemId);

      if (!existing) {
        const certCode = generateCertificateCode();
        const certHash = sha256Hex(`${certCode}:${userId}:${catalogItemId}`);
        db.prepare(
          `INSERT INTO course_enrollments (
            id, user_id, catalog_item_id, order_id, completed_lessons_json,
            progress_percent, certificate_code, certificate_hash, issued_at, created_at
          ) VALUES (?, ?, ?, ?, '[]', 0, ?, ?, NULL, ?)`
        ).run(
          'enr-' + crypto.randomBytes(6).toString('hex'),
          userId,
          catalogItemId,
          orderId,
          certCode,
          certHash,
          now
        );
      }
    } else if (itemType === 'SERVICE') {
      const existingUpdates = JSON.parse(
        String(item.service_updates_json || '[]')
      ) as ServiceUpdate[];

      if (existingUpdates.length === 0) {
        existingUpdates.push({
          id: 'upd-' + crypto.randomBytes(4).toString('hex'),
          status: 'QUEUED',
          message:
            'Pembayaran telah terverifikasi. Project Manager Boyang Digital sedang meninjau brief proyek Anda.',
          createdAt: now,
          author: 'Boyang Digital System',
        });

        db.prepare(
          `UPDATE order_items SET service_status = 'QUEUED', service_updates_json = ? WHERE id = ?`
        ).run(JSON.stringify(existingUpdates), itemId);
      }
    }
  }
}
