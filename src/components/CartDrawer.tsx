import React, { useState } from 'react';
import {
  ArrowRight,
  Minus,
  Plus,
  ShoppingBag,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import type { CartEntry, PromoCode } from '../types';
import { formatIdr } from '../lib/format';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartEntry[];
  onUpdateQty: (index: number, delta: number) => void;
  onRemoveItem: (index: number) => void;
  appliedPromo: PromoCode | null;
  promoDiscountIdr: number;
  onApplyPromo: (code: string) => Promise<void>;
  onClearPromo: () => void;
  onProceedCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQty,
  onRemoveItem,
  appliedPromo,
  promoDiscountIdr,
  onApplyPromo,
  onClearPromo,
  onProceedCheckout,
}) => {
  const [promoInput, setPromoInput] = useState('');
  const [promoMsg, setPromoMsg] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);

  if (!isOpen) return null;

  const subtotal = cart.reduce(
    (sum, item) => sum + item.unitPriceIdr * item.quantity,
    0
  );
  const total = Math.max(0, subtotal - promoDiscountIdr);

  const handleApplyPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    setPromoMsg('');
    try {
      await onApplyPromo(promoInput.trim());
      setPromoMsg('Kode promo berhasil diterapkan!');
    } catch (err: unknown) {
      setPromoMsg((err as Error).message);
    } finally {
      setPromoLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#080c18] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="h-5 w-5 text-cyan-400" />
            <h3 className="font-display text-lg font-bold text-white">
              Keranjang Belanja
            </h3>
            <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 font-mono text-xs text-cyan-300">
              {cart.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04] text-slate-500 mb-4">
                <ShoppingBag className="h-8 w-8" />
              </div>
              <p className="text-sm font-medium text-slate-300">
                Keranjang Anda masih kosong
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Pilih layanan jasa, kursus, atau produk digital Boyang Digital.
              </p>
            </div>
          ) : (
            cart.map((entry, idx) => (
              <div
                key={`${entry.catalogItem.id}-${entry.tierName || idx}`}
                className="rounded-2xl border border-white/10 bg-[#0e1526] p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400">
                      {entry.catalogItem.type === 'SERVICE'
                        ? 'Jasa Digital'
                        : entry.catalogItem.type === 'COURSE'
                        ? 'Kursus'
                        : 'Produk Digital'}
                    </span>
                    <h4 className="mt-0.5 text-sm font-bold text-white leading-snug">
                      {entry.catalogItem.title}
                    </h4>
                    {entry.tierName && (
                      <p className="mt-0.5 text-xs text-slate-400">
                        Paket: {entry.tierName}
                      </p>
                    )}
                    {entry.brief && (
                      <p className="mt-1 text-[11px] text-emerald-300">
                        Brief: {entry.brief.projectName}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => onRemoveItem(idx)}
                    className="rounded-lg p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-950/60 px-2 py-1">
                    <button
                      onClick={() => onUpdateQty(idx, -1)}
                      className="text-slate-400 hover:text-white cursor-pointer"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="font-mono text-xs text-white px-1">
                      {entry.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQty(idx, 1)}
                      className="text-slate-400 hover:text-white cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <span className="font-mono text-sm font-bold text-cyan-300">
                    {formatIdr(entry.unitPriceIdr * entry.quantity)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Promo & Summary */}
        {cart.length > 0 && (
          <div className="border-t border-white/10 bg-[#060912] p-6 space-y-4">
            <form onSubmit={handleApplyPromo} className="space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    placeholder="Kode promo (cth: BOYANG10)"
                    className="w-full rounded-xl border border-white/10 bg-[#0d1324] py-2 pl-9 pr-3 font-mono text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                {appliedPromo ? (
                  <button
                    type="button"
                    onClick={() => {
                      onClearPromo();
                      setPromoInput('');
                      setPromoMsg('');
                    }}
                    className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 text-xs font-semibold text-rose-300 cursor-pointer"
                  >
                    Hapus
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={promoLoading}
                    className="rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-4 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25 cursor-pointer"
                  >
                    Pakai
                  </button>
                )}
              </div>
              {promoMsg && (
                <p
                  className={`text-[11px] ${
                    appliedPromo ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {promoMsg}
                </p>
              )}
              {!appliedPromo && (
                <p className="text-[11px] text-slate-500">
                  Coba promo aktif: <code className="text-cyan-400">BOYANG10</code> atau{' '}
                  <code className="text-violet-400">WEB3LAUNCH</code>
                </p>
              )}
            </form>

            <div className="space-y-1.5 border-t border-white/10 pt-3 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span className="font-mono text-slate-200">{formatIdr(subtotal)}</span>
              </div>
              {promoDiscountIdr > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Diskon ({appliedPromo?.code})</span>
                  <span className="font-mono">-{formatIdr(promoDiscountIdr)}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 text-sm font-bold text-white">
                <span>Estimasi Total</span>
                <span className="font-mono text-cyan-300">{formatIdr(total)}</span>
              </div>
            </div>

            <button
              onClick={onProceedCheckout}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-500 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/20 hover:brightness-110 transition cursor-pointer"
            >
              Lanjut ke Pembayaran
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
