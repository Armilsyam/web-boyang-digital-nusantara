import React from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Code2,
  Cpu,
  GraduationCap,
  QrCode,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react';
import type { CatalogItemType } from '../types';

interface HeroSectionProps {
  counts: { services: number; courses: number; products: number };
  onExplore: (type: CatalogItemType | 'ALL') => void;
  onOpenConsult: () => void;
  onConnectWallet: () => void;
  walletAddress?: string | null;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  counts,
  onExplore,
  onOpenConsult,
  onConnectWallet,
  walletAddress,
}) => {
  return (
    <section className="relative overflow-hidden border-b border-white/[0.06] bg-grid-pattern">
      {/* Ambient Radial Glows */}
      <div className="pointer-events-none absolute -top-24 left-1/4 h-96 w-96 rounded-full bg-cyan-500/15 blur-[130px]" />
      <div className="pointer-events-none absolute top-16 right-1/6 h-96 w-96 rounded-full bg-indigo-600/20 blur-[140px]" />

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-22 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
          {/* Left Column */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3.5 py-1.5 text-xs font-medium text-cyan-200">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              <span>Ekosistem Digital Terpadu · Hybrid Web2 & Web3</span>
            </div>

            <h1 className="font-display text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-[54px] lg:leading-[1.08]">
              Solusi{' '}
              <span className="bg-gradient-to-r from-cyan-300 via-sky-400 to-indigo-400 bg-clip-text text-transparent">
                Jasa Digital, Kursus
              </span>{' '}
              & Produk Siap Pakai Era Web3.
            </h1>

            <p className="max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
              <strong className="text-white">BOYANG DIGITAL</strong> menyatukan agensi
              pengembangan software & Web3, akademi teknologi bersertifikat, dan
              marketplace produk digital dalam satu platform multi-role dengan pembayaran{' '}
              <span className="text-cyan-300 font-medium">
                QRIS Dinamis, Transfer Bank, E-Wallet, dan Crypto
              </span>
              .
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={() => onExplore('ALL')}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-500 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-xl shadow-cyan-500/20 hover:brightness-110 transition cursor-pointer"
              >
                Jelajahi Ekosistem
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                onClick={onOpenConsult}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-5 py-3.5 text-sm font-semibold text-white hover:bg-white/[0.09] transition cursor-pointer"
              >
                Konsultasi Proyek Gratis
              </button>

              <button
                onClick={onConnectWallet}
                className="inline-flex items-center gap-2 rounded-xl border border-violet-500/35 bg-violet-500/10 px-4 py-3.5 text-sm font-semibold text-violet-200 hover:bg-violet-500/20 transition cursor-pointer"
              >
                <Wallet className="h-4 w-4 text-violet-400" />
                {walletAddress ? 'Wallet Terhubung' : 'Hubungkan Web3'}
              </button>
            </div>

            {/* Trust / Payment Channel Strip */}
            <div className="pt-4 border-t border-white/[0.08]">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-3">
                Pembayaran Otomatis & Verifikasi Terpercaya
              </p>
              <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-300">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5">
                  <QrCode className="h-3.5 w-3.5 text-cyan-400" /> QRIS Dinamis
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> BCA · Mandiri · BNI · BRI
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-sky-400" /> GoPay · OVO · DANA · ShopeePay
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/25 bg-violet-500/10 px-3 py-1.5 text-violet-200">
                  <ShieldCheck className="h-3.5 w-3.5 text-violet-400" /> EVM Web3 (Base · Polygon · ETH)
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive 3-Pillar Cards */}
          <div className="lg:col-span-5 space-y-3.5">
            <button
              onClick={() => onExplore('SERVICE')}
              className="w-full text-left group rounded-2xl border border-white/10 bg-[#0b101e]/90 p-5 hover:border-cyan-400/40 transition cursor-pointer"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-400/30 text-cyan-300">
                    <Cpu className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400">
                      {counts.services} Layanan Aktif
                    </span>
                    <h3 className="font-display text-base font-bold text-white group-hover:text-cyan-300 transition">
                      Jasa Digital, SaaS, AI & Web3
                    </h3>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-cyan-300 group-hover:translate-x-1 transition" />
              </div>
              <p className="mt-2.5 text-xs leading-relaxed text-slate-400">
                Pesan paket sesuai budget, kirim brief proyek langsung, dan pantau
                progres pengerjaan secara real-time di Dashboard User.
              </p>
            </button>

            <button
              onClick={() => onExplore('COURSE')}
              className="w-full text-left group rounded-2xl border border-white/10 bg-[#0b101e]/90 p-5 hover:border-indigo-400/40 transition cursor-pointer"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/15 border border-indigo-400/30 text-indigo-300">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
                      {counts.courses} Kursus Academy
                    </span>
                    <h3 className="font-display text-base font-bold text-white group-hover:text-indigo-300 transition">
                      LMS Interaktif & Sertifikat Web3
                    </h3>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-indigo-300 group-hover:translate-x-1 transition" />
              </div>
              <p className="mt-2.5 text-xs leading-relaxed text-slate-400">
                Kurikulum praktis Fullstack, AI Automation & Solidity lengkap dengan
                progress tracker dan sertifikat terverifikasi SHA-256 hash.
              </p>
            </button>

            <button
              onClick={() => onExplore('PRODUCT')}
              className="w-full text-left group rounded-2xl border border-white/10 bg-[#0b101e]/90 p-5 hover:border-emerald-400/40 transition cursor-pointer"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-300">
                    <Code2 className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                      {counts.products} Produk Digital
                    </span>
                    <h3 className="font-display text-base font-bold text-white group-hover:text-emerald-300 transition">
                      Source Code, UI Kit & Automation Pack
                    </h3>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-emerald-300 group-hover:translate-x-1 transition" />
              </div>
              <p className="mt-2.5 text-xs leading-relaxed text-slate-400">
                Aset siap pakai dengan License Key unik otomatis dan unduhan instan
                begitu pembayaran QRIS atau transfer Anda terverifikasi.
              </p>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
