import React, { useEffect, useState } from 'react';
import {
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileCode2,
  PlayCircle,
  ShoppingBag,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';
import type { CartEntry, CatalogItem, ServiceBrief } from '../types';
import { formatIdr } from '../lib/format';

interface ItemDetailModalProps {
  item: CatalogItem | null;
  onClose: () => void;
  onAddToCart: (entry: CartEntry) => void;
  onBuyNow: (entry: CartEntry) => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  item,
  onClose,
  onAddToCart,
  onBuyNow,
}) => {
  const [selectedTierIndex, setSelectedTierIndex] = useState(0);
  const [openModuleId, setOpenModuleId] = useState<string | null>(null);
  const [previewLessonId, setPreviewLessonId] = useState<string | null>(null);

  const [brief, setBrief] = useState<ServiceBrief>({
    projectName: '',
    companyOrBrand: '',
    targetDeadline: '',
    referenceUrl: '',
    notes: '',
  });
  const [briefError, setBriefError] = useState('');

  useEffect(() => {
    if (!item) return;
    const popularIdx =
      item.metadata.tiers?.findIndex((t) => t.popular) ?? -1;
    setSelectedTierIndex(popularIdx >= 0 ? popularIdx : 0);
    setOpenModuleId(item.metadata.modules?.[0]?.id || null);
    setPreviewLessonId(null);
    setBriefError('');
  }, [item]);

  if (!item) return null;

  const selectedTier =
    item.type === 'SERVICE' && item.metadata.tiers?.length
      ? item.metadata.tiers[selectedTierIndex] || item.metadata.tiers[0]
      : null;

  const activePrice = selectedTier ? selectedTier.priceIdr : item.priceIdr;

  const buildCartEntry = (): CartEntry | null => {
    if (item.type === 'SERVICE') {
      if (!brief.projectName.trim() || !brief.notes.trim()) {
        setBriefError('Mohon isi Nama Proyek dan Deskripsi Kebutuhan agar tim dapat meninjau brief Anda.');
        return null;
      }
    }
    setBriefError('');
    return {
      catalogItem: item,
      quantity: 1,
      tierName: selectedTier?.name || item.metadata.licenseType,
      unitPriceIdr: activePrice,
      brief: item.type === 'SERVICE' ? { ...brief } : undefined,
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-[#090d1a] shadow-2xl">
        {/* Header */}
        <div
          className={`flex items-start justify-between gap-4 border-b border-white/10 bg-gradient-to-r ${item.thumbnailGradient} p-6`}
        >
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-slate-950/60 border border-white/15 px-2.5 py-1 text-[11px] font-semibold text-cyan-300">
                {item.type === 'SERVICE'
                  ? 'LAYANAN JASA DIGITAL'
                  : item.type === 'COURSE'
                  ? 'KURSUS ACADEMY'
                  : 'PRODUK DIGITAL'}
              </span>
              <span className="text-xs text-slate-300">{item.category}</span>
            </div>
            <h2 className="mt-2 font-display text-xl sm:text-2xl font-bold text-white">
              {item.title}
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-300">{item.subtitle}</p>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-white/15 bg-slate-950/60 p-2 text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <p className="text-sm leading-relaxed text-slate-300">{item.description}</p>

          {/* Features */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Keunggulan & Fasilitas
            </h4>
            <div className="grid gap-2 sm:grid-cols-2">
              {item.features.map((f, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-200">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* SERVICE SPECIFIC: Tier selector & Brief Form */}
          {item.type === 'SERVICE' && (
            <div className="space-y-5">
              {item.metadata.tiers && item.metadata.tiers.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-3">
                    1. Pilih Paket Layanan
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {item.metadata.tiers.map((tier, idx) => {
                      const active = idx === selectedTierIndex;
                      return (
                        <button
                          key={tier.name}
                          type="button"
                          onClick={() => setSelectedTierIndex(idx)}
                          className={`text-left rounded-2xl border p-4 transition cursor-pointer ${
                            active
                              ? 'border-cyan-400 bg-cyan-500/10 ring-1 ring-cyan-400/50'
                              : 'border-white/10 bg-[#0d1324] hover:border-white/25'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-white">
                              {tier.name}
                            </span>
                            {tier.popular && (
                              <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-300">
                                Populer
                              </span>
                            )}
                          </div>
                          <div className="mt-2 font-mono text-base font-bold text-cyan-300">
                            {formatIdr(tier.priceIdr)}
                          </div>
                          <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                            <Clock className="h-3 w-3" /> {tier.duration}
                          </div>
                          <ul className="mt-3 space-y-1.5 border-t border-white/10 pt-2.5">
                            {tier.deliverables.map((del, dIdx) => (
                              <li
                                key={dIdx}
                                className="text-[11px] text-slate-300 leading-snug"
                              >
                                • {del}
                              </li>
                            ))}
                          </ul>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Project Brief Form */}
              <div className="rounded-2xl border border-white/10 bg-[#0d1324] p-5 space-y-3.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                  2. Isi Brief Proyek (Wajib)
                </h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Nama Proyek *
                    </label>
                    <input
                      type="text"
                      value={brief.projectName}
                      onChange={(e) =>
                        setBrief((b) => ({ ...b, projectName: e.target.value }))
                      }
                      placeholder="Contoh: Website Toko & Payment QRIS"
                      className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Nama Brand / Perusahaan
                    </label>
                    <input
                      type="text"
                      value={brief.companyOrBrand}
                      onChange={(e) =>
                        setBrief((b) => ({ ...b, companyOrBrand: e.target.value }))
                      }
                      placeholder="Contoh: PT Maju Digital"
                      className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Target Selesai
                    </label>
                    <input
                      type="date"
                      value={brief.targetDeadline}
                      onChange={(e) =>
                        setBrief((b) => ({ ...b, targetDeadline: e.target.value }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Link Referensi Desain / Website
                    </label>
                    <input
                      type="text"
                      value={brief.referenceUrl}
                      onChange={(e) =>
                        setBrief((b) => ({ ...b, referenceUrl: e.target.value }))
                      }
                      placeholder="https://..."
                      className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Detail Kebutuhan & Fitur yang Diinginkan *
                  </label>
                  <textarea
                    rows={3}
                    value={brief.notes}
                    onChange={(e) =>
                      setBrief((b) => ({ ...b, notes: e.target.value }))
                    }
                    placeholder="Jelaskan fitur utama, alur user/admin, atau integrasi Web3/payment yang dibutuhkan..."
                    className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                {briefError && (
                  <p className="text-xs text-rose-400 font-medium">{briefError}</p>
                )}
              </div>
            </div>
          )}

          {/* COURSE SPECIFIC: Instructor & Syllabus */}
          {item.type === 'COURSE' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-300">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">
                      {item.metadata.instructor || 'Mentor Boyang Academy'}
                    </p>
                    <p className="text-[11px] text-indigo-200/80">
                      {item.metadata.instructorRole} · Level {item.metadata.level}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-indigo-200">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {item.metadata.totalDuration}
                  </span>
                  {item.metadata.certificateWeb3Ready && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-violet-500/25 px-2.5 py-1 text-[11px] font-semibold text-violet-200">
                      <Award className="h-3.5 w-3.5" /> Sertifikat Web3
                    </span>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                  Silabus & Preview Materi Gratis
                </h4>
                <div className="space-y-2.5">
                  {item.metadata.modules?.map((mod) => {
                    const isOpen = openModuleId === mod.id;
                    return (
                      <div
                        key={mod.id}
                        className="overflow-hidden rounded-xl border border-white/10 bg-[#0d1324]"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setOpenModuleId(isOpen ? null : mod.id)
                          }
                          className="flex w-full items-center justify-between px-4 py-3 text-left text-xs font-semibold text-white hover:bg-white/[0.04] cursor-pointer"
                        >
                          <span>{mod.title}</span>
                          {isOpen ? (
                            <ChevronUp className="h-4 w-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          )}
                        </button>
                        {isOpen && (
                          <div className="border-t border-white/10 divide-y divide-white/[0.06]">
                            {mod.lessons.map((les) => (
                              <div key={les.id} className="px-4 py-3">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 text-xs text-slate-200">
                                    <PlayCircle className="h-4 w-4 text-cyan-400 shrink-0" />
                                    <span>{les.title}</span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="font-mono text-[11px] text-slate-400">
                                      {les.duration}
                                    </span>
                                    {les.isPreview && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setPreviewLessonId(
                                            previewLessonId === les.id ? null : les.id
                                          )
                                        }
                                        className="rounded bg-cyan-500/20 px-2 py-0.5 text-[10px] font-semibold text-cyan-300 hover:bg-cyan-500/30 cursor-pointer"
                                      >
                                        {previewLessonId === les.id
                                          ? 'Tutup Preview'
                                          : 'Preview Gratis'}
                                      </button>
                                    )}
                                  </div>
                                </div>
                                {previewLessonId === les.id && (
                                  <div className="mt-3 rounded-xl border border-cyan-500/25 bg-slate-950/70 p-3 text-xs text-slate-300 space-y-2">
                                    <p className="font-medium text-cyan-300">
                                      {les.summary}
                                    </p>
                                    <p className="leading-relaxed">{les.content}</p>
                                    {les.codeSnippet && (
                                      <pre className="overflow-x-auto rounded-lg bg-black/60 p-2.5 font-mono text-[11px] text-emerald-300">
                                        {les.codeSnippet}
                                      </pre>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* PRODUCT SPECIFIC */}
          {item.type === 'PRODUCT' && (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 text-emerald-300 font-semibold">
                  <FileCode2 className="h-4 w-4" />
                  Versi {item.metadata.version || 'v1.0'} · {item.metadata.fileSize || 'Digital Download'}
                </span>
                <span className="rounded-lg bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium text-emerald-200">
                  {item.metadata.licenseType || 'Commercial License'}
                </span>
              </div>
              {item.metadata.techStackProduct && (
                <div className="flex flex-wrap gap-1.5">
                  {item.metadata.techStackProduct.map((t) => (
                    <span
                      key={t}
                      className="rounded-md border border-white/10 bg-slate-950/70 px-2 py-0.5 font-mono text-[11px] text-slate-300"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs text-slate-400">
                Setelah pembayaran diverifikasi, License Key unik & tautan unduhan paket
                otomatis muncul di tab <strong>Produk Digital Saya</strong> pada
                Dashboard Anda.
              </p>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 bg-[#070a14] px-6 py-4">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-400">
              Total Investasi
            </span>
            <div className="font-mono text-xl font-bold text-white">
              {formatIdr(activePrice)}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                const entry = buildCartEntry();
                if (entry) {
                  onAddToCart(entry);
                  onClose();
                }
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-xs sm:text-sm font-semibold text-white hover:bg-white/[0.1] cursor-pointer"
            >
              <ShoppingBag className="h-4 w-4" />
              + Keranjang
            </button>
            <button
              type="button"
              onClick={() => {
                const entry = buildCartEntry();
                if (entry) {
                  onBuyNow(entry);
                }
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-500 px-5 py-3 text-xs sm:text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/20 hover:brightness-110 cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              Bayar Sekarang (QRIS / Bank / Web3)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
