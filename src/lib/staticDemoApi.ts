import { getAddress, verifyMessage } from 'viem';
import type {
  CatalogItem,
  CatalogItemType,
  Consultation,
  CourseEnrollment,
  Order,
  PaymentMethod,
  PaymentSettings,
  PromoCode,
  ServiceBrief,
  ServiceOrderStatus,
  User,
} from '../types';
import {
  buildDefaultPaymentSettings,
  SEED_CATALOG_ITEMS,
} from '../data/seedData';
import { buildDynamicQrisPayload } from './qris';
import type {
  AdminOverviewResponse,
  UserDashboardResponse,
  VerificationResult,
} from './api';

const STORAGE_KEY = 'boyang_digital_static_db_v1';
const SESSION_KEY = 'boyang_digital_static_uid';

interface StoredUser extends User {
  password: string;
}

interface StaticStore {
  users: StoredUser[];
  catalog: CatalogItem[];
  orders: Order[];
  enrollments: CourseEnrollment[];
  promos: PromoCode[];
  consultations: Consultation[];
  settings: PaymentSettings;
}

function randHex(bytes = 4): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

async function sha256ClientHex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return (
    '0x' +
    Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
  );
}

function createInitialStore(): StaticStore {
  const now = new Date().toISOString();
  const treasury = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';
  const adminId = 'usr-admin-boyang';
  const demoUserId = 'usr-demo-client';

  const users: StoredUser[] = [
    {
      id: adminId,
      name: 'Boyang Founder (Admin)',
      email: 'admin@boyangdigital.id',
      password: 'AdminBoyang#2026',
      role: 'ADMIN',
      phone: '081234567890',
      walletAddress: treasury.toLowerCase(),
      ensName: 'founder.boyangdigital.eth',
      createdAt: now,
    },
    {
      id: demoUserId,
      name: 'Raka Pratama',
      email: 'user@boyangdigital.id',
      password: 'UserBoyang#2026',
      role: 'USER',
      phone: '085678901234',
      walletAddress: null,
      ensName: null,
      createdAt: now,
    },
  ];

  const catalog: CatalogItem[] = SEED_CATALOG_ITEMS.map((it) => ({
    id: it.id,
    slug: it.slug,
    type: it.type,
    title: it.title,
    subtitle: it.subtitle,
    description: it.description,
    category: it.category,
    priceIdr: it.priceIdr,
    originalPriceIdr: it.originalPriceIdr,
    badge: it.badge,
    thumbnailGradient: it.gradient,
    iconName: it.icon,
    features: it.features,
    metadata: it.metadata,
    isFeatured: Boolean(it.featured),
    isActive: true,
    rating: it.rating,
    salesCount: it.sales,
    createdAt: now,
    updatedAt: now,
  }));

  const paidOrderId = 'ord-sample-paid-01';
  const orders: Order[] = [
    {
      id: paidOrderId,
      invoiceNumber: 'INV-BD-20261120-7741',
      userId: demoUserId,
      customerName: 'Raka Pratama',
      customerEmail: 'user@boyangdigital.id',
      customerPhone: '085678901234',
      paymentMethod: 'QRIS',
      paymentChannel: 'QRIS_DINAMIS',
      subtotalIdr: 4449000,
      discountIdr: 444900,
      uniqueCode: 0,
      totalIdr: 4004100,
      promoCode: 'BOYANG10',
      status: 'PAID',
      qrisPayload: null,
      paymentProofUrl: null,
      paymentSenderName: 'Raka Pratama (QRIS BCA)',
      paymentReference: 'QRIS-REF-8841209',
      web3TxHash: null,
      web3Chain: null,
      web3FromAddress: null,
      adminNote:
        'Pembayaran terverifikasi otomatis. Selamat belajar & membangun bersama Boyang Digital!',
      expiresAt: now,
      paidAt: now,
      createdAt: now,
      items: [
        {
          id: 'oi-sample-crs',
          orderId: paidOrderId,
          catalogItemId: 'crs-fullstack-saas',
          itemType: 'COURSE',
          itemTitle: 'Masterclass Fullstack Web, SaaS & Payment Gateway Indonesia',
          tierName: null,
          unitPriceIdr: 499000,
          quantity: 1,
          brief: null,
          licenseKey: null,
          serviceStatus: 'COMPLETED',
          serviceDeliverableUrl: null,
          serviceUpdates: [],
        },
        {
          id: 'oi-sample-prd',
          orderId: paidOrderId,
          catalogItemId: 'prd-saas-kit',
          itemType: 'PRODUCT',
          itemTitle: 'Boyang SaaS & Marketplace Boilerplate Pro (Source Code)',
          tierName: 'Commercial Multi-Project License',
          unitPriceIdr: 450000,
          quantity: 1,
          brief: null,
          licenseKey: 'BYD-88A1-4F2C-99E0-2026',
          serviceStatus: 'COMPLETED',
          serviceDeliverableUrl: null,
          serviceUpdates: [],
        },
        {
          id: 'oi-sample-srv',
          orderId: paidOrderId,
          catalogItemId: 'srv-web-saas',
          itemType: 'SERVICE',
          itemTitle: 'Fullstack Website, Company Profile & SaaS Platform',
          tierName: 'Starter Landing / Compro',
          unitPriceIdr: 3500000,
          quantity: 1,
          brief: {
            projectName: 'Portal Nusantara FinTech',
            companyOrBrand: 'PT Nusantara Digital',
            targetDeadline: '2026-12-10',
            referenceUrl: 'https://stripe.com',
            notes: 'Butuh landing page modern bertema dark cyan dengan integrasi form konsultasi.',
          },
          licenseKey: null,
          serviceStatus: 'IN_PROGRESS',
          serviceDeliverableUrl: 'https://staging-preview.boyangdigital.id/nusantara-fintech',
          serviceUpdates: [
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
          ],
        },
      ],
    },
    {
      id: 'ord-sample-awaiting-02',
      invoiceNumber: 'INV-BD-20261124-9023',
      userId: demoUserId,
      customerName: 'Raka Pratama',
      customerEmail: 'user@boyangdigital.id',
      customerPhone: '085678901234',
      paymentMethod: 'BANK_TRANSFER',
      paymentChannel: 'BCA',
      subtotalIdr: 550000,
      discountIdr: 0,
      uniqueCode: 217,
      totalIdr: 550217,
      promoCode: null,
      status: 'AWAITING_VERIFICATION',
      qrisPayload: null,
      paymentProofUrl: null,
      paymentSenderName: 'Raka Pratama (BCA Mobile)',
      paymentReference: 'TRF-BCA-20261124-882',
      web3TxHash: null,
      web3Chain: null,
      web3FromAddress: null,
      adminNote: null,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      paidAt: null,
      createdAt: now,
      items: [
        {
          id: 'oi-sample-awaiting',
          orderId: 'ord-sample-awaiting-02',
          catalogItemId: 'prd-web3-kit',
          itemType: 'PRODUCT',
          itemTitle: 'Web3 dApp, SIWE Auth & Multi-Chain Checkout Starter Kit',
          tierName: 'Developer Commercial License',
          unitPriceIdr: 550000,
          quantity: 1,
          brief: null,
          licenseKey: null,
          serviceStatus: 'QUEUED',
          serviceDeliverableUrl: null,
          serviceUpdates: [],
        },
      ],
    },
  ];

  const enrollments: CourseEnrollment[] = [
    {
      id: 'enr-sample-01',
      userId: demoUserId,
      catalogItemId: 'crs-fullstack-saas',
      orderId: paidOrderId,
      completedLessons: ['les-fs-1-1'],
      progressPercent: 20,
      certificateCode: 'CERT-BD-2026-8812A4',
      certificateHash:
        '0x4a7b9f2c8d1e04b3c5f6a12d89e0b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f901',
      issuedAt: null,
      createdAt: now,
    },
  ];

  const promos: PromoCode[] = [
    {
      id: 'promo-1',
      code: 'BOYANG10',
      discountPercent: 10,
      maxDiscountIdr: 500000,
      isActive: true,
      usageCount: 14,
      createdAt: now,
    },
    {
      id: 'promo-2',
      code: 'WEB3LAUNCH',
      discountPercent: 15,
      maxDiscountIdr: 750000,
      isActive: true,
      usageCount: 8,
      createdAt: now,
    },
  ];

  const consultations: Consultation[] = [
    {
      id: 'con-sample-1',
      name: 'Andi Wijaya',
      email: 'andi@kreasilokal.id',
      whatsapp: '081399887766',
      serviceInterest: 'Web3 & Blockchain',
      budgetRange: 'Rp 10 Juta - Rp 25 Juta',
      message:
        'Ingin membuat platform membership eksklusif berbasis NFT & pembayaran QRIS untuk komunitas kreator.',
      status: 'NEW',
      createdAt: now,
    },
  ];

  return {
    users,
    catalog,
    orders,
    enrollments,
    promos,
    consultations,
    settings: buildDefaultPaymentSettings(treasury, true),
  };
}

