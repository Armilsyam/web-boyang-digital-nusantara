export type UserRole = 'USER' | 'ADMIN';
export type CatalogItemType = 'SERVICE' | 'COURSE' | 'PRODUCT';
export type PaymentMethod = 'QRIS' | 'BANK_TRANSFER' | 'EWALLET' | 'WEB3_CRYPTO';
export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'AWAITING_VERIFICATION'
  | 'PAID'
  | 'REJECTED'
  | 'CANCELLED';

export type ServiceOrderStatus = 'QUEUED' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string | null;
  walletAddress: string | null;
  ensName: string | null;
  createdAt: string;
}

export interface ServiceTier {
  name: string;
  priceIdr: number;
  duration: string;
  deliverables: string[];
  popular?: boolean;
}

export interface CourseLesson {
  id: string;
  title: string;
  duration: string;
  isPreview?: boolean;
  summary: string;
  content: string;
  codeSnippet?: string;
}

export interface CourseModule {
  id: string;
  title: string;
  lessons: CourseLesson[];
}

export interface CatalogMetadata {
  // Service metadata
  tiers?: ServiceTier[];
  techStack?: string[];
  estimatedTimeline?: string;
  // Course metadata
  instructor?: string;
  instructorRole?: string;
  level?: 'Pemula' | 'Menengah' | 'Mahir' | 'Semua Level';
  totalDuration?: string;
  modules?: CourseModule[];
  certificateWeb3Ready?: boolean;
  // Product metadata
  version?: string;
  licenseType?: string;
  fileSize?: string;
  fileName?: string;
  techStackProduct?: string[];
  demoUrl?: string;
}

export interface CatalogItem {
  id: string;
  slug: string;
  type: CatalogItemType;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  priceIdr: number;
  originalPriceIdr: number | null;
  badge: string | null;
  thumbnailGradient: string;
  iconName: string;
  features: string[];
  metadata: CatalogMetadata;
  isFeatured: boolean;
  isActive: boolean;
  rating: number;
  salesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BankAccountSetting {
  id: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  isActive: boolean;
}

export interface EWalletSetting {
  id: string;
  provider: string;
  accountNumber: string;
  accountName: string;
  instructions: string;
  isActive: boolean;
}

export interface QrisSetting {
  merchantName: string;
  merchantCity: string;
  nmid: string;
  staticPayload: string;
  customImageUrl: string;
  isActive: boolean;
}

export interface Web3ChainSetting {
  chainId: number;
  name: string;
  symbol: string;
  explorerUrl: string;
  idrPerToken: number;
  acceptedTokens: string[];
  isActive: boolean;
}

export interface Web3Setting {
  treasuryAddress: string;
  ensDomain: string;
  enableWalletLogin: boolean;
  enableCryptoPayment: boolean;
  enableWeb3Certificates: boolean;
  chains: Web3ChainSetting[];
}

export interface PaymentSettings {
  qris: QrisSetting;
  banks: BankAccountSetting[];
  ewallets: EWalletSetting[];
  web3: Web3Setting;
  sandboxMode: boolean;
}

export interface ServiceBrief {
  projectName: string;
  companyOrBrand?: string;
  targetDeadline?: string;
  referenceUrl?: string;
  notes: string;
}

export interface ServiceUpdate {
  id: string;
  status: ServiceOrderStatus;
  message: string;
  createdAt: string;
  author: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  catalogItemId: string;
  itemType: CatalogItemType;
  itemTitle: string;
  tierName: string | null;
  unitPriceIdr: number;
  quantity: number;
  brief: ServiceBrief | null;
  licenseKey: string | null;
  serviceStatus: ServiceOrderStatus;
  serviceDeliverableUrl: string | null;
  serviceUpdates: ServiceUpdate[];
}

export interface Order {
  id: string;
  invoiceNumber: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  paymentMethod: PaymentMethod;
  paymentChannel: string;
  subtotalIdr: number;
  discountIdr: number;
  uniqueCode: number;
  totalIdr: number;
  promoCode: string | null;
  status: OrderStatus;
  qrisPayload: string | null;
  paymentProofUrl: string | null;
  paymentSenderName: string | null;
  paymentReference: string | null;
  web3TxHash: string | null;
  web3Chain: string | null;
  web3FromAddress: string | null;
  adminNote: string | null;
  expiresAt: string;
  paidAt: string | null;
  createdAt: string;
  items: OrderItem[];
}

export interface CourseEnrollment {
  id: string;
  userId: string;
  catalogItemId: string;
  orderId: string;
  completedLessons: string[];
  progressPercent: number;
  certificateCode: string | null;
  certificateHash: string | null;
  issuedAt: string | null;
  createdAt: string;
  course?: CatalogItem;
}

export interface PromoCode {
  id: string;
  code: string;
  discountPercent: number;
  maxDiscountIdr: number | null;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
}

export interface Consultation {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  serviceInterest: string;
  budgetRange: string;
  message: string;
  status: 'NEW' | 'CONTACTED' | 'CLOSED';
  createdAt: string;
}

export interface CartEntry {
  catalogItem: CatalogItem;
  quantity: number;
  tierName?: string;
  unitPriceIdr: number;
  brief?: ServiceBrief;
}
