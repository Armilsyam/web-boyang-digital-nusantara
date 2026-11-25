import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config } from './config.ts';
import type {
  CatalogItem,
  CatalogItemType,
  CatalogMetadata,
  Consultation,
  CourseEnrollment,
  Order,
  OrderItem,
  PaymentSettings,
  PromoCode,
  ServiceBrief,
  ServiceUpdate,
  User,
} from '../src/types/index.ts';

fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });
fs.mkdirSync(config.uploadsDir, { recursive: true });

export const db = new DatabaseSync(config.databasePath);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'USER',
    phone TEXT,
    wallet_address TEXT UNIQUE,
    ens_name TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS web3_nonces (
    nonce TEXT PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS catalog_items (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    price_idr INTEGER NOT NULL,
    original_price_idr INTEGER,
    badge TEXT,
    thumbnail_gradient TEXT NOT NULL,
    icon_name TEXT NOT NULL,
    features_json TEXT NOT NULL,
    metadata_json TEXT NOT NULL,
    is_featured INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    rating REAL NOT NULL DEFAULT 4.9,
    sales_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS promo_codes (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    discount_percent INTEGER NOT NULL,
    max_discount_idr INTEGER,
    is_active INTEGER NOT NULL DEFAULT 1,
    usage_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    invoice_number TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    payment_channel TEXT NOT NULL,
    subtotal_idr INTEGER NOT NULL,
    discount_idr INTEGER NOT NULL DEFAULT 0,
    unique_code INTEGER NOT NULL DEFAULT 0,
    total_idr INTEGER NOT NULL,
    promo_code TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
    qris_payload TEXT,
    payment_proof_url TEXT,
    payment_sender_name TEXT,
    payment_reference TEXT,
    web3_tx_hash TEXT,
    web3_chain TEXT,
    web3_from_address TEXT,
    admin_note TEXT,
    expires_at TEXT NOT NULL,
    paid_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    catalog_item_id TEXT NOT NULL,
    item_type TEXT NOT NULL,
    item_title TEXT NOT NULL,
    tier_name TEXT,
    unit_price_idr INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    brief_json TEXT,
    license_key TEXT,
    service_status TEXT NOT NULL DEFAULT 'QUEUED',
    service_deliverable_url TEXT,
    service_updates_json TEXT NOT NULL DEFAULT '[]',
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS course_enrollments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    catalog_item_id TEXT NOT NULL,
    order_id TEXT NOT NULL,
    completed_lessons_json TEXT NOT NULL DEFAULT '[]',
    progress_percent INTEGER NOT NULL DEFAULT 0,
    certificate_code TEXT UNIQUE,
    certificate_hash TEXT,
    issued_at TEXT,
    created_at TEXT NOT NULL,
    UNIQUE(user_id, catalog_item_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (catalog_item_id) REFERENCES catalog_items(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS payment_settings (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS consultations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    service_interest TEXT NOT NULL,
    budget_range TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'NEW',
    created_at TEXT NOT NULL
  );
`);

export function mapUser(row: Record<string, unknown>): User {
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    role: String(row.role) as User['role'],
    phone: row.phone ? String(row.phone) : null,
    walletAddress: row.wallet_address ? String(row.wallet_address) : null,
    ensName: row.ens_name ? String(row.ens_name) : null,
    createdAt: String(row.created_at),
  };
}

export function mapCatalogItem(row: Record<string, unknown>): CatalogItem {
  return {
    id: String(row.id),
    slug: String(row.slug),
    type: String(row.type) as CatalogItemType,
    title: String(row.title),
    subtitle: String(row.subtitle),
    description: String(row.description),
    category: String(row.category),
    priceIdr: Number(row.price_idr),
    originalPriceIdr: row.original_price_idr !== null ? Number(row.original_price_idr) : null,
    badge: row.badge ? String(row.badge) : null,
    thumbnailGradient: String(row.thumbnail_gradient),
    iconName: String(row.icon_name),
    features: JSON.parse(String(row.features_json || '[]')) as string[],
    metadata: JSON.parse(String(row.metadata_json || '{}')) as CatalogMetadata,
    isFeatured: Boolean(row.is_featured),
    isActive: Boolean(row.is_active),
    rating: Number(row.rating),
    salesCount: Number(row.sales_count),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function mapOrderItem(row: Record<string, unknown>): OrderItem {
  return {
    id: String(row.id),
    orderId: String(row.order_id),
    catalogItemId: String(row.catalog_item_id),
    itemType: String(row.item_type) as CatalogItemType,
    itemTitle: String(row.item_title),
    tierName: row.tier_name ? String(row.tier_name) : null,
    unitPriceIdr: Number(row.unit_price_idr),
    quantity: Number(row.quantity),
    brief: row.brief_json ? (JSON.parse(String(row.brief_json)) as ServiceBrief) : null,
    licenseKey: row.license_key ? String(row.license_key) : null,
    serviceStatus: String(row.service_status || 'QUEUED') as OrderItem['serviceStatus'],
    serviceDeliverableUrl: row.service_deliverable_url
      ? String(row.service_deliverable_url)
      : null,
    serviceUpdates: JSON.parse(
      String(row.service_updates_json || '[]')
    ) as ServiceUpdate[],
  };
}

export function mapOrderWithItems(orderRow: Record<string, unknown>): Order {
  const itemRows = db
    .prepare('SELECT * FROM order_items WHERE order_id = ?')
    .all(String(orderRow.id)) as Record<string, unknown>[];

  return {
    id: String(orderRow.id),
    invoiceNumber: String(orderRow.invoice_number),
    userId: String(orderRow.user_id),
    customerName: String(orderRow.customer_name),
    customerEmail: String(orderRow.customer_email),
    customerPhone: String(orderRow.customer_phone),
    paymentMethod: String(orderRow.payment_method) as Order['paymentMethod'],
    paymentChannel: String(orderRow.payment_channel),
    subtotalIdr: Number(orderRow.subtotal_idr),
    discountIdr: Number(orderRow.discount_idr),
    uniqueCode: Number(orderRow.unique_code),
    totalIdr: Number(orderRow.total_idr),
    promoCode: orderRow.promo_code ? String(orderRow.promo_code) : null,
    status: String(orderRow.status) as Order['status'],
    qrisPayload: orderRow.qris_payload ? String(orderRow.qris_payload) : null,
    paymentProofUrl: orderRow.payment_proof_url
      ? String(orderRow.payment_proof_url)
      : null,
    paymentSenderName: orderRow.payment_sender_name
      ? String(orderRow.payment_sender_name)
      : null,
    paymentReference: orderRow.payment_reference
      ? String(orderRow.payment_reference)
      : null,
    web3TxHash: orderRow.web3_tx_hash ? String(orderRow.web3_tx_hash) : null,
    web3Chain: orderRow.web3_chain ? String(orderRow.web3_chain) : null,
    web3FromAddress: orderRow.web3_from_address
      ? String(orderRow.web3_from_address)
      : null,
    adminNote: orderRow.admin_note ? String(orderRow.admin_note) : null,
    expiresAt: String(orderRow.expires_at),
    paidAt: orderRow.paid_at ? String(orderRow.paid_at) : null,
    createdAt: String(orderRow.created_at),
    items: itemRows.map(mapOrderItem),
  };
}

export function mapEnrollment(row: Record<string, unknown>): CourseEnrollment {
  const courseRow = db
    .prepare('SELECT * FROM catalog_items WHERE id = ?')
    .get(String(row.catalog_item_id)) as Record<string, unknown> | undefined;

  return {
    id: String(row.id),
    userId: String(row.user_id),
    catalogItemId: String(row.catalog_item_id),
    orderId: String(row.order_id),
    completedLessons: JSON.parse(String(row.completed_lessons_json || '[]')) as string[],
    progressPercent: Number(row.progress_percent),
    certificateCode: row.certificate_code ? String(row.certificate_code) : null,
    certificateHash: row.certificate_hash ? String(row.certificate_hash) : null,
    issuedAt: row.issued_at ? String(row.issued_at) : null,
    createdAt: String(row.created_at),
    course: courseRow ? mapCatalogItem(courseRow) : undefined,
  };
}

export function mapPromoCode(row: Record<string, unknown>): PromoCode {
  return {
    id: String(row.id),
    code: String(row.code),
    discountPercent: Number(row.discount_percent),
    maxDiscountIdr: row.max_discount_idr !== null ? Number(row.max_discount_idr) : null,
    isActive: Boolean(row.is_active),
    usageCount: Number(row.usage_count),
    createdAt: String(row.created_at),
  };
}

export function mapConsultation(row: Record<string, unknown>): Consultation {
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    whatsapp: String(row.whatsapp),
    serviceInterest: String(row.service_interest),
    budgetRange: String(row.budget_range),
    message: String(row.message),
    status: String(row.status) as Consultation['status'],
    createdAt: String(row.created_at),
  };
}

export function getPaymentSettings(): PaymentSettings {
  const rows = db
    .prepare('SELECT key, value_json FROM payment_settings')
    .all() as { key: string; value_json: string }[];

  const map = new Map<string, unknown>();
  for (const row of rows) {
    map.set(row.key, JSON.parse(row.value_json));
  }

  return {
    qris: (map.get('qris') as PaymentSettings['qris']) || {
      merchantName: 'BOYANG DIGITAL',
      merchantCity: 'JAKARTA',
      nmid: 'ID1026000889911',
      staticPayload: '',
      customImageUrl: '',
      isActive: true,
    },
    banks: (map.get('banks') as PaymentSettings['banks']) || [],
    ewallets: (map.get('ewallets') as PaymentSettings['ewallets']) || [],
    web3: (map.get('web3') as PaymentSettings['web3']) || {
      treasuryAddress: config.web3TreasuryAddress,
      ensDomain: 'boyangdigital.eth',
      enableWalletLogin: true,
      enableCryptoPayment: true,
      enableWeb3Certificates: true,
      chains: [],
    },
    sandboxMode:
      map.has('sandboxMode') ? Boolean(map.get('sandboxMode')) : config.paymentSandboxMode,
  };
}

export function savePaymentSetting(key: string, value: unknown) {
  db.prepare(
    `INSERT INTO payment_settings (key, value_json, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`
  ).run(key, JSON.stringify(value), new Date().toISOString());
}
