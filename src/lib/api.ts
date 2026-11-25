import type {
  CatalogItem,
  CatalogItemType,
  Consultation,
  CourseEnrollment,
  Order,
  OrderItem,
  PaymentMethod,
  PaymentSettings,
  PromoCode,
  ServiceBrief,
  ServiceOrderStatus,
  User,
} from '../types';
import { staticDemoApi } from './staticDemoApi';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export function isStaticMode(): boolean {
  if (API_BASE) return false;
  if (import.meta.env.VITE_STATIC_MODE === 'true') return true;
  if (
    typeof window !== 'undefined' &&
    window.location.hostname.endsWith('.github.io')
  ) {
    return true;
  }
  return false;
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    data = {};
  }

  if (!res.ok) {
    throw new Error(String(data.error || `Request gagal (${res.status})`));
  }
  return data as T;
}

export interface UserDashboardResponse {
  orders: Order[];
  enrollments: CourseEnrollment[];
  digitalProducts: Array<
    OrderItem & {
      invoiceNumber: string;
      paidAt: string | null;
      subtitle: string;
      category: string;
      productMetadata: Record<string, unknown>;
    }
  >;
  serviceProjects: Array<
    OrderItem & {
      invoiceNumber: string;
      paidAt: string | null;
    }
  >;
}

export interface AdminOverviewResponse {
  totalRevenueIdr: number;
  totalPaidOrders: number;
  pendingVerificationCount: number;
  awaitingReviewCount: number;
  totalUsers: number;
  totalCatalogItems: number;
  newConsultationsCount: number;
  revenueByMethod: Array<{ method: string; count: number; total: number }>;
  revenueByType: Array<{ type: string; count: number; total: number }>;
}

export interface VerificationResult {
  found: boolean;
  kind: 'COURSE_CERTIFICATE' | 'PRODUCT_LICENSE';
  code: string;
  status: string;
  title: string;
  category?: string;
  tierName?: string;
  ownerName: string;
  ownerWallet: string | null;
  progressPercent?: number;
  issuedAt: string | null;
  attestationHash?: string;
  standard: string;
}