function loadStore(): StaticStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as StaticStore;
  } catch {
    // reset on parse error
  }
  const init = createInitialStore();
  saveStore(init);
  return init;
}

function saveStore(store: StaticStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function sanitizeUser(u: StoredUser): User {
  const { password: _, ...rest } = u;
  return rest;
}

function getCurrentStoredUser(store: StaticStore): StoredUser | null {
  const uid = localStorage.getItem(SESSION_KEY);
  if (!uid) return null;
  return store.users.find((u) => u.id === uid) || null;
}

function requireUser(store: StaticStore): StoredUser {
  const u = getCurrentStoredUser(store);
  if (!u) throw new Error('Silakan masuk terlebih dahulu.');
  return u;
}

function requireAdminUser(store: StaticStore): StoredUser {
  const u = requireUser(store);
  if (u.role !== 'ADMIN') throw new Error('Akses ditolak. Khusus Administrator.');
  return u;
}

async function fulfillOrderInStore(store: StaticStore, order: Order, adminNote?: string) {
  const now = new Date().toISOString();
  const wasPaid = order.status === 'PAID';
  order.status = 'PAID';
  order.paidAt = order.paidAt || now;
  if (adminNote) order.adminNote = adminNote;

  for (const item of order.items) {
    if (!wasPaid) {
      const cat = store.catalog.find((c) => c.id === item.catalogItemId);
      if (cat) cat.salesCount += item.quantity;
    }

    if (item.itemType === 'PRODUCT') {
      if (!item.licenseKey) {
        item.licenseKey = `BYD-${randHex(2)}-${randHex(2)}-${randHex(2)}-${randHex(2)}`;
      }
      item.serviceStatus = 'COMPLETED';
    } else if (item.itemType === 'COURSE') {
      item.serviceStatus = 'COMPLETED';
      const exists = store.enrollments.find(
        (e) => e.userId === order.userId && e.catalogItemId === item.catalogItemId
      );
      if (!exists) {
        const certCode = `CERT-BD-${new Date().getFullYear()}-${randHex(4)}`;
        const certHash = await sha256ClientHex(
          `${certCode}:${order.userId}:${item.catalogItemId}`
        );
        store.enrollments.push({
          id: `enr-${randHex(4)}`,
          userId: order.userId,
          catalogItemId: item.catalogItemId,
          orderId: order.id,
          completedLessons: [],
          progressPercent: 0,
          certificateCode: certCode,
          certificateHash: certHash,
          issuedAt: null,
          createdAt: now,
        });
      }
    } else if (item.itemType === 'SERVICE') {
      if (item.serviceUpdates.length === 0) {
        item.serviceStatus = 'QUEUED';
        item.serviceUpdates.push({
          id: `upd-${randHex(3)}`,
          status: 'QUEUED',
          message:
            'Pembayaran telah terverifikasi. Project Manager Boyang Digital sedang meninjau brief proyek Anda.',
          createdAt: now,
          author: 'Boyang Digital System',
        });
      }
    }
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsDataURL(file);
  });
}

