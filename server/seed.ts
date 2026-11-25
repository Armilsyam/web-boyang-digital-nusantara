import crypto from 'node:crypto';
import { config } from './config.ts';
import { db, savePaymentSetting } from './db.ts';
import {
  generateCertificateCode,
  generateLicenseKey,
  hashPassword,
  sha256Hex,
} from './utils/crypto.ts';
import {
  buildDefaultPaymentSettings,
  SEED_CATALOG_ITEMS,
} from '../src/data/seedData.ts';

export function seedDatabaseIfEmpty() {
  const userCount = (
    db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number }
  ).cnt;

  if (userCount > 0) return;

  const now = new Date().toISOString();

  // 1. Seed Admin & Demo User
  const adminId = 'usr-admin-boyang';
  const demoUserId = 'usr-demo-client';

  db.prepare(
    `INSERT INTO users (id, name, email, password_hash, role, phone, wallet_address, ens_name, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    adminId,
    'Boyang Founder (Admin)',
    config.adminEmail,
    hashPassword(config.adminPassword),
    'ADMIN',
    '081234567890',
    config.web3TreasuryAddress.toLowerCase(),
    'founder.boyangdigital.eth',
    now
  );

  db.prepare(
    `INSERT INTO users (id, name, email, password_hash, role, phone, wallet_address, ens_name, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    demoUserId,
    'Raka Pratama',
    config.demoUserEmail,
    hashPassword(config.demoUserPassword),
    'USER',
    '085678901234',
    null,
    null,
    now
  );

  // 2. Seed Payment & Web3 Settings
  const defaultSettings = buildDefaultPaymentSettings(
    config.web3TreasuryAddress,
    config.paymentSandboxMode
  );

  savePaymentSetting('qris', defaultSettings.qris);
  savePaymentSetting('banks', defaultSettings.banks);
  savePaymentSetting('ewallets', defaultSettings.ewallets);
  savePaymentSetting('web3', defaultSettings.web3);
  savePaymentSetting('sandboxMode', defaultSettings.sandboxMode);

  // 3. Seed Catalog Items (Services, Courses, Digital Products)
  const insertCatalog = db.prepare(
    `INSERT INTO catalog_items (
      id, slug, type, title, subtitle, description, category,
      price_idr, original_price_idr, badge, thumbnail_gradient, icon_name,
      features_json, metadata_json, is_featured, is_active, rating, sales_count,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`
  );

  for (const it of SEED_CATALOG_ITEMS) {
    insertCatalog.run(
      it.id,
      it.slug,
      it.type,
      it.title,
      it.subtitle,
      it.description,
      it.category,
      it.priceIdr,
      it.originalPriceIdr,
      it.badge,
      it.gradient,
      it.icon,
      JSON.stringify(it.features),
      JSON.stringify(it.metadata),
      it.featured,
      it.rating,
      it.sales,
      now,
      now
    );
  }

  // 4. Seed Promo Codes
  db.prepare(
    `INSERT INTO promo_codes (id, code, discount_percent, max_discount_idr, is_active, usage_count, created_at)
     VALUES (?, ?, ?, ?, 1, 14, ?)`
  ).run('promo-1', 'BOYANG10', 10, 500000, now);

  db.prepare(
    `INSERT INTO promo_codes (id, code, discount_percent, max_discount_idr, is_active, usage_count, created_at)
     VALUES (?, ?, ?, ?, 1, 8, ?)`
  ).run('promo-2', 'WEB3LAUNCH', 15, 750000, now);

  // 5. Seed Sample Orders
  const paidOrderId = 'ord-sample-paid-01';
  db.prepare(
    `INSERT INTO orders (
      id, invoice_number, user_id, customer_name, customer_email, customer_phone,
      payment_method, payment_channel, subtotal_idr, discount_idr, unique_code, total_idr,
      promo_code, status, qris_payload, payment_sender_name, payment_reference,
      admin_note, expires_at, paid_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PAID', NULL, ?, ?, ?, ?, ?, ?)`
  ).run(
    paidOrderId,
    'INV-BD-20261120-7741',
    demoUserId,
    'Raka Pratama',
    config.demoUserEmail,
    '085678901234',
    'QRIS',
    'QRIS_DINAMIS',
    4449000,
    444900,
    0,
    4004100,
    'BOYANG10',
    'Raka Pratama (QRIS BCA)',
    'QRIS-REF-8841209',
    'Pembayaran terverifikasi otomatis. Selamat belajar & membangun bersama Boyang Digital!',
    now,
    now,
    now
  );

  db.prepare(
    `INSERT INTO order_items (
      id, order_id, catalog_item_id, item_type, item_title, tier_name,
      unit_price_idr, quantity, brief_json, license_key, service_status,
      service_deliverable_url, service_updates_json
    ) VALUES (?, ?, ?, 'COURSE', ?, NULL, ?, 1, NULL, NULL, 'COMPLETED', NULL, '[]')`
  ).run(
    'oi-sample-crs',
    paidOrderId,
    'crs-fullstack-saas',
    'Masterclass Fullstack Web, SaaS & Payment Gateway Indonesia',
    499000
  );

  db.prepare(
    `INSERT INTO order_items (
      id, order_id, catalog_item_id, item_type, item_title, tier_name,
      unit_price_idr, quantity, brief_json, license_key, service_status,
      service_deliverable_url, service_updates_json
    ) VALUES (?, ?, ?, 'PRODUCT', ?, 'Commercial Multi-Project License', ?, 1, NULL, ?, 'COMPLETED', NULL, '[]')`
  ).run(
    'oi-sample-prd',
    paidOrderId,
    'prd-saas-kit',
    'Boyang SaaS & Marketplace Boilerplate Pro (Source Code)',
    450000,
    generateLicenseKey('BYD')
  );

  db.prepare(
    `INSERT INTO order_items (
      id, order_id, catalog_item_id, item_type, item_title, tier_name,
      unit_price_idr, quantity, brief_json, license_key, service_status,
      service_deliverable_url, service_updates_json
    ) VALUES (?, ?, ?, 'SERVICE', ?, 'Starter Landing / Compro', ?, 1, ?, NULL, 'IN_PROGRESS', ?, ?)`
  ).run(
    'oi-sample-srv',
    paidOrderId,
    'srv-web-saas',
    'Fullstack Website, Company Profile & SaaS Platform',
    3500000,
    JSON.stringify({
      projectName: 'Portal Nusantara FinTech',
      companyOrBrand: 'PT Nusantara Digital',
      targetDeadline: '2026-12-10',
      referenceUrl: 'https://stripe.com',
      notes: 'Butuh landing page modern bertema dark cyan dengan integrasi form konsultasi.',
    }),
    'https://staging-preview.boyangdigital.id/nusantara-fintech',
    JSON.stringify([
      {
        id: 'upd-1',
        status: 'QUEUED',
        message: 'Brief proyek diterima oleh Lead Architect Boyang Digital.',
        createdAt: now,
        author: 'Admin Boyang',
      },
      {
        id: 'upd-2',
        status: 'IN_PROGRESS',
        message: 'Wireframe dan UI design selesai. Saat ini masuk tahap pengembangan frontend & integrasi API.',
        createdAt: now,
        author: 'Boyang Engineering Team',
      },
    ])
  );

  const certCode = generateCertificateCode();
  db.prepare(
    `INSERT INTO course_enrollments (
      id, user_id, catalog_item_id, order_id, completed_lessons_json,
      progress_percent, certificate_code, certificate_hash, issued_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`
  ).run(
    'enr-sample-01',
    demoUserId,
    'crs-fullstack-saas',
    paidOrderId,
    JSON.stringify(['les-fs-1-1']),
    20,
    certCode,
    sha256Hex(`${certCode}:${demoUserId}:crs-fullstack-saas`),
    now
  );

  const pendingOrderId = 'ord-sample-awaiting-02';
  db.prepare(
    `INSERT INTO orders (
      id, invoice_number, user_id, customer_name, customer_email, customer_phone,
      payment_method, payment_channel, subtotal_idr, discount_idr, unique_code, total_idr,
      promo_code, status, qris_payload, payment_sender_name, payment_reference,
      expires_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'BANK_TRANSFER', 'BCA', 550000, 0, 217, 550217, NULL, 'AWAITING_VERIFICATION', NULL, ?, ?, ?, ?)`
  ).run(
    pendingOrderId,
    'INV-BD-20261124-9023',
    demoUserId,
    'Raka Pratama',
    config.demoUserEmail,
    '085678901234',
    'Raka Pratama (BCA Mobile)',
    'TRF-BCA-20261124-882',
    new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    now
  );

  db.prepare(
    `INSERT INTO order_items (
      id, order_id, catalog_item_id, item_type, item_title, tier_name,
      unit_price_idr, quantity
    ) VALUES (?, ?, ?, 'PRODUCT', ?, 'Developer Commercial License', 550000, 1)`
  ).run(
    'oi-sample-awaiting',
    pendingOrderId,
    'prd-web3-kit',
    'Web3 dApp, SIWE Auth & Multi-Chain Checkout Starter Kit'
  );

  db.prepare(
    `INSERT INTO consultations (id, name, email, whatsapp, service_interest, budget_range, message, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'NEW', ?)`
  ).run(
    'con-' + crypto.randomBytes(4).toString('hex'),
    'Andi Wijaya',
    'andi@kreasilokal.id',
    '081399887766',
    'Web3 & Blockchain',
    'Rp 10 Juta - Rp 25 Juta',
    'Ingin membuat platform membership eksklusif berbasis NFT & pembayaran QRIS untuk komunitas kreator.',
    now
  );
}
