import React, { useState } from 'react';
import {
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Shield,
  ShoppingCart,
  Wallet,
  X,
} from 'lucide-react';
import type { CatalogItemType, User } from '../types';
import { shortenAddress } from '../lib/format';

interface NavbarProps {
  activeView: 'HOME' | 'USER_DASHBOARD' | 'ADMIN_DASHBOARD';
  onChangeView: (view: 'HOME' | 'USER_DASHBOARD' | 'ADMIN_DASHBOARD') => void;
  user: User | null;
  cartCount: number;
  onOpenCart: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  wallet: { address: string; chainId: number } | null;
  onConnectWallet: () => void;
  onNavigateSection: (sectionId: string, filterType?: CatalogItemType | 'ALL') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  onChangeView,
  user,
  cartCount,
  onOpenCart,
  onOpenAuth,
  onLogout,
  wallet,
  onConnectWallet,
  onNavigateSection,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems: Array<{
    label: string;
    sectionId: string;
    filterType?: CatalogItemType | 'ALL';
  }> = [
    { label: 'Layanan Jasa', sectionId: 'katalog', filterType: 'SERVICE' },
    { label: 'Kursus', sectionId: 'katalog', filterType: 'COURSE' },
    { label: 'Produk Digital', sectionId: 'katalog', filterType: 'PRODUCT' },
    { label: 'Web3 & Verifikasi', sectionId: 'web3-hub' },
    { label: 'Konsultasi', sectionId: 'konsultasi' },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.08] glass-panel">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <button
          onClick={() => onChangeView('HOME')}
          className="flex items-center gap-3 text-left group cursor-pointer"
        >
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 via-indigo-500/20 to-violet-600/30 border border-cyan-400/30 shadow-lg shadow-cyan-500/10 group-hover:border-cyan-400/60 transition">
            <svg
              viewBox="0 0 32 32"
              className="h-6 w-6 text-cyan-300"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M16 3L27.5 9.5V22.5L16 29L4.5 22.5V9.5L16 3Z"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M11 11.5H17.5C19.433 11.5 21 12.8 21 14.4C21 15.6 20.1 16.5 18.9 16.9C20.4 17.3 21.5 18.4 21.5 19.8C21.5 21.6 19.8 22.9 17.5 22.9H11V11.5Z"
                stroke="#38BDF8"
                strokeWidth="1.8"
              />
              <circle cx="16" cy="16" r="1.5" fill="#818CF8" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-base sm:text-lg font-bold tracking-tight text-white">
                BOYANG <span className="text-cyan-400">DIGITAL</span>
              </span>
              <span className="hidden sm:inline-flex rounded-full bg-violet-500/15 border border-violet-400/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-300">
                Web3 Ready
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Services · Academy · Digital Assets
            </p>
          </div>
        </button>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                onChangeView('HOME');
                setTimeout(() => onNavigateSection(item.sectionId, item.filterType), 50);
              }}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition cursor-pointer ${
                activeView === 'HOME'
                  ? 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Web3 Wallet Pill */}
          <button
            onClick={onConnectWallet}
            title="Hubungkan Wallet Web3 (MetaMask / EVM)"
            className={`hidden sm:inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition cursor-pointer ${
              wallet
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                : 'border-violet-500/30 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                wallet ? 'bg-emerald-400 animate-pulse' : 'bg-violet-400'
              }`}
            />
            <Wallet className="h-3.5 w-3.5" />
            <span className="font-mono">
              {wallet ? shortenAddress(wallet.address) : 'Web3 Wallet'}
            </span>
          </button>

          {/* Cart Button */}
          <button
            onClick={onOpenCart}
            aria-label="Keranjang Belanja"
            className="relative inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-slate-200 hover:bg-white/[0.09] hover:border-cyan-400/40 transition cursor-pointer"
          >
            <ShoppingCart className="h-4 w-4" />
            {cartCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-cyan-500 px-1 text-[11px] font-bold text-slate-950 shadow-md shadow-cyan-500/30">
                {cartCount}
              </span>
            )}
          </button>

          {/* User / Admin Controls */}
          {user ? (
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => onChangeView('USER_DASHBOARD')}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition cursor-pointer ${
                  activeView === 'USER_DASHBOARD'
                    ? 'border-cyan-400/50 bg-cyan-500/20 text-cyan-200'
                    : 'border-white/10 bg-white/[0.05] text-slate-200 hover:bg-white/[0.1]'
                }`}
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                Dashboard
              </button>

              {user.role === 'ADMIN' && (
                <button
                  onClick={() => onChangeView('ADMIN_DASHBOARD')}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition cursor-pointer ${
                    activeView === 'ADMIN_DASHBOARD'
                      ? 'border-amber-400/60 bg-amber-500/20 text-amber-200'
                      : 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                  }`}
                >
                  <Shield className="h-3.5 w-3.5" />
                  Admin
                </button>
              )}

              <button
                onClick={onLogout}
                title="Keluar"
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] p-2 text-slate-400 hover:text-rose-300 hover:border-rose-500/30 transition cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-cyan-500/20 hover:brightness-110 transition cursor-pointer"
            >
              <LogIn className="h-3.5 w-3.5" />
              Masuk / Daftar
            </button>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] p-2 text-slate-200"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-white/10 bg-[#080c17] px-4 py-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                setMobileOpen(false);
                onChangeView('HOME');
                setTimeout(() => onNavigateSection(item.sectionId, item.filterType), 50);
              }}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-300 hover:bg-white/[0.06]"
            >
              {item.label}
            </button>
          ))}

          <div className="pt-2 border-t border-white/10 flex flex-wrap gap-2">
            <button
              onClick={() => {
                setMobileOpen(false);
                onConnectWallet();
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-xs font-medium text-violet-200"
            >
              <Wallet className="h-3.5 w-3.5" />
              {wallet ? shortenAddress(wallet.address) : 'Connect Web3'}
            </button>

            {user ? (
              <>
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    onChangeView('USER_DASHBOARD');
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-cyan-500/20 border border-cyan-400/40 px-3 py-2 text-xs font-semibold text-cyan-200"
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Dashboard
                </button>
                {user.role === 'ADMIN' && (
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      onChangeView('ADMIN_DASHBOARD');
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-500/20 border border-amber-400/40 px-3 py-2 text-xs font-semibold text-amber-200"
                  >
                    <Shield className="h-3.5 w-3.5" />
                    Admin
                  </button>
                )}
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    onLogout();
                  }}
                  className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300"
                >
                  Keluar
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setMobileOpen(false);
                  onOpenAuth();
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-4 py-2 text-xs font-semibold text-white"
              >
                <LogIn className="h-3.5 w-3.5" />
                Masuk / Daftar
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