const pendingNonces = new Map<string, { wallet: string; exp: number }>();

export const staticDemoApi = {
  me: async () => {
    const store = loadStore();
    const u = getCurrentStoredUser(store);
    return { user: u ? sanitizeUser(u) : null };
  },

  login: async (body: { email: string; password: string }) => {
    const store = loadStore();
    const email = body.email.trim().toLowerCase();
    const found = store.users.find(
      (u) => u.email.toLowerCase() === email && u.password === body.password
    );
    if (!found) throw new Error('Email atau password tidak sesuai.');
    localStorage.setItem(SESSION_KEY, found.id);
    return { user: sanitizeUser(found), token: 'static-session' };
  },

  register: async (body: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }) => {
    const store = loadStore();
    const email = body.email.trim().toLowerCase();
    if (body.password.length < 6) {
      throw new Error('Password minimal 6 karakter.');
    }
    if (store.users.some((u) => u.email.toLowerCase() === email)) {
      throw new Error('Email sudah terdaftar. Silakan masuk.');
    }
    const newUser: StoredUser = {
      id: `usr-${randHex(4)}`,
      name: body.name.trim(),
      email,
      password: body.password,
      role: 'USER',
      phone: body.phone?.trim() || null,
      walletAddress: null,
      ensName: null,
      createdAt: new Date().toISOString(),
    };
    store.users.push(newUser);
    saveStore(store);
    localStorage.setItem(SESSION_KEY, newUser.id);
    return { user: sanitizeUser(newUser), token: 'static-session' };
  },

  logout: async () => {
    localStorage.removeItem(SESSION_KEY);
    return { ok: true };
  },

  updateProfile: async (body: {
    name?: string;
    phone?: string;
    newPassword?: string;
  }) => {
    const store = loadStore();
    const u = requireUser(store);
    if (body.name) u.name = body.name.trim();
    if (body.phone !== undefined) u.phone = body.phone ? body.phone.trim() : null;
    if (body.newPassword) {
      if (body.newPassword.length < 6) {
        throw new Error('Password baru minimal 6 karakter.');
      }
      u.password = body.newPassword;
    }
    saveStore(store);
    return { user: sanitizeUser(u) };
  },

  web3Nonce: async (walletAddress: string) => {
    const checksum = getAddress(walletAddress);
    const nonce = randHex(8).toLowerCase();
    pendingNonces.set(nonce, {
      wallet: checksum.toLowerCase(),
      exp: Date.now() + 600000,
    });
    const message = [
      'BOYANG DIGITAL - Web3 Authentication & Wallet Binding',
      `Wallet: ${checksum}`,
      `Nonce: ${nonce}`,
      `Issued At: ${new Date().toISOString()}`,
      'Penandatanganan ini GRATIS (tanpa gas fee) untuk membuktikan kepemilikan wallet.',
    ].join('\n');
    return { nonce, message, walletAddress: checksum };
  },

  web3Verify: async (body: {
    walletAddress: string;
    signature: string;
    nonce: string;
    message: string;
  }) => {
    const store = loadStore();
    const checksum = getAddress(body.walletAddress);
    const lower = checksum.toLowerCase();
    const entry = pendingNonces.get(body.nonce);
    if (!entry || entry.wallet !== lower || entry.exp < Date.now()) {
      throw new Error('Nonce Web3 kadaluarsa atau tidak valid.');
    }
    const valid = await verifyMessage({
      address: checksum as `0x${string}`,
      message: body.message,
      signature: body.signature as `0x${string}`,
    });
    if (!valid) throw new Error('Signature kriptografi wallet tidak valid.');
    pendingNonces.delete(body.nonce);

    const current = getCurrentStoredUser(store);
    if (current) {
      if (
        store.users.some((u) => u.walletAddress === lower && u.id !== current.id)
      ) {
        throw new Error('Wallet ini sudah terhubung dengan akun lain.');
      }
      current.walletAddress = lower;
      saveStore(store);
      return { user: sanitizeUser(current), mode: 'bound' };
    }

    let user = store.users.find((u) => u.walletAddress === lower);
    if (!user) {
      user = {
        id: `usr-w3-${randHex(4)}`,
        name: `Web3 Member (${checksum.slice(0, 6)}...${checksum.slice(-4)})`,
        email: `${lower.slice(2, 10)}@web3.boyangdigital.id`,
        password: randHex(12),
        role: 'USER',
        phone: null,
        walletAddress: lower,
        ensName: null,
        createdAt: new Date().toISOString(),
      };
      store.users.push(user);
      saveStore(store);
    }
    localStorage.setItem(SESSION_KEY, user.id);
    return { user: sanitizeUser(user), mode: 'login' };
  },

  web3Unlink: async () => {
    const store = loadStore();
    const u = requireUser(store);
    u.walletAddress = null;
    u.ensName = null;
    saveStore(store);
    return { user: sanitizeUser(u) };
  },

  getCatalog: async (params?: {
    type?: CatalogItemType | 'ALL';
    category?: string;
    search?: string;
    includeInactive?: boolean;
  }) => {
    const store = loadStore();
    const viewer = getCurrentStoredUser(store);
    const items = store.catalog.filter((it) => {
      if (!(params?.includeInactive && viewer?.role === 'ADMIN') && !it.isActive) {
        return false;
      }
      if (params?.type && params.type !== 'ALL' && it.type !== params.type) {
        return false;
      }
      if (
        params?.category &&
        params.category !== 'ALL' &&
        it.category !== params.category
      ) {
        return false;
      }
      if (params?.search?.trim()) {
        const q = params.search.toLowerCase();
        if (
          !it.title.toLowerCase().includes(q) &&
          !it.subtitle.toLowerCase().includes(q) &&
          !it.category.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
    return { items };
  },

  getPaymentConfig: async () => {
    const store = loadStore();
    return {
      qris: store.settings.qris,
      banks: store.settings.banks.filter((b) => b.isActive),
      ewallets: store.settings.ewallets.filter((w) => w.isActive),
      web3: {
        ...store.settings.web3,
        chains: store.settings.web3.chains.filter((c) => c.isActive),
      },
      sandboxMode: store.settings.sandboxMode,
    };
  },

  validatePromo: async (code: string, subtotalIdr: number) => {
    const store = loadStore();
    const clean = code.trim().toUpperCase();
    const promo = store.promos.find((p) => p.code === clean && p.isActive);
    if (!promo) throw new Error('Kode promo tidak ditemukan atau tidak aktif.');
    let discountIdr = Math.round((subtotalIdr * promo.discountPercent) / 100);
    if (promo.maxDiscountIdr && discountIdr > promo.maxDiscountIdr) {
      discountIdr = promo.maxDiscountIdr;
    }
    return { promo, discountIdr };
  },

  submitConsultation: async (body: {
    name: string;
    email: string;
    whatsapp: string;
    serviceInterest: string;
    budgetRange: string;
    message: string;
  }) => {
    const store = loadStore();
    const id = `con-${randHex(4)}`;
    store.consultations.unshift({
      id,
      ...body,
      status: 'NEW',
      createdAt: new Date().toISOString(),
    });
    saveStore(store);
    return {
      ok: true,
      id,
      message:
        'Permintaan konsultasi berhasil dicatat! Tim Boyang Digital siap menghubungi Anda.',
    };
  },

  verifyPublicCode: async (code: string): Promise<VerificationResult> => {
    const store = loadStore();
    const clean = code.trim().toUpperCase();
    const enr = store.enrollments.find(
      (e) => e.certificateCode?.toUpperCase() === clean
    );
    if (enr) {
      const course = store.catalog.find((c) => c.id === enr.catalogItemId);
      const owner = store.users.find((u) => u.id === enr.userId);
      return {
        found: true,
        kind: 'COURSE_CERTIFICATE',
        code: enr.certificateCode!,
        status: enr.issuedAt ? 'VERIFIED_ISSUED' : 'IN_PROGRESS',
        title: course?.title || 'Kursus Boyang Digital',
        category: course?.category,
        ownerName: owner?.name || 'Member',
        ownerWallet: owner?.walletAddress || null,
        progressPercent: enr.progressPercent,
        issuedAt: enr.issuedAt,
        attestationHash: enr.certificateHash || undefined,
        standard: 'BOYANG-WEB3-ATTESTATION-V1',
      };
    }

    for (const ord of store.orders) {
      const item = ord.items.find((i) => i.licenseKey?.toUpperCase() === clean);
      if (item) {
        const owner = store.users.find((u) => u.id === ord.userId);
        return {
          found: true,
          kind: 'PRODUCT_LICENSE',
          code: item.licenseKey!,
          status: ord.status === 'PAID' ? 'ACTIVE_LICENSE' : 'PENDING',
          title: item.itemTitle,
          tierName: item.tierName || undefined,
          ownerName: ord.customerName,
          ownerWallet: owner?.walletAddress || null,
          issuedAt: ord.paidAt,
          standard: 'BOYANG-COMMERCIAL-LICENSE-V1',
        };
      }
    }

    throw new Error(
      'Kode sertifikat atau lisensi tidak ditemukan dalam registry Boyang Digital.'
    );
  },

  createOrder: async (body: {
    items: Array<{
      catalogItemId: string;
      tierName?: string;
      quantity: number;
      brief?: ServiceBrief;
    }>;
    promoCode?: string;
    paymentMethod: PaymentMethod;
    paymentChannel: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
  }) => {
    const store = loadStore();
    const u = requireUser(store);

    let subtotalIdr = 0;
    const orderId = `ord-${randHex(4)}`;
    const resolvedItems = body.items.map((raw) => {
      const cat = store.catalog.find(
        (c) => c.id === raw.catalogItemId && c.isActive
      );
      if (!cat) throw new Error('Item katalog tidak tersedia.');
      let unitPriceIdr = cat.priceIdr;
      let tierName: string | null = raw.tierName || null;
      if (cat.type === 'SERVICE' && cat.metadata.tiers?.length) {
        const chosen =
          cat.metadata.tiers.find((t) => t.name === raw.tierName) ||
          cat.metadata.tiers[0];
        unitPriceIdr = chosen.priceIdr;
        tierName = chosen.name;
      } else if (cat.type === 'PRODUCT') {
        tierName = cat.metadata.licenseType || 'Standard License';
      }
      const qty = Math.max(1, raw.quantity || 1);
      subtotalIdr += unitPriceIdr * qty;
      return {
        id: `oi-${randHex(4)}`,
        orderId,
        catalogItemId: cat.id,
        itemType: cat.type,
        itemTitle: cat.title,
        tierName,
        unitPriceIdr,
        quantity: qty,
        brief: raw.brief || null,
        licenseKey: null,
        serviceStatus: 'QUEUED' as const,
        serviceDeliverableUrl: null,
        serviceUpdates: [],
      };
    });

    let discountIdr = 0;
    let appliedPromo: string | null = null;
    if (body.promoCode?.trim()) {
      const promo = store.promos.find(
        (p) => p.code === body.promoCode!.trim().toUpperCase() && p.isActive
      );
      if (promo) {
        discountIdr = Math.round((subtotalIdr * promo.discountPercent) / 100);
        if (promo.maxDiscountIdr && discountIdr > promo.maxDiscountIdr) {
          discountIdr = promo.maxDiscountIdr;
        }
        appliedPromo = promo.code;
        promo.usageCount += 1;
      }
    }

    const uniqueCode =
      body.paymentMethod === 'BANK_TRANSFER' || body.paymentMethod === 'EWALLET'
        ? Math.floor(101 + Math.random() * 880)
        : 0;
    const totalIdr = Math.max(1000, subtotalIdr - discountIdr + uniqueCode);
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const invoiceNumber = `INV-BD-${datePart}-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const qrisPayload =
      body.paymentMethod === 'QRIS'
        ? buildDynamicQrisPayload({
            staticPayload: store.settings.qris.staticPayload,
            merchantName: store.settings.qris.merchantName,
            merchantCity: store.settings.qris.merchantCity,
            nmid: store.settings.qris.nmid,
            amountIdr: totalIdr,
            invoiceNumber,
          })
        : null;

    const order: Order = {
      id: orderId,
      invoiceNumber,
      userId: u.id,
      customerName: body.customerName || u.name,
      customerEmail: body.customerEmail || u.email,
      customerPhone: body.customerPhone || u.phone || '-',
      paymentMethod: body.paymentMethod,
      paymentChannel: body.paymentChannel,
      subtotalIdr,
      discountIdr,
      uniqueCode,
      totalIdr,
      promoCode: appliedPromo,
      status: 'PENDING_PAYMENT',
      qrisPayload,
      paymentProofUrl: null,
      paymentSenderName: null,
      paymentReference: null,
      web3TxHash: null,
      web3Chain: null,
      web3FromAddress: null,
      adminNote: null,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      paidAt: null,
      createdAt: now,
      items: resolvedItems,
    };

    store.orders.unshift(order);
    saveStore(store);
    return { order };
  },

  uploadOrderProof: async (orderId: string, formData: FormData) => {
    const store = loadStore();
    const u = requireUser(store);
    const order = store.orders.find((o) => o.id === orderId);
    if (!order) throw new Error('Order tidak ditemukan.');
    if (order.userId !== u.id && u.role !== 'ADMIN') {
      throw new Error('Akses ditolak.');
    }

    const file = formData.get('proofFile');
    if (file instanceof File && file.size > 0) {
      order.paymentProofUrl = await readFileAsDataUrl(file);
    }
    const sender = formData.get('paymentSenderName');
    const ref = formData.get('paymentReference');
    const txHash = formData.get('web3TxHash');
    const chain = formData.get('web3Chain');
    const fromAddr = formData.get('web3FromAddress');

    if (sender) order.paymentSenderName = String(sender);
    if (ref) order.paymentReference = String(ref);
    if (txHash) order.web3TxHash = String(txHash);
    if (chain) order.web3Chain = String(chain);
    if (fromAddr) order.web3FromAddress = String(fromAddr);
    order.status = 'AWAITING_VERIFICATION';
    saveStore(store);
    return {
      order,
      message: 'Konfirmasi pembayaran berhasil dikirim. Admin akan segera memverifikasi.',
    };
  },

  sandboxConfirmOrder: async (orderId: string) => {
    const store = loadStore();
    const u = requireUser(store);
    if (!store.settings.sandboxMode) {
      throw new Error('Mode Sandbox nonaktif.');
    }
    const order = store.orders.find((o) => o.id === orderId);
    if (!order) throw new Error('Order tidak ditemukan.');
    if (order.userId !== u.id && u.role !== 'ADMIN') {
      throw new Error('Akses ditolak.');
    }
    await fulfillOrderInStore(
      store,
      order,
      'Pembayaran terkonfirmasi otomatis melalui Boyang Sandbox Instant Payment.'
    );
    saveStore(store);
    return {
      order,
      message:
        'Pembayaran berhasil dikonfirmasi instan! Akses layanan/kursus/produk Anda aktif.',
    };
  },

  getUserDashboard: async (): Promise<UserDashboardResponse> => {
    const store = loadStore();
    const u = requireUser(store);

    const orders = store.orders.filter((o) => o.userId === u.id);
    const enrollments = store.enrollments
      .filter((e) => e.userId === u.id)
      .map((e) => ({
        ...e,
        course: store.catalog.find((c) => c.id === e.catalogItemId),
      }));

    const digitalProducts = orders
      .filter((o) => o.status === 'PAID')
      .flatMap((o) =>
        o.items
          .filter((i) => i.itemType === 'PRODUCT')
          .map((i) => {
            const cat = store.catalog.find((c) => c.id === i.catalogItemId);
            return {
              ...i,
              invoiceNumber: o.invoiceNumber,
              paidAt: o.paidAt,
              subtitle: cat?.subtitle || '',
              category: cat?.category || 'Digital Asset',
              productMetadata: (cat?.metadata || {}) as Record<string, unknown>,
            };
          })
      );

    const serviceProjects = orders
      .filter((o) => o.status === 'PAID')
      .flatMap((o) =>
        o.items
          .filter((i) => i.itemType === 'SERVICE')
          .map((i) => ({
            ...i,
            invoiceNumber: o.invoiceNumber,
            paidAt: o.paidAt,
          }))
      );

    return { orders, enrollments, digitalProducts, serviceProjects };
  },

  toggleLesson: async (courseId: string, lessonId: string) => {
    const store = loadStore();
    const u = requireUser(store);
    const enr = store.enrollments.find(
      (e) => e.userId === u.id && e.catalogItemId === courseId
    );
    if (!enr) throw new Error('Anda belum terdaftar pada kursus ini.');
    const course = store.catalog.find((c) => c.id === courseId);
    const totalLessons =
      course?.metadata.modules?.reduce((acc, m) => acc + m.lessons.length, 0) || 1;

    const set = new Set(enr.completedLessons);
    if (set.has(lessonId)) set.delete(lessonId);
    else set.add(lessonId);
    enr.completedLessons = Array.from(set);
    enr.progressPercent = Math.min(
      100,
      Math.round((enr.completedLessons.length / totalLessons) * 100)
    );
    enr.issuedAt =
      enr.progressPercent >= 100
        ? enr.issuedAt || new Date().toISOString()
        : null;
    saveStore(store);
    return { enrollment: { ...enr, course } };
  },

  downloadProductManifest: (orderItemId: string) => {
    const store = loadStore();
    for (const o of store.orders) {
      const it = o.items.find((i) => i.id === orderItemId);
      if (it && o.status === 'PAID') {
        const cat = store.catalog.find((c) => c.id === it.catalogItemId);
        const manifest = {
          brand: 'BOYANG DIGITAL',
          productTitle: cat?.title || it.itemTitle,
          version: cat?.metadata.version || 'v1.0.0',
          licenseType: cat?.metadata.licenseType || it.tierName,
          licenseKey: it.licenseKey,
          licensedTo: o.customerName,
          invoiceNumber: o.invoiceNumber,
          downloadedAt: new Date().toISOString(),
          features: cat?.features || [],
        };
        const blob = new Blob([JSON.stringify(manifest, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = cat?.metadata.fileName || `${cat?.slug || 'boyang-product'}.json`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
    }
  },

  getAdminOverview: async (): Promise<AdminOverviewResponse> => {
    const store = loadStore();
    requireAdminUser(store);
    const paidOrders = store.orders.filter((o) => o.status === 'PAID');
    const totalRevenueIdr = paidOrders.reduce((s, o) => s + o.totalIdr, 0);

    const methodMap = new Map<string, { method: string; count: number; total: number }>();
    const typeMap = new Map<string, { type: string; count: number; total: number }>();
    for (const o of paidOrders) {
      const m = methodMap.get(o.paymentMethod) || {
        method: o.paymentMethod,
        count: 0,
        total: 0,
      };
      m.count += 1;
      m.total += o.totalIdr;
      methodMap.set(o.paymentMethod, m);

      for (const it of o.items) {
        const t = typeMap.get(it.itemType) || {
          type: it.itemType,
          count: 0,
          total: 0,
        };
        t.count += it.quantity;
        t.total += it.unitPriceIdr * it.quantity;
        typeMap.set(it.itemType, t);
      }
    }

    return {
      totalRevenueIdr,
      totalPaidOrders: paidOrders.length,
      pendingVerificationCount: store.orders.filter((o) =>
        ['AWAITING_VERIFICATION', 'PENDING_PAYMENT'].includes(o.status)
      ).length,
      awaitingReviewCount: store.orders.filter(
        (o) => o.status === 'AWAITING_VERIFICATION'
      ).length,
      totalUsers: store.users.length,
      totalCatalogItems: store.catalog.filter((c) => c.isActive).length,
      newConsultationsCount: store.consultations.filter((c) => c.status === 'NEW')
        .length,
      revenueByMethod: Array.from(methodMap.values()),
      revenueByType: Array.from(typeMap.values()),
    };
  },

  getAdminOrders: async (params?: { status?: string; method?: string }) => {
    const store = loadStore();
    requireAdminUser(store);
    const orders = store.orders.filter((o) => {
      if (params?.status && params.status !== 'ALL' && o.status !== params.status) {
        return false;
      }
      if (
        params?.method &&
        params.method !== 'ALL' &&
        o.paymentMethod !== params.method
      ) {
        return false;
      }
      return true;
    });
    return { orders };
  },

  verifyOrder: async (
    orderId: string,
    action: 'APPROVE' | 'REJECT',
    adminNote?: string
  ) => {
    const store = loadStore();
    requireAdminUser(store);
    const order = store.orders.find((o) => o.id === orderId);
    if (!order) throw new Error('Order tidak ditemukan.');
    if (action === 'APPROVE') {
      await fulfillOrderInStore(
        store,
        order,
        adminNote || 'Pembayaran telah diverifikasi dan disetujui oleh Admin.'
      );
    } else {
      order.status = 'REJECTED';
      order.adminNote =
        adminNote || 'Bukti pembayaran tidak sesuai. Silakan hubungi tim kami.';
    }
    saveStore(store);
    return { order };
  },

  updateServiceProgress: async (
    itemId: string,
    body: {
      serviceStatus: ServiceOrderStatus;
      serviceDeliverableUrl?: string;
      updateMessage?: string;
    }
  ) => {
    const store = loadStore();
    const admin = requireAdminUser(store);
    for (const o of store.orders) {
      const it = o.items.find((i) => i.id === itemId);
      if (it) {
        it.serviceStatus = body.serviceStatus;
        if (body.serviceDeliverableUrl !== undefined) {
          it.serviceDeliverableUrl = body.serviceDeliverableUrl || null;
        }
        if (body.updateMessage?.trim()) {
          it.serviceUpdates.push({
            id: `upd-${randHex(3)}`,
            status: body.serviceStatus,
            message: body.updateMessage.trim(),
            createdAt: new Date().toISOString(),
            author: admin.name,
          });
        }
        saveStore(store);
        return { ok: true };
      }
    }
    throw new Error('Item layanan tidak ditemukan.');
  },

  createCatalogItem: async (body: Partial<CatalogItem>) => {
    const store = loadStore();
    requireAdminUser(store);
    const now = new Date().toISOString();
    const item: CatalogItem = {
      id: `${String(body.type || 'SRV').toLowerCase().slice(0, 3)}-${randHex(3)}`,
      slug: `${(body.title || 'item').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${randHex(2)}`,
      type: (body.type || 'SERVICE') as CatalogItemType,
      title: String(body.title || ''),
      subtitle: String(body.subtitle || ''),
      description: String(body.description || body.subtitle || ''),
      category: String(body.category || 'Umum'),
      priceIdr: Number(body.priceIdr || 0),
      originalPriceIdr: body.originalPriceIdr ?? null,
      badge: body.badge ?? null,
      thumbnailGradient:
        body.thumbnailGradient || 'from-cyan-500/20 via-indigo-500/20 to-slate-900',
      iconName: body.iconName || 'Sparkles',
      features: body.features || [],
      metadata: body.metadata || {},
      isFeatured: Boolean(body.isFeatured),
      isActive: body.isActive ?? true,
      rating: 5.0,
      salesCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    store.catalog.unshift(item);
    saveStore(store);
    return { item };
  },

  updateCatalogItem: async (id: string, body: Partial<CatalogItem>) => {
    const store = loadStore();
    requireAdminUser(store);
    const idx = store.catalog.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('Item tidak ditemukan.');
    store.catalog[idx] = {
      ...store.catalog[idx],
      ...body,
      updatedAt: new Date().toISOString(),
    };
    saveStore(store);
    return { item: store.catalog[idx] };
  },

  deleteCatalogItem: async (id: string) => {
    const store = loadStore();
    requireAdminUser(store);
    store.catalog = store.catalog.filter((c) => c.id !== id);
    saveStore(store);
    return { ok: true };
  },

  getAdminSettings: async () => {
    const store = loadStore();
    requireAdminUser(store);
    return { settings: store.settings };
  },

  updateAdminSettings: async (settings: Partial<PaymentSettings>) => {
    const store = loadStore();
    requireAdminUser(store);
    store.settings = { ...store.settings, ...settings };
    saveStore(store);
    return { settings: store.settings };
  },

  uploadQrisImage: async (formData: FormData) => {
    const store = loadStore();
    requireAdminUser(store);
    const file = formData.get('image');
    if (!(file instanceof File)) throw new Error('File gambar QRIS belum dipilih.');
    const url = await readFileAsDataUrl(file);
    store.settings.qris.customImageUrl = url;
    saveStore(store);
    return { url, settings: store.settings };
  },

  getAdminPromos: async () => {
    const store = loadStore();
    requireAdminUser(store);
    return { promos: store.promos };
  },

  createPromo: async (body: {
    code: string;
    discountPercent: number;
    maxDiscountIdr?: number | null;
  }) => {
    const store = loadStore();
    requireAdminUser(store);
    const promo: PromoCode = {
      id: `promo-${randHex(3)}`,
      code: body.code.trim().toUpperCase(),
      discountPercent: body.discountPercent,
      maxDiscountIdr: body.maxDiscountIdr ?? null,
      isActive: true,
      usageCount: 0,
      createdAt: new Date().toISOString(),
    };
    store.promos.unshift(promo);
    saveStore(store);
    return { promo };
  },

  togglePromo: async (id: string, isActive: boolean) => {
    const store = loadStore();
    requireAdminUser(store);
    const p = store.promos.find((x) => x.id === id);
    if (p) p.isActive = isActive;
    saveStore(store);
    return { ok: true };
  },

  getAdminUsers: async () => {
    const store = loadStore();
    requireAdminUser(store);
    return { users: store.users.map(sanitizeUser) };
  },

  updateUserRole: async (id: string, role: 'USER' | 'ADMIN') => {
    const store = loadStore();
    const admin = requireAdminUser(store);
    if (id === admin.id && role !== 'ADMIN') {
      throw new Error('Tidak dapat menurunkan role akun Anda sendiri.');
    }
    const target = store.users.find((u) => u.id === id);
    if (!target) throw new Error('User tidak ditemukan.');
    target.role = role;
    saveStore(store);
    return { user: sanitizeUser(target) };
  },

  getAdminConsultations: async () => {
    const store = loadStore();
    requireAdminUser(store);
    return { consultations: store.consultations };
  },

  updateConsultationStatus: async (
    id: string,
    status: Consultation['status']
  ) => {
    const store = loadStore();
    requireAdminUser(store);
    const c = store.consultations.find((x) => x.id === id);
    if (c) c.status = status;
    saveStore(store);
    return { ok: true };
  },
};
