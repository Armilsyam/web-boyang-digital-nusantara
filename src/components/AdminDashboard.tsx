import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Check,
  CreditCard,
  ExternalLink,
  Layers,
  MessageSquare,
  Plus,
  RefreshCw,
  Settings,
  Shield,
  Tag,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import type {
  CatalogItem,
  CatalogItemType,
  Consultation,
  Order,
  PaymentSettings,
  PromoCode,
  ServiceOrderStatus,
  User,
} from '../types';
import { api, type AdminOverviewResponse } from '../lib/api';
import {
  formatDateId,
  formatIdr,
  getOrderStatusMeta,
  shortenAddress,
} from '../lib/format';

interface AdminDashboardProps {
  currentUser: User;
  onCatalogChanged: () => void;
  onSettingsChanged: () => void;
}

type AdminTab = 'OVERVIEW' | 'ORDERS' | 'CATALOG' | 'PAYMENTS' | 'COMMUNITY';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  onCatalogChanged,
  onSettingsChanged,
}) => {
  const [tab, setTab] = useState<AdminTab>('OVERVIEW');
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);

  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');
  const [statusFeedback, setStatusFeedback] = useState('');

  // Service Progress Modal State
  const [editingServiceItem, setEditingServiceItem] = useState<{
    id: string;
    title: string;
    serviceStatus: ServiceOrderStatus;
    serviceDeliverableUrl: string;
    updateMessage: string;
  } | null>(null);

  // Catalog Create/Edit Modal State
  const [catalogModalOpen, setCatalogModalOpen] = useState(false);
  const [editingCatalogId, setEditingCatalogId] = useState<string | null>(null);
  const [catForm, setCatForm] = useState({
    type: 'SERVICE' as CatalogItemType,
    title: '',
    subtitle: '',
    description: '',
    category: '',
    priceIdr: 500000,
    originalPriceIdr: '',
    badge: '',
    featuresText: '',
    isFeatured: true,
    isActive: true,
  });

  // New Promo Form
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoPct, setNewPromoPct] = useState(15);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [ov, ord, cat, setRes, pr, us, con] = await Promise.all([
        api.getAdminOverview(),
        api.getAdminOrders({ status: orderStatusFilter }),
        api.getCatalog({ includeInactive: true }),
        api.getAdminSettings(),
        api.getAdminPromos(),
        api.getAdminUsers(),
        api.getAdminConsultations(),
      ]);
      setOverview(ov);
      setOrders(ord.orders);
      setCatalog(cat.items);
      setSettings(setRes.settings);
      setPromos(pr.promos);
      setUsers(us.users);
      setConsultations(con.consultations);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [orderStatusFilter]);

  const flashMsg = (msg: string) => {
    setStatusFeedback(msg);
    setTimeout(() => setStatusFeedback(''), 3500);
  };

  const handleVerifyOrder = async (
    orderId: string,
    action: 'APPROVE' | 'REJECT'
  ) => {
    const note =
      action === 'REJECT'
        ? window.prompt('Alasan penolakan (opsional):') || undefined
        : undefined;
    try {
      await api.verifyOrder(orderId, action, note);
      flashMsg(
        action === 'APPROVE'
          ? 'Pembayaran disetujui! Akses user otomatis diaktifkan.'
          : 'Order ditolak.'
      );
      await loadAll();
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const handleSaveServiceProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingServiceItem) return;
    try {
      await api.updateServiceProgress(editingServiceItem.id, {
        serviceStatus: editingServiceItem.serviceStatus,
        serviceDeliverableUrl: editingServiceItem.serviceDeliverableUrl,
        updateMessage: editingServiceItem.updateMessage,
      });
      setEditingServiceItem(null);
      flashMsg('Progres proyek jasa diperbarui.');
      await loadAll();
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const openCreateCatalog = () => {
    setEditingCatalogId(null);
    setCatForm({
      type: 'SERVICE',
      title: '',
      subtitle: '',
      description: '',
      category: 'Web & SaaS Engineering',
      priceIdr: 1500000,
      originalPriceIdr: '',
      badge: 'Baru',
      featuresText: 'Desain Modern\nDukungan Teknis\nSiap Hosting',
      isFeatured: false,
      isActive: true,
    });
    setCatalogModalOpen(true);
  };

  const openEditCatalog = (item: CatalogItem) => {
    setEditingCatalogId(item.id);
    setCatForm({
      type: item.type,
      title: item.title,
      subtitle: item.subtitle,
      description: item.description,
      category: item.category,
      priceIdr: item.priceIdr,
      originalPriceIdr: item.originalPriceIdr ? String(item.originalPriceIdr) : '',
      badge: item.badge || '',
      featuresText: item.features.join('\n'),
      isFeatured: item.isFeatured,
      isActive: item.isActive,
    });
    setCatalogModalOpen(true);
  };

  const handleSaveCatalog = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      type: catForm.type,
      title: catForm.title,
      subtitle: catForm.subtitle,
      description: catForm.description,
      category: catForm.category,
      priceIdr: Number(catForm.priceIdr),
      originalPriceIdr: catForm.originalPriceIdr
        ? Number(catForm.originalPriceIdr)
        : null,
      badge: catForm.badge || null,
      features: catForm.featuresText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      isFeatured: catForm.isFeatured,
      isActive: catForm.isActive,
    };

    try {
      if (editingCatalogId) {
        await api.updateCatalogItem(editingCatalogId, payload);
        flashMsg('Item katalog berhasil diperbarui.');
      } else {
        await api.createCatalogItem(payload);
        flashMsg('Item katalog baru berhasil ditambahkan.');
      }
      setCatalogModalOpen(false);
      await loadAll();
      onCatalogChanged();
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const handleDeleteCatalog = async (id: string) => {
    if (!window.confirm('Hapus item ini dari katalog?')) return;
    await api.deleteCatalogItem(id);
    flashMsg('Item berhasil dihapus.');
    await loadAll();
    onCatalogChanged();
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      const res = await api.updateAdminSettings(settings);
      setSettings(res.settings);
      onSettingsChanged();
      flashMsg('Pengaturan pembayaran & Web3 berhasil disimpan.');
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const handleUploadQrisImage = async (file: File) => {
    const fd = new FormData();
    fd.append('image', file);
    const res = await api.uploadQrisImage(fd);
    setSettings(res.settings);
    onSettingsChanged();
    flashMsg('Gambar QRIS kustom berhasil diunggah!');
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromoCode.trim()) return;
    try {
      await api.createPromo({
        code: newPromoCode.trim().toUpperCase(),
        discountPercent: Number(newPromoPct),
      });
      setNewPromoCode('');
      flashMsg('Kode promo baru dibuat.');
      await loadAll();
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const navTabs: Array<{
    id: AdminTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }> = [
    { id: 'OVERVIEW', label: 'Analitik', icon: BarChart3 },
    {
      id: 'ORDERS',
      label: 'Verifikasi & Order',
      icon: CreditCard,
      badge: overview?.awaitingReviewCount || 0,
    },
    { id: 'CATALOG', label: 'Kelola Katalog', icon: Layers },
    { id: 'PAYMENTS', label: 'QRIS, Bank & Web3', icon: Settings },
    {
      id: 'COMMUNITY',
      label: 'Promo, Leads & User',
      icon: Users,
      badge: overview?.newConsultationsCount || 0,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-6">
      {/* Admin Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-amber-500/25 bg-[#0b101e] p-6">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-400/30 text-amber-300">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400">
              ADMIN COMMAND CENTER · BOYANG DIGITAL
            </span>
            <h1 className="font-display text-2xl font-bold text-white">
              Manajemen Layanan, Pembayaran & Web3
            </h1>
          </div>
        </div>

        <button
          onClick={loadAll}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white hover:bg-white/[0.08] cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Sinkronkan Data
        </button>
      </div>

      {statusFeedback && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-xs font-semibold text-emerald-200">
          {statusFeedback}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2">
        {navTabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition cursor-pointer ${
                active
                  ? 'border-amber-400/60 bg-amber-500/15 text-amber-200'
                  : 'border-white/10 bg-[#0b101e] text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{t.label}</span>
              {t.badge !== undefined && t.badge > 0 && (
                <span className="rounded-full bg-amber-400 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-950">
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading && !overview ? (
        <div className="h-64 animate-pulse rounded-3xl border border-white/10 bg-[#0b101e]" />
      ) : (
        <>
          {/* OVERVIEW */}
          {tab === 'OVERVIEW' && overview && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-[#0b101e] p-5">
                  <div className="text-xs text-slate-400">Total Pendapatan Lunas</div>
                  <div className="mt-2 font-mono text-2xl font-bold text-emerald-300">
                    {formatIdr(overview.totalRevenueIdr)}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    {overview.totalPaidOrders} transaksi terverifikasi
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#0b101e] p-5">
                  <div className="text-xs text-slate-400">Butuh Verifikasi Bukti</div>
                  <div className="mt-2 font-mono text-2xl font-bold text-amber-300">
                    {overview.awaitingReviewCount}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    {overview.pendingVerificationCount} total belum lunas
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#0b101e] p-5">
                  <div className="text-xs text-slate-400">Total Item Katalog</div>
                  <div className="mt-2 font-mono text-2xl font-bold text-cyan-300">
                    {overview.totalCatalogItems}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    Jasa, Kursus & Produk Digital
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#0b101e] p-5">
                  <div className="text-xs text-slate-400">Member Terdaftar</div>
                  <div className="mt-2 font-mono text-2xl font-bold text-violet-300">
                    {overview.totalUsers}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    {overview.newConsultationsCount} konsultasi masuk baru
                  </div>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-[#0b101e] p-5 space-y-3">
                  <h3 className="font-display text-base font-bold text-white">
                    Performa Metode Pembayaran
                  </h3>
                  {overview.revenueByMethod.length === 0 ? (
                    <p className="text-xs text-slate-500">Belum ada transaksi lunas.</p>
                  ) : (
                    overview.revenueByMethod.map((row) => (
                      <div key={row.method} className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="font-medium text-slate-300">
                            {row.method} ({row.count}x)
                          </span>
                          <span className="font-mono text-cyan-300">
                            {formatIdr(row.total)}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-cyan-400"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.round(
                                  (row.total / Math.max(1, overview.totalRevenueIdr)) *
                                    100
                                )
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0b101e] p-5 space-y-3">
                  <h3 className="font-display text-base font-bold text-white">
                    Omzet per Kategori Ekosistem
                  </h3>
                  {overview.revenueByType.length === 0 ? (
                    <p className="text-xs text-slate-500">Belum ada penjualan.</p>
                  ) : (
                    overview.revenueByType.map((row) => (
                      <div key={row.type} className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="font-medium text-slate-300">
                            {row.type} ({row.count} item)
                          </span>
                          <span className="font-mono text-emerald-300">
                            {formatIdr(row.total)}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-emerald-400"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.round(
                                  (row.total / Math.max(1, overview.totalRevenueIdr)) *
                                    100
                                )
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ORDERS VERIFICATION & SERVICE TRACKING */}
          {tab === 'ORDERS' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {[
                  'ALL',
                  'AWAITING_VERIFICATION',
                  'PENDING_PAYMENT',
                  'PAID',
                  'REJECTED',
                ].map((st) => (
                  <button
                    key={st}
                    onClick={() => setOrderStatusFilter(st)}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                      orderStatusFilter === st
                        ? 'border-cyan-400 bg-cyan-500/15 text-cyan-200'
                        : 'border-white/10 bg-[#0b101e] text-slate-400'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {orders.map((ord) => {
                  const st = getOrderStatusMeta(ord.status);
                  return (
                    <div
                      key={ord.id}
                      className="rounded-2xl border border-white/10 bg-[#0b101e] p-5 space-y-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-sm font-bold text-white">
                              {ord.invoiceNumber}
                            </span>
                            <span
                              className={`rounded-lg border px-2 py-0.5 text-[11px] font-semibold ${st.badgeClass}`}
                            >
                              {st.label}
                            </span>
                            <span className="rounded bg-white/10 px-2 py-0.5 text-[11px] font-mono text-slate-300">
                              {ord.paymentMethod} · {ord.paymentChannel}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-400">
                            Pelanggan: <strong className="text-slate-200">{ord.customerName}</strong> ({ord.customerEmail} · {ord.customerPhone}) · {formatDateId(ord.createdAt)}
                          </p>
                          {(ord.paymentSenderName ||
                            ord.paymentReference ||
                            ord.web3TxHash) && (
                            <p className="mt-1 text-xs text-cyan-300 font-mono">
                              Pengirim: {ord.paymentSenderName || '-'} · Ref/Tx:{' '}
                              {ord.web3TxHash || ord.paymentReference || '-'}
                            </p>
                          )}
                          {ord.paymentProofUrl && (
                            <a
                              href={ord.paymentProofUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-amber-300 hover:underline"
                            >
                              <ExternalLink className="h-3.5 w-3.5" /> Buka Bukti Transfer
                            </a>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <div className="font-mono text-lg font-bold text-white">
                            {formatIdr(ord.totalIdr)}
                          </div>
                          {ord.status !== 'PAID' && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleVerifyOrder(ord.id, 'APPROVE')}
                                className="inline-flex items-center gap-1 rounded-xl bg-emerald-400 px-3 py-1.5 text-xs font-bold text-slate-950 hover:brightness-110 cursor-pointer"
                              >
                                <Check className="h-3.5 w-3.5" /> Setujui & Aktifkan
                              </button>
                              <button
                                onClick={() => handleVerifyOrder(ord.id, 'REJECT')}
                                className="inline-flex items-center gap-1 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 cursor-pointer"
                              >
                                <X className="h-3.5 w-3.5" /> Tolak
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Order Items + Service Management */}
                      <div className="border-t border-white/10 pt-3 space-y-2">
                        {ord.items.map((it) => (
                          <div
                            key={it.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-950/60 px-3.5 py-2.5 text-xs"
                          >
                            <div>
                              <span className="font-semibold text-white">
                                {it.quantity}x {it.itemTitle}
                              </span>
                              {it.tierName && (
                                <span className="ml-2 text-slate-400">
                                  ({it.tierName})
                                </span>
                              )}
                              {it.brief && (
                                <div className="text-[11px] text-cyan-300 mt-0.5">
                                  Brief: {it.brief.projectName} — {it.brief.notes}
                                </div>
                              )}
                            </div>

                            {it.itemType === 'SERVICE' && ord.status === 'PAID' && (
                              <button
                                onClick={() =>
                                  setEditingServiceItem({
                                    id: it.id,
                                    title: it.brief?.projectName || it.itemTitle,
                                    serviceStatus: it.serviceStatus,
                                    serviceDeliverableUrl:
                                      it.serviceDeliverableUrl || '',
                                    updateMessage: '',
                                  })
                                }
                                className="rounded-lg border border-cyan-400/40 bg-cyan-500/15 px-3 py-1.5 text-[11px] font-semibold text-cyan-200 cursor-pointer"
                              >
                                Update Progres ({it.serviceStatus})
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CATALOG CRUD */}
          {tab === 'CATALOG' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="font-display text-lg font-bold text-white">
                  Daftar Layanan, Kursus & Produk Digital ({catalog.length})
                </h2>
                <button
                  onClick={openCreateCatalog}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950 hover:brightness-110 cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> Tambah Item Baru
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {catalog.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-white/10 bg-[#0b101e] p-4 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                          {item.type}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {item.category}
                        </span>
                        {!item.isActive && (
                          <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] text-rose-300">
                            Nonaktif
                          </span>
                        )}
                      </div>
                      <h3 className="font-display text-sm font-bold text-white truncate">
                        {item.title}
                      </h3>
                      <div className="font-mono text-xs text-emerald-300 font-bold">
                        {formatIdr(item.priceIdr)} · {item.salesCount} terjual
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => openEditCatalog(item)}
                        className="rounded-lg border border-white/15 bg-white/[0.05] px-3 py-1.5 text-xs text-white hover:bg-white/10 cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCatalog(item.id)}
                        className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-1.5 text-rose-300 hover:bg-rose-500/20 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PAYMENT & WEB3 SETTINGS */}
          {tab === 'PAYMENTS' && settings && (
            <form onSubmit={handleSaveSettings} className="space-y-6">
              {/* Sandbox + QRIS */}
              <div className="rounded-2xl border border-white/10 bg-[#0b101e] p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-display text-lg font-bold text-white">
                    Konfigurasi QRIS & Mode Sandbox
                  </h3>
                  <label className="inline-flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.sandboxMode}
                      onChange={(e) =>
                        setSettings({ ...settings, sandboxMode: e.target.checked })
                      }
                      className="rounded"
                    />
                    Aktifkan Mode Sandbox (Simulasi Bayar Instan)
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Nama Merchant QRIS
                    </label>
                    <input
                      type="text"
                      value={settings.qris.merchantName}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          qris: { ...settings.qris, merchantName: e.target.value },
                        })
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Kota Merchant
                    </label>
                    <input
                      type="text"
                      value={settings.qris.merchantCity}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          qris: { ...settings.qris, merchantCity: e.target.value },
                        })
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      NMID Merchant
                    </label>
                    <input
                      type="text"
                      value={settings.qris.nmid}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          qris: { ...settings.qris, nmid: e.target.value },
                        })
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 font-mono text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Payload QRIS Statis Asli (Opsional — jika diisi, sistem otomatis
                    menyisipkan nominal dinamis ke QRIS Anda)
                  </label>
                  <input
                    type="text"
                    value={settings.qris.staticPayload}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        qris: { ...settings.qris, staticPayload: e.target.value },
                      })
                    }
                    placeholder="00020101021126..."
                    className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 font-mono text-xs text-white"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white hover:bg-white/10">
                    <Upload className="h-4 w-4 text-cyan-400" />
                    Upload Gambar QRIS Resmi (Opsional)
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUploadQrisImage(f);
                      }}
                    />
                  </label>
                  {settings.qris.customImageUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        setSettings({
                          ...settings,
                          qris: { ...settings.qris, customImageUrl: '' },
                        })
                      }
                      className="text-xs text-rose-300 hover:underline cursor-pointer"
                    >
                      Hapus gambar kustom (pakai QRIS Dinamis)
                    </button>
                  )}
                </div>
              </div>

              {/* Bank Accounts */}
              <div className="rounded-2xl border border-white/10 bg-[#0b101e] p-6 space-y-4">
                <h3 className="font-display text-lg font-bold text-white">
                  Rekening Transfer Bank
                </h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {settings.banks.map((b, idx) => (
                    <div
                      key={b.id}
                      className="rounded-xl border border-white/10 bg-slate-950/60 p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <strong className="text-xs text-cyan-300">{b.bankName}</strong>
                        <label className="flex items-center gap-1.5 text-[11px] text-slate-300">
                          <input
                            type="checkbox"
                            checked={b.isActive}
                            onChange={(e) => {
                              const next = [...settings.banks];
                              next[idx] = { ...b, isActive: e.target.checked };
                              setSettings({ ...settings, banks: next });
                            }}
                          />
                          Aktif
                        </label>
                      </div>
                      <input
                        type="text"
                        value={b.accountNumber}
                        onChange={(e) => {
                          const next = [...settings.banks];
                          next[idx] = { ...b, accountNumber: e.target.value };
                          setSettings({ ...settings, banks: next });
                        }}
                        className="w-full rounded-lg border border-white/10 bg-[#0b101e] px-3 py-1.5 font-mono text-xs text-white"
                      />
                      <input
                        type="text"
                        value={b.accountHolder}
                        onChange={(e) => {
                          const next = [...settings.banks];
                          next[idx] = { ...b, accountHolder: e.target.value };
                          setSettings({ ...settings, banks: next });
                        }}
                        className="w-full rounded-lg border border-white/10 bg-[#0b101e] px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* E-Wallets & Web3 Treasury */}
              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-[#0b101e] p-6 space-y-3">
                  <h3 className="font-display text-base font-bold text-white">
                    E-Wallet Tujuan
                  </h3>
                  {settings.ewallets.map((w, idx) => (
                    <div
                      key={w.id}
                      className="rounded-xl border border-white/10 bg-slate-950/60 p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <strong className="text-white">{w.provider}</strong>
                        <label className="flex items-center gap-1.5 text-[11px] text-slate-300">
                          <input
                            type="checkbox"
                            checked={w.isActive}
                            onChange={(e) => {
                              const next = [...settings.ewallets];
                              next[idx] = { ...w, isActive: e.target.checked };
                              setSettings({ ...settings, ewallets: next });
                            }}
                          />
                          Aktif
                        </label>
                      </div>
                      <input
                        type="text"
                        value={w.accountNumber}
                        onChange={(e) => {
                          const next = [...settings.ewallets];
                          next[idx] = { ...w, accountNumber: e.target.value };
                          setSettings({ ...settings, ewallets: next });
                        }}
                        className="w-full rounded-lg border border-white/10 bg-[#0b101e] px-3 py-1.5 font-mono text-xs text-white"
                      />
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-violet-500/25 bg-[#0b101e] p-6 space-y-4">
                  <h3 className="font-display text-base font-bold text-white">
                    Web3 Treasury & Blockchain
                  </h3>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Alamat Treasury EVM (ETH / Base / Polygon)
                    </label>
                    <input
                      type="text"
                      value={settings.web3.treasuryAddress}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          web3: { ...settings.web3, treasuryAddress: e.target.value },
                        })
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 font-mono text-xs text-violet-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Domain ENS Brand
                    </label>
                    <input
                      type="text"
                      value={settings.web3.ensDomain}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          web3: { ...settings.web3, ensDomain: e.target.value },
                        })
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 font-mono text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-500 px-6 py-3 text-sm font-bold text-slate-950 hover:brightness-110 cursor-pointer"
              >
                Simpan Seluruh Pengaturan Pembayaran & Web3
              </button>
            </form>
          )}

          {/* PROMOS, LEADS & USERS */}
          {tab === 'COMMUNITY' && (
            <div className="space-y-6">
              {/* Promos */}
              <div className="rounded-2xl border border-white/10 bg-[#0b101e] p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-cyan-400" />
                  <h3 className="font-display text-base font-bold text-white">
                    Kode Promo & Diskon
                  </h3>
                </div>
                <form onSubmit={handleCreatePromo} className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={newPromoCode}
                    onChange={(e) => setNewPromoCode(e.target.value.toUpperCase())}
                    placeholder="KODEPROMO"
                    className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 font-mono text-xs text-white"
                  />
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={newPromoPct}
                    onChange={(e) => setNewPromoPct(Number(e.target.value))}
                    className="w-24 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 font-mono text-xs text-white"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950 cursor-pointer"
                  >
                    + Tambah Promo (%)
                  </button>
                </form>

                <div className="grid gap-2 sm:grid-cols-3">
                  {promos.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/60 px-3.5 py-2.5 text-xs"
                    >
                      <div>
                        <span className="font-mono font-bold text-cyan-300">
                          {p.code}
                        </span>
                        <span className="ml-2 text-slate-400">
                          -{p.discountPercent}% ({p.usageCount}x)
                        </span>
                      </div>
                      <button
                        onClick={async () => {
                          await api.togglePromo(p.id, !p.isActive);
                          await loadAll();
                        }}
                        className={`rounded px-2 py-0.5 text-[10px] font-bold cursor-pointer ${
                          p.isActive
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-slate-700 text-slate-400'
                        }`}
                      >
                        {p.isActive ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Consultations */}
              <div className="rounded-2xl border border-white/10 bg-[#0b101e] p-6 space-y-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-emerald-400" />
                  <h3 className="font-display text-base font-bold text-white">
                    Permintaan Konsultasi Masuk ({consultations.length})
                  </h3>
                </div>
                {consultations.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-xl border border-white/10 bg-slate-950/60 p-4 flex flex-wrap items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 max-w-2xl">
                      <div className="font-bold text-white">
                        {c.name} ·{' '}
                        <span className="text-cyan-300">{c.serviceInterest}</span> ({c.budgetRange})
                      </div>
                      <div className="text-slate-400">
                        WA: {c.whatsapp} · Email: {c.email}
                      </div>
                      <p className="text-slate-200">{c.message}</p>
                    </div>
                    <select
                      value={c.status}
                      onChange={async (e) => {
                        await api.updateConsultationStatus(
                          c.id,
                          e.target.value as Consultation['status']
                        );
                        await loadAll();
                      }}
                      className="rounded-lg border border-white/15 bg-[#0b101e] px-2.5 py-1.5 text-xs text-white"
                    >
                      <option value="NEW">NEW</option>
                      <option value="CONTACTED">CONTACTED</option>
                      <option value="CLOSED">CLOSED</option>
                    </select>
                  </div>
                ))}
              </div>

              {/* Users */}
              <div className="rounded-2xl border border-white/10 bg-[#0b101e] p-6 space-y-3">
                <h3 className="font-display text-base font-bold text-white">
                  Pengguna Terdaftar ({users.length})
                </h3>
                <div className="space-y-2">
                  {users.map((u) => (
                    <div
                      key={u.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-950/60 px-4 py-2.5 text-xs"
                    >
                      <div>
                        <span className="font-bold text-white">{u.name}</span>
                        <span className="ml-2 text-slate-400">{u.email}</span>
                        {u.walletAddress && (
                          <span className="ml-2 font-mono text-[11px] text-violet-300">
                            {shortenAddress(u.walletAddress)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            u.role === 'ADMIN'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-cyan-500/20 text-cyan-300'
                          }`}
                        >
                          {u.role}
                        </span>
                        {u.id !== currentUser.id && (
                          <button
                            onClick={async () => {
                              await api.updateUserRole(
                                u.id,
                                u.role === 'ADMIN' ? 'USER' : 'ADMIN'
                              );
                              await loadAll();
                            }}
                            className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-white/10 cursor-pointer"
                          >
                            Jadikan {u.role === 'ADMIN' ? 'USER' : 'ADMIN'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Service Progress Modal */}
      {editingServiceItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSaveServiceProgress}
            className="w-full max-w-md rounded-3xl border border-white/15 bg-[#090d1a] p-6 space-y-4"
          >
            <h3 className="font-display text-lg font-bold text-white">
              Update Progres Proyek: {editingServiceItem.title}
            </h3>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Tahapan Proyek
              </label>
              <select
                value={editingServiceItem.serviceStatus}
                onChange={(e) =>
                  setEditingServiceItem({
                    ...editingServiceItem,
                    serviceStatus: e.target.value as ServiceOrderStatus,
                  })
                }
                className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white"
              >
                <option value="QUEUED">QUEUED (Review Brief)</option>
                <option value="IN_PROGRESS">IN_PROGRESS (Dalam Pengerjaan)</option>
                <option value="REVIEW">REVIEW (QA & Revisi Klien)</option>
                <option value="COMPLETED">COMPLETED (Selesai)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                URL Staging / Hasil Deliverable
              </label>
              <input
                type="text"
                value={editingServiceItem.serviceDeliverableUrl}
                onChange={(e) =>
                  setEditingServiceItem({
                    ...editingServiceItem,
                    serviceDeliverableUrl: e.target.value,
                  })
                }
                placeholder="https://staging.boyangdigital.id/..."
                className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Pesan Update untuk Klien
              </label>
              <textarea
                rows={3}
                value={editingServiceItem.updateMessage}
                onChange={(e) =>
                  setEditingServiceItem({
                    ...editingServiceItem,
                    updateMessage: e.target.value,
                  })
                }
                placeholder="Tulis update milestone terbaru..."
                className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingServiceItem(null)}
                className="rounded-xl border border-white/15 px-4 py-2 text-xs text-slate-300 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="rounded-xl bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950 cursor-pointer"
              >
                Simpan Update
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Catalog Create/Edit Modal */}
      {catalogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSaveCatalog}
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-white/15 bg-[#090d1a] p-6 space-y-3.5"
          >
            <h3 className="font-display text-lg font-bold text-white">
              {editingCatalogId ? 'Edit Item Katalog' : 'Tambah Item Katalog Baru'}
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Tipe</label>
                <select
                  value={catForm.type}
                  onChange={(e) =>
                    setCatForm({ ...catForm, type: e.target.value as CatalogItemType })
                  }
                  disabled={Boolean(editingCatalogId)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white"
                >
                  <option value="SERVICE">SERVICE (Layanan Jasa)</option>
                  <option value="COURSE">COURSE (Kursus)</option>
                  <option value="PRODUCT">PRODUCT (Produk Digital)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Kategori</label>
                <input
                  type="text"
                  required
                  value={catForm.category}
                  onChange={(e) => setCatForm({ ...catForm, category: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Judul</label>
              <input
                type="text"
                required
                value={catForm.title}
                onChange={(e) => setCatForm({ ...catForm, title: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Subjudul Singkat</label>
              <input
                type="text"
                required
                value={catForm.subtitle}
                onChange={(e) => setCatForm({ ...catForm, subtitle: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Deskripsi Lengkap</label>
              <textarea
                rows={3}
                value={catForm.description}
                onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Harga (IDR)</label>
                <input
                  type="number"
                  required
                  value={catForm.priceIdr}
                  onChange={(e) =>
                    setCatForm({ ...catForm, priceIdr: Number(e.target.value) })
                  }
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 font-mono text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Harga Coret</label>
                <input
                  type="number"
                  value={catForm.originalPriceIdr}
                  onChange={(e) =>
                    setCatForm({ ...catForm, originalPriceIdr: e.target.value })
                  }
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 font-mono text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Badge</label>
                <input
                  type="text"
                  value={catForm.badge}
                  onChange={(e) => setCatForm({ ...catForm, badge: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Daftar Fitur (1 per baris)
              </label>
              <textarea
                rows={3}
                value={catForm.featuresText}
                onChange={(e) => setCatForm({ ...catForm, featuresText: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="flex gap-4 text-xs text-slate-300">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={catForm.isFeatured}
                  onChange={(e) =>
                    setCatForm({ ...catForm, isFeatured: e.target.checked })
                  }
                />
                Featured
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={catForm.isActive}
                  onChange={(e) =>
                    setCatForm({ ...catForm, isActive: e.target.checked })
                  }
                />
                Aktif Ditampilkan
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCatalogModalOpen(false)}
                className="rounded-xl border border-white/15 px-4 py-2 text-xs text-slate-300 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="rounded-xl bg-cyan-400 px-5 py-2 text-xs font-bold text-slate-950 cursor-pointer"
              >
                Simpan Katalog
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
