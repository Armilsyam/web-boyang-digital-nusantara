import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Bot,
  Boxes,
  Check,
  Code2,
  Cpu,
  Globe,
  GraduationCap,
  Layers,
  LayoutGrid,
  Palette,
  Search,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Star,
  TrendingUp,
  Workflow,
} from 'lucide-react';
import type { CatalogItem, CatalogItemType } from '../types';
import { formatIdr } from '../lib/format';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Globe,
  Cpu,
  Bot,
  Palette,
  Smartphone,
  TrendingUp,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  Layers,
  Code2,
  Boxes,
  Workflow,
  LayoutGrid,
  BookOpen,
};

interface CatalogSectionProps {
  items: CatalogItem[];
  loading: boolean;
  activeType: CatalogItemType | 'ALL';
  onChangeType: (type: CatalogItemType | 'ALL') => void;
  onSelectItem: (item: CatalogItem) => void;
  onQuickAdd: (item: CatalogItem) => void;
}

export const CatalogSection: React.FC<CatalogSectionProps> = ({
  items,
  loading,
  activeType,
  onChangeType,
  onSelectItem,
  onQuickAdd,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const categories = useMemo(() => {
    const filteredByType =
      activeType === 'ALL' ? items : items.filter((i) => i.type === activeType);
    const set = new Set<string>();
    filteredByType.forEach((i) => set.add(i.category));
    return ['ALL', ...Array.from(set)];
  }, [items, activeType]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (activeType !== 'ALL' && item.type !== activeType) return false;
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [items, activeType, selectedCategory, search]);

  const tabs: Array<{ id: CatalogItemType | 'ALL'; label: string; count: number }> = [
    { id: 'ALL', label: 'Semua Ekosistem', count: items.length },
    {
      id: 'SERVICE',
      label: 'Layanan Jasa Digital',
      count: items.filter((i) => i.type === 'SERVICE').length,
    },
    {
      id: 'COURSE',
      label: 'Kursus Academy',
      count: items.filter((i) => i.type === 'COURSE').length,
    },
    {
      id: 'PRODUCT',
      label: 'Produk Digital',
      count: items.filter((i) => i.type === 'PRODUCT').length,
    },
  ];

  const getTypeLabel = (type: CatalogItemType) => {
    if (type === 'SERVICE') return { text: 'Jasa Digital', cls: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' };
    if (type === 'COURSE') return { text: 'Kursus', cls: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' };
    return { text: 'Produk Digital', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
  };

  return (
    <section id="katalog" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-cyan-400">
            Katalog Terpadu Boyang Digital
          </span>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Pilih Layanan, Kursus & Aset Digital
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Semua layanan dikelola profesional dengan kontrak/brief jelas, kursus
            dilengkapi sertifikat verifikasi Web3, dan produk digital siap unduh instan.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full lg:w-80">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari jasa, kursus, atau template..."
            className="w-full rounded-xl border border-white/10 bg-[#0b101e] py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-cyan-400/50 focus:outline-none"
          />
        </div>
      </div>

      {/* Main Type Tabs */}
      <div className="mt-8 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              onChangeType(tab.id);
              setSelectedCategory('ALL');
            }}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs sm:text-sm font-semibold transition cursor-pointer ${
              activeType === tab.id
                ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-200 shadow-lg shadow-cyan-500/10'
                : 'border-white/10 bg-[#0b101e] text-slate-400 hover:text-white hover:border-white/20'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`rounded-md px-1.5 py-0.5 text-[11px] font-mono ${
                activeType === tab.id
                  ? 'bg-cyan-400/20 text-cyan-200'
                  : 'bg-white/[0.06] text-slate-400'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Category Chips */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition cursor-pointer ${
              selectedCategory === cat
                ? 'bg-white text-slate-950 font-semibold'
                : 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-slate-200'
            }`}
          >
            {cat === 'ALL' ? 'Semua Kategori' : cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="h-96 animate-pulse rounded-2xl border border-white/10 bg-[#0b101e]"
            />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-white/10 bg-[#0b101e] p-12 text-center">
          <p className="text-base font-medium text-slate-300">
            Tidak ada item yang sesuai dengan pencarian Anda.
          </p>
          <button
            onClick={() => {
              setSearch('');
              setSelectedCategory('ALL');
              onChangeType('ALL');
            }}
            className="mt-4 rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20 cursor-pointer"
          >
            Reset Filter
          </button>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => {
            const Icon = ICON_MAP[item.iconName] || Sparkles;
            const typeMeta = getTypeLabel(item.type);

            return (
              <article
                key={item.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b101e] hover:border-cyan-400/35 transition duration-200"
              >
                {/* Visual Gradient Header */}
                <div
                  className={`relative bg-gradient-to-br ${item.thumbnailGradient} p-5 border-b border-white/[0.06]`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${typeMeta.cls}`}
                    >
                      {typeMeta.text}
                    </span>
                    {item.badge && (
                      <span className="rounded-lg bg-white/10 backdrop-blur px-2.5 py-1 text-[11px] font-semibold text-white">
                        {item.badge}
                      </span>
                    )}
                  </div>

                  <div className="mt-5 flex items-center gap-3.5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-slate-950/60 text-cyan-300 shadow-inner">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-slate-300">
                        {item.category}
                      </p>
                      <h3 className="font-display text-base font-bold leading-snug text-white line-clamp-2">
                        {item.title}
                      </h3>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="flex flex-1 flex-col p-5">
                  <p className="text-xs leading-relaxed text-slate-400 line-clamp-2">
                    {item.subtitle}
                  </p>

                  <ul className="mt-4 space-y-2 flex-1">
                    {item.features.slice(0, 3).map((feat, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-xs text-slate-300"
                      >
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Meta & Price */}
                  <div className="mt-5 border-t border-white/[0.07] pt-4">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                      <span className="inline-flex items-center gap-1 text-amber-300 font-medium">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {item.rating.toFixed(1)}
                      </span>
                      <span>
                        {item.salesCount}+{' '}
                        {item.type === 'COURSE'
                          ? 'Siswa'
                          : item.type === 'SERVICE'
                          ? 'Proyek'
                          : 'Terjual'}
                      </span>
                    </div>

                    <div className="flex items-end justify-between gap-2">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-slate-500">
                          {item.type === 'SERVICE' ? 'Mulai dari' : 'Harga'}
                        </span>
                        <div className="flex items-baseline gap-2">
                          <span className="font-mono text-lg font-bold text-white">
                            {formatIdr(item.priceIdr)}
                          </span>
                          {item.originalPriceIdr && (
                            <span className="font-mono text-xs text-slate-500 line-through">
                              {formatIdr(item.originalPriceIdr)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => onSelectItem(item)}
                        className="flex-1 rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2.5 text-xs font-semibold text-white hover:bg-white/[0.09] transition cursor-pointer"
                      >
                        {item.type === 'SERVICE'
                          ? 'Pilih Paket & Brief'
                          : item.type === 'COURSE'
                          ? 'Lihat Kurikulum'
                          : 'Detail Produk'}
                      </button>

                      <button
                        onClick={() =>
                          item.type === 'SERVICE' ? onSelectItem(item) : onQuickAdd(item)
                        }
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 px-3.5 py-2.5 text-xs font-bold text-slate-950 hover:brightness-110 transition cursor-pointer"
                      >
                        <ShoppingBag className="h-3.5 w-3.5" />
                        {item.type === 'SERVICE' ? 'Pesan' : '+ Keranjang'}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
