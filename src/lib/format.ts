import type { OrderStatus, ServiceOrderStatus } from '../types';

export function formatIdr(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export function formatDateId(iso: string | null | undefined): string {
  if (!iso) return '-';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function shortenAddress(addr: string | null | undefined): string {
  if (!addr) return '';
  if (addr.length < 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function getOrderStatusMeta(status: OrderStatus): {
  label: string;
  badgeClass: string;
} {
  switch (status) {
    case 'PAID':
      return {
        label: 'Lunas / Aktif',
        badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      };
    case 'AWAITING_VERIFICATION':
      return {
        label: 'Menunggu Verifikasi Admin',
        badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      };
    case 'PENDING_PAYMENT':
      return {
        label: 'Menunggu Pembayaran',
        badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
      };
    case 'REJECTED':
      return {
        label: 'Ditolak',
        badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
      };
    case 'CANCELLED':
      return {
        label: 'Dibatalkan',
        badgeClass: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
      };
  }
}

export function getServiceStatusMeta(status: ServiceOrderStatus): {
  label: string;
  step: number;
  badgeClass: string;
} {
  switch (status) {
    case 'QUEUED':
      return {
        label: 'Review Brief',
        step: 1,
        badgeClass: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
      };
    case 'IN_PROGRESS':
      return {
        label: 'Dalam Pengerjaan',
        step: 2,
        badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
      };
    case 'REVIEW':
      return {
        label: 'QA & Revisi Klien',
        step: 3,
        badgeClass: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
      };
    case 'COMPLETED':
      return {
        label: 'Selesai & Diserahkan',
        step: 4,
        badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      };
  }
}
