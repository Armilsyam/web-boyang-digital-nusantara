import crypto from 'node:crypto';
import { config } from './config.ts';
import { db, savePaymentSetting } from './db.ts';
import {
  generateCertificateCode,
  generateLicenseKey,
  hashPassword,
  sha256Hex,
} from './utils/crypto.ts';
import type { CatalogMetadata, PaymentSettings } from '../src/types/index.ts';

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
  const defaultSettings: PaymentSettings = {
    qris: {
      merchantName: 'BOYANG DIGITAL',
      merchantCity: 'JAKARTA SELATAN',
      nmid: 'ID1026000889911',
      staticPayload: '',
      customImageUrl: '',
      isActive: true,
    },
    banks: [
      {
        id: 'bank-bca',
        bankCode: 'BCA',
        bankName: 'Bank Central Asia (BCA)',
        accountNumber: '8830912456',
        accountHolder: 'PT BOYANG DIGITAL KREATIF',
        isActive: true,
      },
      {
        id: 'bank-mandiri',
        bankCode: 'MANDIRI',
        bankName: 'Bank Mandiri',
        accountNumber: '1240009876543',
        accountHolder: 'PT BOYANG DIGITAL KREATIF',
        isActive: true,
      },
      {
        id: 'bank-bni',
        bankCode: 'BNI',
        bankName: 'Bank Negara Indonesia (BNI)',
        accountNumber: '0987654321',
        accountHolder: 'PT BOYANG DIGITAL KREATIF',
        isActive: true,
      },
      {
        id: 'bank-bri',
        bankCode: 'BRI',
        bankName: 'Bank Rakyat Indonesia (BRI)',
        accountNumber: '034101009876509',
        accountHolder: 'PT BOYANG DIGITAL KREATIF',
        isActive: true,
      },
    ],
    ewallets: [
      {
        id: 'ew-gopay',
        provider: 'GoPay',
        accountNumber: '0812-8899-2026',
        accountName: 'BOYANG DIGITAL OFFICIAL',
        instructions: 'Buka aplikasi Gojek/GoPay, pilih Transfer ke Nomor HP, lalu masukkan nominal tepat hingga 3 digit terakhir.',
        isActive: true,
      },
      {
        id: 'ew-ovo',
        provider: 'OVO',
        accountNumber: '0812-8899-2026',
        accountName: 'BOYANG DIGITAL OFFICIAL',
        instructions: 'Buka aplikasi OVO, pilih Transfer > Sesama OVO, masukkan nomor di atas dan unggah bukti transaksi.',
        isActive: true,
      },
      {
        id: 'ew-dana',
        provider: 'DANA',
        accountNumber: '0812-8899-2026',
        accountName: 'BOYANG DIGITAL OFFICIAL',
        instructions: 'Buka DANA, pilih Kirim ke Teman atau Scan QRIS Boyang Digital untuk konfirmasi instan.',
        isActive: true,
      },
      {
        id: 'ew-shopeepay',
        provider: 'ShopeePay',
        accountNumber: '0812-8899-2026',
        accountName: 'BOYANG DIGITAL OFFICIAL',
        instructions: 'Kirim melalui ShopeePay Transfer atau scan kode QRIS yang tersedia pada halaman checkout.',
        isActive: true,
      },
    ],
    web3: {
      treasuryAddress: config.web3TreasuryAddress,
      ensDomain: 'boyangdigital.eth',
      enableWalletLogin: true,
      enableCryptoPayment: true,
      enableWeb3Certificates: true,
      chains: [
        {
          chainId: 8453,
          name: 'Base Mainnet',
          symbol: 'ETH',
          explorerUrl: 'https://basescan.org/tx/',
          idrPerToken: 48000000,
          acceptedTokens: ['ETH', 'USDC'],
          isActive: true,
        },
        {
          chainId: 137,
          name: 'Polygon PoS',
          symbol: 'POL',
          explorerUrl: 'https://polygonscan.com/tx/',
          idrPerToken: 8500,
          acceptedTokens: ['POL', 'USDC', 'USDT'],
          isActive: true,
        },
        {
          chainId: 1,
          name: 'Ethereum Mainnet',
          symbol: 'ETH',
          explorerUrl: 'https://etherscan.io/tx/',
          idrPerToken: 48000000,
          acceptedTokens: ['ETH', 'USDC', 'USDT'],
          isActive: true,
        },
        {
          chainId: 42161,
          name: 'Arbitrum One',
          symbol: 'ETH',
          explorerUrl: 'https://arbiscan.io/tx/',
          idrPerToken: 48000000,
          acceptedTokens: ['ETH', 'USDC'],
          isActive: true,
        },
        {
          chainId: 11155111,
          name: 'Sepolia Testnet',
          symbol: 'ETH',
          explorerUrl: 'https://sepolia.etherscan.io/tx/',
          idrPerToken: 48000000,
          acceptedTokens: ['ETH'],
          isActive: true,
        },
      ],
    },
    sandboxMode: config.paymentSandboxMode,
  };

  savePaymentSetting('qris', defaultSettings.qris);
  savePaymentSetting('banks', defaultSettings.banks);
  savePaymentSetting('ewallets', defaultSettings.ewallets);
  savePaymentSetting('web3', defaultSettings.web3);
  savePaymentSetting('sandboxMode', defaultSettings.sandboxMode);

  // 3. Seed Catalog Items (Services, Courses, Digital Products)
  const items: Array<{
    id: string;
    slug: string;
    type: 'SERVICE' | 'COURSE' | 'PRODUCT';
    title: string;
    subtitle: string;
    description: string;
    category: string;
    priceIdr: number;
    originalPriceIdr: number | null;
    badge: string | null;
    gradient: string;
    icon: string;
    features: string[];
    metadata: CatalogMetadata;
    featured: number;
    rating: number;
    sales: number;
  }> = [
    // === LAYANAN JASA DIGITAL ===
    {
      id: 'srv-web-saas',
      slug: 'jasa-website-saas-fullstack',
      type: 'SERVICE',
      title: 'Fullstack Website, Company Profile & SaaS Platform',
      subtitle: 'Arsitektur web ultra-cepat, SEO-ready, dashboard admin & integrasi payment gateway.',
      description:
        'Kami merancang dan membangun website profesional hingga sistem aplikasi SaaS skala produksi menggunakan React, Next.js, Node.js, dan database modern. Dilengkapi keamanan tingkat enterprise, optimasi Core Web Vitals, dan kesiapan integrasi QRIS/Midtrans maupun Web3.',
      category: 'Web & SaaS Engineering',
      priceIdr: 3500000,
      originalPriceIdr: 5000000,
      badge: 'Terlaris',
      gradient: 'from-cyan-500/20 via-indigo-500/20 to-slate-900',
      icon: 'Globe',
      features: [
        'Desain UI/UX Custom & Responsif Mobile',
        'Admin Panel & Manajemen Konten Dinamis',
        'Integrasi Pembayaran QRIS / VA / E-Wallet',
        'Setup Domain, SSL & Hosting Cloud Siap Pakai',
        'Garansi Maintenance & Support Teknis 60 Hari',
      ],
      metadata: {
        estimatedTimeline: '7 - 21 Hari Kerja',
        techStack: ['React / Next.js', 'TypeScript', 'Node.js', 'PostgreSQL / SQLite', 'Tailwind CSS'],
        tiers: [
          {
            name: 'Starter Landing / Compro',
            priceIdr: 3500000,
            duration: '7 Hari Kerja',
            deliverables: [
              'Hingga 6 Halaman Responsif',
              'Form Leads & Integrasi WhatsApp',
              'Optimasi SEO On-Page & Speed',
              'Free Deploy ke Cloud Hosting',
            ],
          },
          {
            name: 'Business Marketplace + Payment',
            priceIdr: 7500000,
            duration: '14 Hari Kerja',
            popular: true,
            deliverables: [
              'Multi-Role User & Admin Dashboard',
              'Integrasi QRIS, Bank & E-Wallet',
              'Sistem Order, Invoice & Email Notif',
              'Source Code Penuh + Dokumentasi',
            ],
          },
          {
            name: 'Enterprise SaaS / Custom Web3',
            priceIdr: 15000000,
            duration: '21-30 Hari Kerja',
            deliverables: [
              'Arsitektur Microservices / High-Traffic',
              'Integrasi Web3 Wallet & Smart Contract',
              'CI/CD Pipeline, Monitoring & Security Audit',
              'Dedicated Engineer & SLA Prioritas',
            ],
          },
        ],
      },
      featured: 1,
      rating: 4.9,
      sales: 148,
    },
    {
      id: 'srv-web3-dapp',
      slug: 'jasa-web3-smart-contract-dapp',
      type: 'SERVICE',
      title: 'Web3 Studio, Smart Contract & dApp Engineering',
      subtitle: 'Pengembangan dApp EVM, Token/NFT Smart Contract, Wallet Auth & DeFi Dashboard.',
      description:
        'Transformasikan bisnis atau proyek Anda ke ekosistem Web3 yang handal dan aman. Tim blockchain engineer Boyang Digital siap membangun smart contract Solidity teraudit, portal minting NFT, sistem token-gating untuk kursus/produk, hingga integrasi pembayaran crypto multi-chain.',
      category: 'Web3 & Blockchain',
      priceIdr: 6500000,
      originalPriceIdr: 9000000,
      badge: 'Web3 Ready',
      gradient: 'from-violet-500/25 via-fuchsia-500/15 to-slate-900',
      icon: 'Cpu',
      features: [
        'Smart Contract Solidity (ERC-20, ERC-721, ERC-1155)',
        'Integrasi MetaMask, WalletConnect & SIWE Auth',
        'Multi-Chain Support (Base, Polygon, Arbitrum, ETH)',
        'Testnet Deployment & Security Gas Optimization',
        'Verifikasi Contract di Explorer & Audit Report',
      ],
      metadata: {
        estimatedTimeline: '10 - 25 Hari Kerja',
        techStack: ['Solidity', 'Foundry / Hardhat', 'Viem / Wagmi', 'IPFS', 'Base / Polygon'],
        tiers: [
          {
            name: 'Smart Contract + Verification',
            priceIdr: 6500000,
            duration: '10 Hari Kerja',
            deliverables: [
              'Custom Audited Solidity Contract',
              'Unit Test Suite Lengkap (100% Core Flow)',
              'Deploy Testnet & Mainnet Assistance',
            ],
          },
          {
            name: 'Fullstack dApp + Minting Portal',
            priceIdr: 12500000,
            duration: '18 Hari Kerja',
            popular: true,
            deliverables: [
              'Frontend dApp + Multi-Wallet Connect',
              'IPFS Metadata & Smart Contract Integration',
              'Hybrid Fiat (QRIS) + Crypto Checkout',
            ],
          },
        ],
      },
      featured: 1,
      rating: 5.0,
      sales: 64,
    },
    {
      id: 'srv-ai-automation',
      slug: 'jasa-ai-agent-automation',
      type: 'SERVICE',
      title: 'AI Agent, Chatbot CS & Business Workflow Automation',
      subtitle: 'Otomatisasi layanan pelanggan 24/7, integrasi WhatsApp/CRM & pipeline AI cerdas.',
      description:
        'Tingkatkan efisiensi operasional bisnis hingga 10x lipat dengan AI Agent custom yang terlatih dengan knowledge base perusahaan Anda. Terhubung langsung dengan WhatsApp, Telegram, Website, Google Sheets, dan sistem ERP/pembayaran.',
      category: 'AI & Automation',
      priceIdr: 2800000,
      originalPriceIdr: 4000000,
      badge: 'High ROI',
      gradient: 'from-emerald-500/20 via-teal-500/15 to-slate-900',
      icon: 'Bot',
      features: [
        'Custom RAG Knowledge Base Bisnis Anda',
        'Integrasi WhatsApp Business API & Web Widget',
        'Workflow Otomatisasi n8n / Webhook / CRM',
        'Dashboard Monitoring Percakapan & Leads',
      ],
      metadata: {
        estimatedTimeline: '5 - 12 Hari Kerja',
        techStack: ['OpenAI / Gemini API', 'n8n', 'Node.js', 'Vector DB', 'WhatsApp Webhook'],
        tiers: [
          {
            name: 'AI CS Chatbot + RAG',
            priceIdr: 2800000,
            duration: '5 Hari Kerja',
            deliverables: [
              'Bot AI terlatih dokumen/katalog produk',
              'Embed Widget Website + Handover ke Admin',
              'Tracking Leads Otomatis ke Spreadsheet',
            ],
          },
          {
            name: 'End-to-End Business Automation',
            priceIdr: 5800000,
            duration: '12 Hari Kerja',
            popular: true,
            deliverables: [
              'Multi-Channel AI Agent (WA + Web + Telegram)',
              'Auto-Invoice & Follow-up Pembayaran QRIS',
              'Custom API Webhook & Server Setup',
            ],
          },
        ],
      },
      featured: 1,
      rating: 4.9,
      sales: 92,
    },
    {
      id: 'srv-uiux-brand',
      slug: 'jasa-uiux-design-brand-identity',
      type: 'SERVICE',
      title: 'UI/UX Product Design & Modern Brand Identity',
      subtitle: 'Desain antarmuka Figma kelas dunia, design system modular & identitas visual brand.',
      description:
        'Wujudkan kesan pertama yang premium dan konversi tinggi untuk produk digital Anda. Mencakup riset user journey, wireframe, high-fidelity UI design di Figma, prototype interaktif, serta panduan identitas brand modern.',
      category: 'UI/UX & Branding',
      priceIdr: 2500000,
      originalPriceIdr: 3500000,
      badge: null,
      gradient: 'from-amber-500/20 via-orange-500/15 to-slate-900',
      icon: 'Palette',
      features: [
        'File Master Figma Rapi dengan Auto-Layout & Tokens',
        'Interactive Clickable Prototype Siap Presentasi',
        'Logo Vector, Color Palette & Brand Guidelines',
        'Handoff Siap Coding untuk Developer',
      ],
      metadata: {
        estimatedTimeline: '5 - 14 Hari Kerja',
        techStack: ['Figma', 'Design Tokens', 'Framer Motion Specs', 'Adobe Illustrator'],
        tiers: [
          {
            name: 'Brand Kit + Landing UI',
            priceIdr: 2500000,
            duration: '5 Hari Kerja',
            deliverables: [
              'Logo Modern + Brand Guidelines PDF',
              'Desain Landing Page Desktop & Mobile',
              'Aset Ikon & Ilustrasi Custom',
            ],
          },
          {
            name: 'Full App UI/UX Design System',
            priceIdr: 5500000,
            duration: '14 Hari Kerja',
            popular: true,
            deliverables: [
              '20+ Layar Aplikasi / Dashboard Kompleks',
              'Component Library & Design Token System',
              'Interactive Prototype & Developer Handoff',
            ],
          },
        ],
      },
      featured: 0,
      rating: 4.8,
      sales: 115,
    },
    {
      id: 'srv-mobile-app',
      slug: 'jasa-aplikasi-mobile-android-ios',
      type: 'SERVICE',
      title: 'Mobile App Development (Android & iOS)',
      subtitle: 'Aplikasi mobile performa native untuk marketplace, membership, fintech & Web3 wallet.',
      description:
        'Bangun aplikasi Android dan iOS dari satu codebase handal menggunakan React Native / Flutter dengan backend terintegrasi penuh, push notification, otentikasi biometrik, dan kesiapan rilis ke Google Play Store & App Store.',
      category: 'Mobile Engineering',
      priceIdr: 8500000,
      originalPriceIdr: 12000000,
      badge: 'Full Package',
      gradient: 'from-sky-500/20 via-blue-600/20 to-slate-900',
      icon: 'Smartphone',
      features: [
        'Cross-Platform Android & iOS',
        'Push Notification & Real-time Sync',
        'Integrasi Pembayaran Dalam Aplikasi / QRIS',
        'Bantuan Publish Play Store & App Store',
      ],
      metadata: {
        estimatedTimeline: '21 - 35 Hari Kerja',
        techStack: ['React Native / Expo', 'Flutter', 'REST / GraphQL API', 'Firebase'],
        tiers: [
          {
            name: 'MVP Mobile App',
            priceIdr: 8500000,
            duration: '21 Hari Kerja',
            deliverables: [
              'Aplikasi Android APK/AAB Siap Rilis',
              'Backend API + Admin Dashboard Web',
              'Auth, Profile & Fitur Inti Bisnis',
            ],
          },
          {
            name: 'Pro Android + iOS Ecosystem',
            priceIdr: 16500000,
            duration: '35 Hari Kerja',
            popular: true,
            deliverables: [
              'Build Android & iOS Teroptimasi',
              'Payment Gateway + Real-time Tracking',
              'Integrasi Analytics & Crash Monitoring',
            ],
          },
        ],
      },
      featured: 0,
      rating: 4.9,
      sales: 47,
    },
    {
      id: 'srv-growth-seo',
      slug: 'jasa-digital-marketing-seo-ads',
      type: 'SERVICE',
      title: 'Digital Growth, Technical SEO & Performance Ads',
      subtitle: 'Strategi akuisisi trafik organik Google, Meta/TikTok Ads & optimasi funnel konversi.',
      description:
        'Maksimalkan omzet produk digital, jasa, maupun proyek Web3 Anda melalui audit SEO teknis menyeluruh, konten berperingkat tinggi, setup pixel/conversion API akurat, dan manajemen kampanye iklan terukur.',
      category: 'Growth & Marketing',
      priceIdr: 2200000,
      originalPriceIdr: 3000000,
      badge: null,
      gradient: 'from-rose-500/20 via-pink-500/15 to-slate-900',
      icon: 'TrendingUp',
      features: [
        'Audit Technical SEO & Riset Keyword Konversi',
        'Setup Google Analytics 4, Tag Manager & Meta CAPI',
        'Optimasi Copywriting Landing Page',
        'Laporan Performa Mingguan & ROAS Tracking',
      ],
      metadata: {
        estimatedTimeline: 'Bulanan / Campaign 30 Hari',
        techStack: ['GA4 & GTM', 'Meta Ads / Google Ads', 'Search Console', 'Ahrefs / Semrush'],
        tiers: [
          {
            name: 'SEO Foundation & Funnel Audit',
            priceIdr: 2200000,
            duration: '14 Hari Kerja',
            deliverables: [
              'Technical SEO Fix & Schema Markup',
              '10 Artikel / Landing Copy Teroptimasi',
              'Setup Tracking Konversi Lengkap',
            ],
          },
          {
            name: 'Full Growth Management (30 Hari)',
            priceIdr: 4500000,
            duration: '30 Hari',
            popular: true,
            deliverables: [
              'Manajemen Meta Ads & Google Search Ads',
              'A/B Testing Creative & Copy',
              'Dashboard Laporan Real-time Mingguan',
            ],
          },
        ],
      },
      featured: 0,
      rating: 4.8,
      sales: 129,
    },

    // === KURSUS ACADEMY ===
    {
      id: 'crs-fullstack-saas',
      slug: 'kursus-fullstack-saas-payment-indonesia',
      type: 'COURSE',
      title: 'Masterclass Fullstack Web, SaaS & Payment Gateway Indonesia',
      subtitle: 'Bangun aplikasi komersial React, Node.js, SQLite/Postgres dengan QRIS & Hosting.',
      description:
        'Kurikulum praktis dari nol hingga deploy produksi. Pelajari arsitektur fullstack modern dengan TypeScript, otentikasi aman, manajemen role User & Admin, pembuatan payload QRIS dinamis, hingga strategi deployment ke VPS dan Cloud Platform.',
      category: 'Fullstack Development',
      priceIdr: 499000,
      originalPriceIdr: 1200000,
      badge: 'Best Seller',
      gradient: 'from-cyan-500/25 via-sky-500/15 to-slate-900',
      icon: 'GraduationCap',
      features: [
        '12+ Jam Video & Modul Kode Terstruktur',
        'Studi Kasus Marketplace Jasa & Produk Digital',
        'Implementasi Real QRIS, Transfer Bank & Auth',
        'Sertifikat Kelulusan Terverifikasi Hash Web3',
      ],
      metadata: {
        instructor: 'Boyang Pratama',
        instructorRole: 'Principal Fullstack & Web3 Architect',
        level: 'Menengah',
        totalDuration: '12 Jam 40 Menit',
        certificateWeb3Ready: true,
        modules: [
          {
            id: 'mod-fs-1',
            title: 'Modul 1: Arsitektur Modern & Setup Production',
            lessons: [
              {
                id: 'les-fs-1-1',
                title: 'Blueprint Aplikasi SaaS Multi-Role User & Admin',
                duration: '18:20',
                isPreview: true,
                summary: 'Memahami pemisahan layer frontend, REST API, skema database relasional, dan keamanan session.',
                content:
                  'Pada modul pembuka ini kita membedah arsitektur aplikasi modern yang menggabungkan storefront publik, area member terautentikasi, serta panel admin backoffice. Kunci skalabilitas adalah memisahkan domain entity (Catalog, Orders, Enrollments, PaymentSettings) secara bersih agar mudah dipindahkan antara SQLite, PostgreSQL, maupun cloud serverless.',
                codeSnippet: `// Contoh struktur role guard Express API
export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Akses khusus Administrator' });
  }
  next();
}`,
              },
              {
                id: 'les-fs-1-2',
                title: 'Mendesain Skema Database Order & Digital Delivery',
                duration: '24:10',
                summary: 'Merancang tabel orders, order_items, dan mekanisme unlock otomatis aset digital.',
                content:
                  'Setiap transaksi di platform digital memiliki siklus hidup: PENDING_PAYMENT -> AWAITING_VERIFICATION -> PAID. Ketika status berubah menjadi PAID oleh webhook gateway atau verifikasi Admin, sistem secara atomik menerbitkan license key untuk produk digital, mendaftarkan enrollment kursus, dan mengaktifkan proyek jasa.',
              },
            ],
          },
          {
            id: 'mod-fs-2',
            title: 'Modul 2: Integrasi Pembayaran QRIS, Bank & E-Wallet',
            lessons: [
              {
                id: 'les-fs-2-1',
                title: 'Membongkar Spesifikasi EMVCo QRIS & CRC16',
                duration: '29:45',
                summary: 'Cara kerja payload QRIS dinamis, Tag TLV, Tag 54 nominal, dan perhitungan checksum CRC16.',
                content:
                  'QRIS di Indonesia menggunakan standar EMVCo Merchant Presented Mode. Dengan memanipulasi Tag 01 (menjadi 12 untuk dinamis), Tag 54 (nominal Rupiah), dan menghitung ulang Tag 63 (CRC16-CCITT), aplikasi Anda mampu menghasilkan kode QR yang langsung mengisi nominal secara otomatis saat dipindai.',
                codeSnippet: `const payload = buildDynamicQrisPayload({
  merchantName: 'BOYANG DIGITAL',
  nmid: 'ID1026000889911',
  amountIdr: 499000,
  invoiceNumber: 'INV-BD-001'
});`,
              },
              {
                id: 'les-fs-2-2',
                title: 'Upload Bukti Transfer & Verifikasi Admin Real-time',
                duration: '22:15',
                summary: 'Implementasi Multer upload aman, validasi ekstensi file, dan approval workflow.',
                content:
                  'Selain pembayaran otomatis, bisnis jasa dan high-ticket di Indonesia sangat mengandalkan Transfer Bank dan E-Wallet dengan unggah bukti transfer. Pelajari cara menyimpan bukti transfer aman dan merender preview-nya langsung di dashboard Admin.',
              },
            ],
          },
          {
            id: 'mod-fs-3',
            title: 'Modul 3: Deployment Hosting Cloud & Optimasi Keamanan',
            lessons: [
              {
                id: 'les-fs-3-1',
                title: 'Containerizing dengan Docker & Deploy ke Railway/VPS',
                duration: '26:00',
                summary: 'Menyiapkan Dockerfile multi-stage, volume database persisten, dan SSL HTTPS.',
                content:
                  'Di bagian akhir, kita membungkus frontend Vite dan backend Node.js menjadi satu server produksi yang ringan, menyusun Dockerfile, dan mengonfigurasi environment variable agar website Anda siap diakses publik dengan domain custom.',
              },
            ],
          },
        ],
      },
      featured: 1,
      rating: 4.9,
      sales: 342,
    },
    {
      id: 'crs-web3-solidity',
      slug: 'kursus-web3-solidity-smart-contract',
      type: 'COURSE',
      title: 'Web3 Engineering: Solidity, Smart Contract & Modern dApp',
      subtitle: 'Kuasai blockchain EVM, wallet authentication (SIWE), Viem & integrasi pembayaran on-chain.',
      description:
        'Pelajari bagaimana membangun aplikasi Web2.5 dan Web3 yang benar-benar berguna untuk bisnis nyata: mulai dari menulis smart contract aman di Solidity, verifikasi tanda tangan kriptografi wallet tanpa gas fee, hingga sertifikat digital terverifikasi.',
      category: 'Web3 & Blockchain',
      priceIdr: 650000,
      originalPriceIdr: 1500000,
      badge: 'Web3 Track',
      gradient: 'from-violet-500/25 via-indigo-500/20 to-slate-900',
      icon: 'ShieldCheck',
      features: [
        'Praktek Langsung Viem, EIP-1193 & Solidity',
        'Implementasi Sign-In With Ethereum (SIWE)',
        'Mekanisme Pembayaran Crypto Multi-Chain (Base/Polygon)',
        'Sertifikat Kelulusan dengan Hash Verifikasi On-Chain Ready',
      ],
      metadata: {
        instructor: 'Dimas Aditya, S.Kom',
        instructorRole: 'Lead Blockchain & Security Engineer',
        level: 'Semua Level',
        totalDuration: '10 Jam 15 Menit',
        certificateWeb3Ready: true,
        modules: [
          {
            id: 'mod-w3-1',
            title: 'Modul 1: Fondasi EVM, Wallet & Kriptografi Web3',
            lessons: [
              {
                id: 'les-w3-1-1',
                title: 'Cara Kerja EIP-1193 Provider & MetaMask Connection',
                duration: '20:30',
                isPreview: true,
                summary: 'Menghubungkan frontend React ke wallet pengguna secara aman tanpa dependency berat.',
                content:
                  'Browser wallet modern mengekspos objek standar EIP-1193 melalui window.ethereum. Dengan memanggil eth_requestAccounts dan memantau event accountsChanged serta chainChanged, aplikasi Anda tetap sinkron dengan jaringan pilihan user.',
                codeSnippet: `const accounts = await window.ethereum.request({
  method: 'eth_requestAccounts'
});`,
              },
              {
                id: 'les-w3-1-2',
                title: 'Otentikasi Wallet dengan Cryptographic Nonce (SIWE)',
                duration: '25:40',
                summary: 'Membuktikan kepemilikan alamat wallet di backend menggunakan personal_sign & verifyMessage.',
                content:
                  'Jangan pernah mempercayai alamat wallet yang dikirim mentah dari client! Selalu buat nonce acak di server, minta pengguna menandatangani pesan via personal_sign, lalu verifikasi signature tersebut di server dengan viem verifyMessage.',
              },
            ],
          },
          {
            id: 'mod-w3-2',
            title: 'Modul 2: Smart Contract & Hybrid Payment Architecture',
            lessons: [
              {
                id: 'les-w3-2-1',
                title: 'Menulis ERC-721 Certificate & Token-Gated Access',
                duration: '31:00',
                summary: 'Desain smart contract sertifikat non-transferable (Soulbound) untuk alumni kursus.',
                content:
                  'Dengan menggabungkan hash SHA-256 sertifikat dan metadata URI ke smart contract Soulbound Token (SBT), kredensial alumni dapat diverifikasi secara publik dan anti-pemalsuan selamanya.',
              },
            ],
          },
        ],
      },
      featured: 1,
      rating: 5.0,
      sales: 215,
    },
    {
      id: 'crs-ai-n8n',
      slug: 'kursus-ai-agent-automation-bisnis',
      type: 'COURSE',
      title: 'AI Agent & Otomatisasi Bisnis Tanpa Ribet (n8n + LLM)',
      subtitle: 'Bangun sistem CS AI otomatis, lead scoring & workflow integrasi bisnis yang bisa dijual sebagai jasa.',
      description:
        'Pelajari skill dengan permintaan tertinggi saat ini: merancang AI Agent dan otomasi workflow bisnis menggunakan LLM API, Webhook, dan n8n. Cocok untuk pemilik bisnis maupun freelancer yang ingin membuka jasa AI Automation.',
      category: 'AI & Automation',
      priceIdr: 399000,
      originalPriceIdr: 899000,
      badge: 'Trending',
      gradient: 'from-emerald-500/25 via-cyan-500/15 to-slate-900',
      icon: 'Sparkles',
      features: [
        'Template Workflow n8n Siap Import',
        'Integrasi WhatsApp, Email & Google Workspace',
        'Panduan Menentukan Harga Jasa AI ke Klien',
        'Sertifikat Kelulusan Digital Boyang Academy',
      ],
      metadata: {
        instructor: 'Nadia Kusuma',
        instructorRole: 'AI Solutions Architect',
        level: 'Pemula',
        totalDuration: '7 Jam 50 Menit',
        certificateWeb3Ready: true,
        modules: [
          {
            id: 'mod-ai-1',
            title: 'Modul 1: Prompt Engineering & Struktur RAG Bisnis',
            lessons: [
              {
                id: 'les-ai-1-1',
                title: 'Merancang System Prompt CS Profesional Anti-Halusinasi',
                duration: '19:15',
                isPreview: true,
                summary: 'Teknik grounding pengetahuan produk dan batasan respon AI.',
                content:
                  'Kunci chatbot bisnis yang bisa diandalkan adalah membatasi konteks jawaban hanya pada dokumen SOP dan katalog resmi, dilengkapi fallback eskalasi ke admin manusia saat pertanyaan di luar cakupan.',
              },
              {
                id: 'les-ai-1-2',
                title: 'Menghubungkan Webhook Pembayaran dengan Notifikasi Otomatis',
                duration: '23:30',
                summary: 'Otomatis kirim invoice PDF & akses produk saat status order lunas.',
                content:
                  'Ketika order terverifikasi, trigger webhook mengirim ringkasan ke CRM, memicu pesan selamat datang WhatsApp, dan mencatat pembukuan otomatis.',
              },
            ],
          },
        ],
      },
      featured: 0,
      rating: 4.9,
      sales: 279,
    },
    {
      id: 'crs-uiux-figma',
      slug: 'kursus-uiux-design-system-modern',
      type: 'COURSE',
      title: 'UI/UX Design System & High-Converting SaaS Interface',
      subtitle: 'Kuasai Figma Auto-Layout, Design Tokens, Dark Mode Estetik & Prototyping Interaktif.',
      description:
        'Belajar langsung standar desain agensi digital modern. Mulai dari psikologi tata letak, tipografi editorial teknologi, komponen reusable Figma, hingga cara mempresentasikan desain ke klien internasional.',
      category: 'UI/UX Design',
      priceIdr: 349000,
      originalPriceIdr: 799000,
      badge: null,
      gradient: 'from-amber-500/20 via-rose-500/15 to-slate-900',
      icon: 'Layers',
      features: [
        'Latihan Real Project Dashboard & Web3 Landing',
        'Gratis Starter Design System File Figma',
        'Tips Handoff Akurat ke Tailwind CSS',
        'Sertifikat Terverifikasi Boyang Digital',
      ],
      metadata: {
        instructor: 'Kevin Sanjaya',
        instructorRole: 'Head of Product Design',
        level: 'Pemula',
        totalDuration: '8 Jam 20 Menit',
        certificateWeb3Ready: true,
        modules: [
          {
            id: 'mod-ui-1',
            title: 'Modul 1: Fondasi Visual Modern & Dark Tech Aesthetic',
            lessons: [
              {
                id: 'les-ui-1-1',
                title: 'Hirarki Kontras, Glassmorphism & Surface Elevation',
                duration: '21:00',
                isPreview: true,
                summary: 'Menciptakan antarmuka dark mode yang bersih, terbaca, dan elegan.',
                content:
                  'Dark mode profesional bukan sekadar background hitam pekat. Gunakan lapisan surface bertingkat (#06080F -> #0C111E -> #131B2E) dengan border hairline 1px transparan agar setiap kartu memiliki kedalaman tanpa terlihat ramai.',
              },
            ],
          },
        ],
      },
      featured: 0,
      rating: 4.8,
      sales: 184,
    },

    // === PRODUK DIGITAL ===
    {
      id: 'prd-saas-kit',
      slug: 'boyang-saas-boilerplate-pro',
      type: 'PRODUCT',
      title: 'Boyang SaaS & Marketplace Boilerplate Pro (Source Code)',
      subtitle: 'Starter kit fullstack React + TypeScript + Node.js dengan Auth, Admin & QRIS Ready.',
      description:
        'Hemat ratusan jam pengembangan! Paket source code siap produksi yang mencakup sistem autentikasi aman, role User/Admin, keranjang belanja, generator QRIS dinamis, upload bukti transfer, dan konfigurasi Docker/Cloud hosting.',
      category: 'Source Code & Kit',
      priceIdr: 450000,
      originalPriceIdr: 950000,
      badge: 'Instant Download',
      gradient: 'from-cyan-500/20 via-emerald-500/15 to-slate-900',
      icon: 'Code2',
      features: [
        'Full Source Code TypeScript (Frontend + Backend)',
        'Integrasi Auth Cookie, QRIS & Multi-Bank',
        'Lisensi Komersial Unlimited Project Klien',
        'Gratis Update Seumur Hidup + Changelog',
      ],
      metadata: {
        version: 'v2.4.0',
        licenseType: 'Commercial Multi-Project License',
        fileSize: '18.4 MB (.zip / package)',
        fileName: 'boyang-saas-boilerplate-v2.4.0.json',
        techStackProduct: ['React 19', 'TypeScript', 'Tailwind v4', 'Express', 'SQLite/Postgres'],
        demoUrl: '#katalog',
      },
      featured: 1,
      rating: 5.0,
      sales: 412,
    },
    {
      id: 'prd-web3-kit',
      slug: 'web3-dapp-nft-minting-kit',
      type: 'PRODUCT',
      title: 'Web3 dApp, SIWE Auth & Multi-Chain Checkout Starter Kit',
      subtitle: 'Template lengkap koneksi wallet MetaMask, Smart Contract ERC-721 & verifikasi signature.',
      description:
        'Fondasi cepat untuk membangun aplikasi Web3 modern di jaringan EVM (Base, Polygon, Arbitrum, Ethereum). Dilengkapi hook EIP-1193, verifier signature backend dengan Viem, serta contoh kontrak Solidity siap deploy.',
      category: 'Web3 Kit',
      priceIdr: 550000,
      originalPriceIdr: 1100000,
      badge: 'Web3 Pro',
      gradient: 'from-violet-500/25 via-purple-600/15 to-slate-900',
      icon: 'Boxes',
      features: [
        'Solidity Contracts (ERC-20, ERC-721 Soulbound)',
        'SIWE Wallet Auth & Signature Verification',
        'Multi-Chain Switcher & TxHash Tracker',
        'Dokumentasi Deploy Hardhat / Foundry',
      ],
      metadata: {
        version: 'v1.8.2',
        licenseType: 'Developer Commercial License',
        fileSize: '12.1 MB',
        fileName: 'boyang-web3-dapp-kit-v1.8.2.json',
        techStackProduct: ['Solidity 0.8.24', 'Viem', 'React', 'TypeScript'],
      },
      featured: 1,
      rating: 4.9,
      sales: 196,
    },
    {
      id: 'prd-n8n-pack',
      slug: '50-ai-n8n-automation-workflows',
      type: 'PRODUCT',
      title: '50+ AI & n8n Business Automation Workflow Pack',
      subtitle: 'Koleksi template JSON n8n siap pakai untuk CS WhatsApp AI, CRM, Invoice & Konten.',
      description:
        'Kumpulan 50+ blueprint otomatisasi siap import ke n8n. Mencakup bot CS WhatsApp berbasis RAG, auto-responder komentar sosial media, pengingat tagihan invoice otomatis, serta scraper riset pasar.',
      category: 'Automation Templates',
      priceIdr: 249000,
      originalPriceIdr: 550000,
      badge: 'Hemat 55%',
      gradient: 'from-emerald-500/20 via-lime-500/10 to-slate-900',
      icon: 'Workflow',
      features: [
        '50+ File JSON Siap Import ke n8n',
        'Panduan Setup API Key & Webhook Bahasa Indonesia',
        'Cocok untuk Agensi AI & Pemilik Bisnis',
        'Update Workflow Baru Setiap Bulan',
      ],
      metadata: {
        version: 'v3.1.0',
        licenseType: 'Agency & Business Use',
        fileSize: '6.8 MB',
        fileName: 'boyang-50-ai-n8n-workflows-v3.1.json',
        techStackProduct: ['n8n JSON', 'OpenAI / Gemini', 'WhatsApp API', 'Google Sheets'],
      },
      featured: 0,
      rating: 4.9,
      sales: 530,
    },
    {
      id: 'prd-figma-uikit',
      slug: 'neo-cyber-saas-figma-uikit',
      type: 'PRODUCT',
      title: 'Neo-Cyber & Web3 Figma UI Kit (450+ Components)',
      subtitle: 'Komponen antarmuka dashboard, fintech, marketplace & Web3 modal siap pakai di Figma.',
      description:
        'Percepat proses desain produk digital Anda hingga 5x lipat dengan 450+ komponen Figma berbasis Variables & Auto-Layout, lengkap dengan varian dark/light mode, grafik analitik, tabel transaksi, dan modal checkout.',
      category: 'UI/UX Assets',
      priceIdr: 199000,
      originalPriceIdr: 450000,
      badge: null,
      gradient: 'from-pink-500/20 via-indigo-500/15 to-slate-900',
      icon: 'LayoutGrid',
      features: [
        '450+ Komponen & 60+ Layar Dashboard Siap Pakai',
        'Figma Variables (Color, Spacing, Radius Tokens)',
        'Termasuk Template Landing Page Agency & Web3',
        'Akses Instan File + Lisensi Komersial',
      ],
      metadata: {
        version: 'v2.0',
        licenseType: 'Unlimited Client Projects',
        fileSize: '42.0 MB',
        fileName: 'boyang-neo-cyber-figma-kit-v2.json',
        techStackProduct: ['Figma', 'Auto-Layout 5', 'Design Tokens'],
      },
      featured: 0,
      rating: 4.8,
      sales: 288,
    },
    {
      id: 'prd-ebook-playbook',
      slug: 'playbook-digital-agency-web3-era',
      type: 'PRODUCT',
      title: 'Playbook Membangun Digital Agency & Monetisasi Produk Digital',
      subtitle: 'Panduan operasional, template kontrak klien, kalkulator pricing jasa & strategi closing.',
      description:
        'E-book & toolkit praktis berisi SOP manajemen klien, template proposal jasa IT & desain, skema kontrak perjanjian kerja (MOU), serta strategi membangun pendapatan pasif dari kursus dan produk digital.',
      category: 'E-Book & SOP',
      priceIdr: 149000,
      originalPriceIdr: 300000,
      badge: 'Toolkit',
      gradient: 'from-amber-500/20 via-yellow-500/10 to-slate-900',
      icon: 'BookOpen',
      features: [
        'E-Book 160+ Halaman (PDF + Notion Template)',
        'Template Proposal, Kontrak Kerja & Invoice',
        'Framework Pricing Jasa Digital & Retainer',
        'Bonus Checklist Launch Produk Digital',
      ],
      metadata: {
        version: 'Edisi 2026',
        licenseType: 'Personal & Team Internal Use',
        fileSize: '14.5 MB',
        fileName: 'boyang-agency-playbook-2026.json',
        techStackProduct: ['PDF Guide', 'Notion', 'Spreadsheet Calculator'],
      },
      featured: 0,
      rating: 4.9,
      sales: 604,
    },
  ];

  const insertCatalog = db.prepare(
    `INSERT INTO catalog_items (
      id, slug, type, title, subtitle, description, category,
      price_idr, original_price_idr, badge, thumbnail_gradient, icon_name,
      features_json, metadata_json, is_featured, is_active, rating, sales_count,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`
  );

  for (const it of items) {
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

  // 5. Seed Realistic Completed & Pending Orders so User & Admin dashboards are rich immediately
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

  // Paid order includes 1 Course, 1 Digital Product, and 1 Service order
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

  // Enroll demo user in the course with 1 lesson completed
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

  // Add one pending verification Bank Transfer order for Admin to review immediately
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

  // Sample Consultation
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
