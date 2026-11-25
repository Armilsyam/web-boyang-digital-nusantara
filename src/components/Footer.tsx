import React from 'react';
import type { CatalogItemType } from '../types';
import { isStaticMode } from '../lib/api';

interface FooterProps {
  onNavigateSection: (sectionId: string, filterType?: CatalogItemType | 'ALL') => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigateSection }) => {
  return (
    <footer className="border-t border-white/[0.08] bg-[#04060c] py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2 space-y-3">
            <div className="font-display text-lg font-bold text-white">
              BOYANG <span className="text-cyan-400">DIGITAL</span>
            </div>
            <p className="max-w-md text-xs leading-relaxed text-slate-400">
              Studio teknologi, akademi keterampilan digital, dan marketplace aset
              siap pakai untuk transformasi bisnis modern & ekosistem Web3 di
              Indonesia.
            </p>
            <div className="flex flex-wrap gap-2 text-[11px] font-mono text-slate-400 pt-1">
              <span className="rounded border border-white/10 px-2 py-1">QRIS Dinamis</span>
              <span className="rounded border border-white/10 px-2 py-1">BCA / Mandiri / BNI / BRI</span>
              <span className="rounded border border-white/10 px-2 py-1">GoPay / OVO / DANA</span>
              <span className="rounded border border-violet-500/30 text-violet-300 px-2 py-1">
                EVM Web3 Ready
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
              Ekosistem
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <button
                  onClick={() => onNavigateSection('katalog', 'SERVICE')}
                  className="hover:text-cyan-300 cursor-pointer"
                >
                  Layanan Jasa Digital
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateSection('katalog', 'COURSE')}
                  className="hover:text-cyan-300 cursor-pointer"
                >
                  Boyang Digital Academy
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateSection('katalog', 'PRODUCT')}
                  className="hover:text-cyan-300 cursor-pointer"
                >
                  Produk Digital & Source Code
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateSection('web3-hub')}
                  className="hover:text-cyan-300 cursor-pointer"
                >
                  Verifikasi Sertifikat & Lisensi
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
              Hubungi Kami
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>Email: hello@boyangdigital.id</li>
              <li>WhatsApp: +62 812-8899-2026</li>
              <li>ENS: boyangdigital.eth</li>
              <li>Jakarta Selatan, Indonesia</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/[0.06] pt-6 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} BOYANG DIGITAL. All rights reserved.</p>
          <p className="font-mono text-[11px]">
            {isStaticMode()
              ? 'GitHub Pages Mode · Interactive Browser Sandbox (LocalStorage)'
              : 'Built for Production Hosting · Web2 & Web3 Hybrid Architecture'}
          </p>
        </div>
      </div>
    </footer>
  );
};