const serverApi = {
  me: () => request<{ user: User | null }>('/api/auth/me'),
  login: (body: { email: string; password: string }) =>
    request<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  register: (body: { name: string; email: string; password: string; phone?: string }) =>
    request<{ user: User; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
  updateProfile: (body: { name?: string; phone?: string; newPassword?: string }) =>
    request<{ user: User }>('/api/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  web3Nonce: (walletAddress: string) =>
    request<{ nonce: string; message: string; walletAddress: string }>(
      '/api/auth/web3/nonce',
      { method: 'POST', body: JSON.stringify({ walletAddress }) }
    ),
  web3Verify: (body: {
    walletAddress: string;
    signature: string;
    nonce: string;
    message: string;
  }) =>
    request<{ user: User; mode: string }>('/api/auth/web3/verify', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  web3Unlink: () =>
    request<{ user: User }>('/api/auth/web3/unlink', { method: 'POST' }),

  getCatalog: (params?: {
    type?: CatalogItemType | 'ALL';
    category?: string;
    search?: string;
    includeInactive?: boolean;
  }) => {
    const q = new URLSearchParams();
    if (params?.type && params.type !== 'ALL') q.set('type', params.type);
    if (params?.category && params.category !== 'ALL') q.set('category', params.category);
    if (params?.search) q.set('search', params.search);
    if (params?.includeInactive) q.set('includeInactive', 'true');
    const qs = q.toString();
    return request<{ items: CatalogItem[] }>(`/api/catalog${qs ? `?${qs}` : ''}`);
  },
  getPaymentConfig: () => request<PaymentSettings>('/api/payment-config'),
  validatePromo: (code: string, subtotalIdr: number) =>
    request<{ promo: PromoCode; discountIdr: number }>('/api/promo/validate', {
      method: 'POST',
      body: JSON.stringify({ code, subtotalIdr }),
    }),
  submitConsultation: (body: {
    name: string;
    email: string;
    whatsapp: string;
    serviceInterest: string;
    budgetRange: string;
    message: string;
  }) =>
    request<{ ok: boolean; id: string; message: string }>('/api/consultations', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  verifyPublicCode: (code: string) =>
    request<VerificationResult>(`/api/verify/${encodeURIComponent(code)}`),

  createOrder: (body: {
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
  }) =>
    request<{ order: Order }>('/api/orders', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  uploadOrderProof: (orderId: string, formData: FormData) =>
    request<{ order: Order; message: string }>(`/api/orders/${orderId}/proof`, {
      method: 'POST',
      body: formData,
    }),
  sandboxConfirmOrder: (orderId: string) =>
    request<{ order: Order; message: string }>(
      `/api/orders/${orderId}/sandbox-confirm`,
      { method: 'POST' }
    ),

  getUserDashboard: () => request<UserDashboardResponse>('/api/user/dashboard'),
  toggleLesson: (courseId: string, lessonId: string) =>
    request<{ enrollment: CourseEnrollment }>(
      `/api/user/enrollments/${courseId}/toggle-lesson`,
      { method: 'POST', body: JSON.stringify({ lessonId }) }
    ),
  downloadProductManifest: (orderItemId: string) => {
    window.open(`${API_BASE}/api/user/downloads/${orderItemId}`, '_blank');
  },

  getAdminOverview: () => request<AdminOverviewResponse>('/api/admin/overview'),
  getAdminOrders: (params?: { status?: string; method?: string }) => {
    const q = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') q.set('status', params.status);
    if (params?.method && params.method !== 'ALL') q.set('method', params.method);
    const qs = q.toString();
    return request<{ orders: Order[] }>(`/api/admin/orders${qs ? `?${qs}` : ''}`);
  },
  verifyOrder: (orderId: string, action: 'APPROVE' | 'REJECT', adminNote?: string) =>
    request<{ order: Order }>(`/api/admin/orders/${orderId}/verify`, {
      method: 'POST',
      body: JSON.stringify({ action, adminNote }),
    }),
  updateServiceProgress: (
    itemId: string,
    body: {
      serviceStatus: ServiceOrderStatus;
      serviceDeliverableUrl?: string;
      updateMessage?: string;
    }
  ) =>
    request<{ ok: boolean }>(`/api/admin/order-items/${itemId}/service`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  createCatalogItem: (body: Partial<CatalogItem>) =>
    request<{ item: CatalogItem }>('/api/admin/catalog', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateCatalogItem: (id: string, body: Partial<CatalogItem>) =>
    request<{ item: CatalogItem }>(`/api/admin/catalog/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteCatalogItem: (id: string) =>
    request<{ ok: boolean }>(`/api/admin/catalog/${id}`, { method: 'DELETE' }),
  getAdminSettings: () => request<{ settings: PaymentSettings }>('/api/admin/settings'),
  updateAdminSettings: (settings: Partial<PaymentSettings>) =>
    request<{ settings: PaymentSettings }>('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),
  uploadQrisImage: (formData: FormData) =>
    request<{ url: string; settings: PaymentSettings }>(
      '/api/admin/settings/qris-image',
      { method: 'POST', body: formData }
    ),
  getAdminPromos: () => request<{ promos: PromoCode[] }>('/api/admin/promos'),
  createPromo: (body: {
    code: string;
    discountPercent: number;
    maxDiscountIdr?: number | null;
  }) =>
    request<{ promo: PromoCode }>('/api/admin/promos', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  togglePromo: (id: string, isActive: boolean) =>
    request<{ ok: boolean }>(`/api/admin/promos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    }),
  getAdminUsers: () => request<{ users: User[] }>('/api/admin/users'),
  updateUserRole: (id: string, role: 'USER' | 'ADMIN') =>
    request<{ user: User }>(`/api/admin/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),
  getAdminConsultations: () =>
    request<{ consultations: Consultation[] }>('/api/admin/consultations'),
  updateConsultationStatus: (id: string, status: Consultation['status']) =>
    request<{ ok: boolean }>(`/api/admin/consultations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};

export const api: typeof serverApi = isStaticMode() ? staticDemoApi : serverApi;
