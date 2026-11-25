import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  Building2,
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  QrCode,
  ShieldCheck,
  Smartphone,
  Upload,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import type {
  CartEntry,
  Order,
  PaymentMethod,
  PaymentSettings,
  PromoCode,
  User,
} from '../types';
import { api } from '../lib/api';
import { formatDateId, formatIdr, getOrderStatusMeta } from '../lib/format';
import { connectInjectedWallet, sendNativeCryptoPayment } from '../lib/web3';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartEntry[];
  appliedPromo: PromoCode | null;
  promoDiscountIdr: number;
  user: User | null;
  paymentSettings: PaymentSettings | null;
  existingOrder?: Order | null;
  onOrderCompleted: (order: Order, clearCart: boolean) => void;
  onNeedAuth: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cart,
  appliedPromo,
  promoDiscountIdr,
  user,
  paymentSettings,
  existingOrder = null,
  onOrderCompleted,
  onNeedAuth,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('QRIS');
  const [selectedChannel, setSelectedChannel] = useState<string>('QRIS_DINAMIS');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [qrisDataUrl, setQrisDataUrl] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [senderName, setSenderName] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [web3TxHash, setWeb3TxHash] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setSuccessMsg('');
    if (existingOrder) {
      setActiveOrder(existingOrder);
      setPaymentMethod(existingOrder.paymentMethod);
      setSelectedChannel(existingOrder.paymentChannel);
    } else {
      setActiveOrder(null);
      setPaymentMethod('QRIS');
      setSelectedChannel('QRIS_DINAMIS');
      setCustomerName(user?.name || '');
      setCustomerEmail(user?.email || '');
      setCustomerPhone(user?.phone || '');
    }
    setSenderName(user?.name || '');
    setPaymentReference('');
    setProofFile(null);
    setWeb3TxHash('');
  }, [isOpen, existingOrder, user]);

  // Set sensible default channel when switching method
  useEffect(() => {
    if (activeOrder || !paymentSettings) return;
    if (paymentMethod === 'QRIS') {
      setSelectedChannel('QRIS_DINAMIS');
    } else if (paymentMethod === 'BANK_TRANSFER') {
      setSelectedChannel(paymentSettings.banks[0]?.bankCode || 'BCA');
    } else if (paymentMethod === 'EWALLET') {
      setSelectedChannel(paymentSettings.ewallets[0]?.provider || 'GoPay');
    } else if (paymentMethod === 'WEB3_CRYPTO') {
      const c = paymentSettings.web3.chains[0];
      setSelectedChannel(c ? `${c.name} (${c.symbol})` : 'Base Mainnet (ETH)');
    }
  }, [paymentMethod, paymentSettings, activeOrder]);

  // Render QRIS QR code image from order payload
  useEffect(() => {
    if (!activeOrder?.qrisPayload) {
      setQrisDataUrl('');
      return;
    }
    QRCode.toDataURL(activeOrder.qrisPayload, {
      width: 320,
      margin: 2,
      color: { dark: '#05070e', light: '#ffffff' },
    })
      .then(setQrisDataUrl)
      .catch(() => setQrisDataUrl(''));
  }, [activeOrder?.qrisPayload]);

  if (!isOpen) return null;

  const subtotal = cart.reduce(
    (sum, item) => sum + item.unitPriceIdr * item.quantity,
    0
  );
  const estimatedTotal = Math.max(0, subtotal - promoDiscountIdr);

  const copyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onNeedAuth();
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await api.createOrder({
        items: cart.map((c) => ({
          catalogItemId: c.catalogItem.id,
          tierName: c.tierName,
          quantity: c.quantity,
          brief: c.brief,
        })),
        promoCode: appliedPromo?.code,
        paymentMethod,
        paymentChannel: selectedChannel,
        customerName,
        customerEmail,
        customerPhone,
      });
      setActiveOrder(res.order);
      onOrderCompleted(res.order, true);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder) return;
    setError('');
    setLoading(true);
    try {
      const fd = new FormData();
      if (proofFile) fd.append('proofFile', proofFile);
      if (senderName) fd.append('paymentSenderName', senderName);
      if (paymentReference) fd.append('paymentReference', paymentReference);
      if (web3TxHash) fd.append('web3TxHash', web3TxHash);
      fd.append('web3Chain', activeOrder.paymentChannel);

      const res = await api.uploadOrderProof(activeOrder.id, fd);
      setActiveOrder(res.order);
      setSuccessMsg(res.message);
      onOrderCompleted(res.order, false);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSandboxInstantPay = async () => {
    if (!activeOrder) return;
    setError('');
    setLoading(true);
    try {
      const res = await api.sandboxConfirmOrder(activeOrder.id);
      setActiveOrder(res.order);
      setSuccessMsg(res.message);
      onOrderCompleted(res.order, false);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handlePayWithConnectedWallet = async () => {
    if (!activeOrder || !paymentSettings) return;
    setError('');
    setLoading(true);
    try {
      const { address } = await connectInjectedWallet();
      const matchedChain =
        paymentSettings.web3.chains.find((c) =>
          activeOrder.paymentChannel.includes(c.name)
        ) || paymentSettings.web3.chains[0];

      const rate = matchedChain?.idrPerToken || 48000000;
      const amountToken = Math.max(0.0001, activeOrder.totalIdr / rate).toFixed(6);
      const txHash = await sendNativeCryptoPayment({
        fromAddress: address,
        toAddress: paymentSettings.web3.treasuryAddress,
        amountTokenStr: amountToken,
        chainId: matchedChain?.chainId || 8453,
      });

      setWeb3TxHash(txHash);
      const fd = new FormData();
      fd.append('web3TxHash', txHash);
      fd.append('web3Chain', matchedChain?.name || 'EVM');
      fd.append('web3FromAddress', address);
      fd.append('paymentSenderName', address);
      const res = await api.uploadOrderProof(activeOrder.id, fd);
      setActiveOrder(res.order);
      setSuccessMsg(
        `Transaksi Web3 berhasil dikirim (${txHash.slice(0, 12)}...). Menunggu konfirmasi final.`
      );
      onOrderCompleted(res.order, false);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const selectedBank = paymentSettings?.banks.find(
    (b) => b.bankCode === (activeOrder?.paymentChannel || selectedChannel)
  );
  const selectedEwallet = paymentSettings?.ewallets.find(
    (w) => w.provider === (activeOrder?.paymentChannel || selectedChannel)
  );
  const selectedChain = paymentSettings?.web3.chains.find((c) =>
    (activeOrder?.paymentChannel || selectedChannel).includes(c.name)
  ) || paymentSettings?.web3.chains[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[93vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-[#090d1a] shadow-2xl">
        {/* Top Bar */}
        <div className="flex items-center justify-between border-b border-white/10 bg-[#070a14] px-6 py-4">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-cyan-400">
              BOYANG DIGITAL PAYMENT GATEWAY
            </span>
            <h3 className="font-display text-lg sm:text-xl font-bold text-white">
              {activeOrder
                ? `Invoice ${activeOrder.invoiceNumber}`
                : 'Checkout & Pilih Metode Pembayaran'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!activeOrder ? (
            /* STEP 1: Select Method & Customer Data */
            <form onSubmit={handleCreateOrder} className="space-y-6">
              {!user && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-center justify-between gap-3">
                  <p className="text-xs text-amber-200">
                    Anda belum login. Masuk terlebih dahulu agar produk, kursus &
                    invoice tersimpan di akun Anda.
                  </p>
                  <button
                    type="button"
                    onClick={onNeedAuth}
                    className="shrink-0 rounded-xl bg-amber-400 px-3 py-2 text-xs font-bold text-slate-950 cursor-pointer"
                  >
                    Masuk / Daftar
                  </button>
                </div>
              )}

              {/* Order Summary */}
              <div className="rounded-2xl border border-white/10 bg-[#0d1324] p-4 space-y-2.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Ringkasan Pesanan ({cart.length} Item)
                </h4>
                {cart.map((c, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs text-slate-200"
                  >
                    <span className="truncate pr-2">
                      {c.quantity}x {c.catalogItem.title}
                      {c.tierName ? ` (${c.tierName})` : ''}
                    </span>
                    <span className="font-mono font-semibold text-white shrink-0">
                      {formatIdr(c.unitPriceIdr * c.quantity)}
                    </span>
                  </div>
                ))}
                <div className="border-t border-white/10 pt-2 flex justify-between text-sm font-bold text-cyan-300">
                  <span>Total Tagihan</span>
                  <span className="font-mono">{formatIdr(estimatedTotal)}</span>
                </div>
              </div>

              {/* Payment Method Tabs */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                  Pilih Metode Pembayaran
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    {
                      id: 'QRIS' as PaymentMethod,
                      label: 'QRIS Instan',
                      sub: 'Scan semua e-wallet/bank',
                      icon: QrCode,
                    },
                    {
                      id: 'BANK_TRANSFER' as PaymentMethod,
                      label: 'Transfer Bank',
                      sub: 'BCA, Mandiri, BNI, BRI',
                      icon: Building2,
                    },
                    {
                      id: 'EWALLET' as PaymentMethod,
                      label: 'E-Wallet',
                      sub: 'GoPay, OVO, DANA, Shopee',
                      icon: Smartphone,
                    },
                    {
                      id: 'WEB3_CRYPTO' as PaymentMethod,
                      label: 'Web3 Crypto',
                      sub: 'Base, Polygon, ETH',
                      icon: Wallet,
                    },
                  ].map((m) => {
                    const Icon = m.icon;
                    const active = paymentMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id)}
                        className={`rounded-2xl border p-3 text-left transition cursor-pointer ${
                          active
                            ? 'border-cyan-400 bg-cyan-500/15 text-white'
                            : 'border-white/10 bg-[#0d1324] text-slate-400 hover:border-white/25'
                        }`}
                      >
                        <Icon
                          className={`h-5 w-5 mb-2 ${
                            active ? 'text-cyan-300' : 'text-slate-400'
                          }`}
                        />
                        <div className="text-xs font-bold text-white">{m.label}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{m.sub}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sub-channel Picker */}
              {paymentMethod === 'BANK_TRANSFER' && paymentSettings && (
                <div>
                  <label className="block text-xs text-slate-400 mb-2">
                    Pilih Rekening Tujuan Bank
                  </label>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {paymentSettings.banks.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setSelectedChannel(b.bankCode)}
                        className={`rounded-xl border p-3 text-left text-xs transition cursor-pointer ${
                          selectedChannel === b.bankCode
                            ? 'border-cyan-400 bg-cyan-500/10 text-white'
                            : 'border-white/10 bg-[#0d1324] text-slate-300'
                        }`}
                      >
                        <div className="font-bold">{b.bankName}</div>
                        <div className="font-mono text-[11px] text-slate-400 mt-0.5">
                          {b.accountNumber} · {b.accountHolder}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {paymentMethod === 'EWALLET' && paymentSettings && (
                <div>
                  <label className="block text-xs text-slate-400 mb-2">
                    Pilih Dompet Digital (E-Wallet)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {paymentSettings.ewallets.map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => setSelectedChannel(w.provider)}
                        className={`rounded-xl border p-3 text-center text-xs font-bold transition cursor-pointer ${
                          selectedChannel === w.provider
                            ? 'border-cyan-400 bg-cyan-500/15 text-cyan-200'
                            : 'border-white/10 bg-[#0d1324] text-slate-300'
                        }`}
                      >
                        {w.provider}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {paymentMethod === 'WEB3_CRYPTO' && paymentSettings && (
                <div>
                  <label className="block text-xs text-slate-400 mb-2">
                    Pilih Jaringan Blockchain EVM
                  </label>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {paymentSettings.web3.chains.map((ch) => {
                      const val = `${ch.name} (${ch.symbol})`;
                      return (
                        <button
                          key={ch.chainId}
                          type="button"
                          onClick={() => setSelectedChannel(val)}
                          className={`rounded-xl border p-3 text-left text-xs transition cursor-pointer ${
                            selectedChannel === val
                              ? 'border-violet-400 bg-violet-500/15 text-white'
                              : 'border-white/10 bg-[#0d1324] text-slate-300'
                          }`}
                        >
                          <div className="font-bold text-violet-200">{ch.name}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Token: {ch.acceptedTokens.join(', ')}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Customer Info */}
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Nama Lengkap *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#0d1324] px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Email Invoice *
                  </label>
                  <input
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#0d1324] px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    No. WhatsApp *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="0812xxxxxxxx"
                    className="w-full rounded-xl border border-white/10 bg-[#0d1324] px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || cart.length === 0}
                className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-500 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/20 hover:brightness-110 disabled:opacity-50 cursor-pointer"
              >
                {loading
                  ? 'Membuat Invoice...'
                  : `Buat Invoice & Bayar (${formatIdr(estimatedTotal)})`}
              </button>
            </form>
          ) : (
            /* STEP 2: Payment Instructions, QRIS / Bank / E-Wallet / Web3 & Proof Upload */
            <div className="space-y-5">
              {/* Status Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0d1324] p-4">
                <div>
                  <p className="text-[11px] text-slate-400">
                    Dibuat {formatDateId(activeOrder.createdAt)} · Metode:{' '}
                    <strong className="text-white">{activeOrder.paymentChannel}</strong>
                  </p>
                  <div className="mt-1 font-mono text-2xl font-bold text-cyan-300">
                    {formatIdr(activeOrder.totalIdr)}
                  </div>
                  {activeOrder.uniqueCode > 0 && (
                    <p className="text-[11px] text-amber-300 mt-0.5">
                      Termasuk kode unik <strong>+{activeOrder.uniqueCode}</strong> untuk
                      mempercepat verifikasi transfer.
                    </p>
                  )}
                </div>
                <span
                  className={`rounded-xl border px-3 py-1.5 text-xs font-bold ${
                    getOrderStatusMeta(activeOrder.status).badgeClass
                  }`}
                >
                  {getOrderStatusMeta(activeOrder.status).label}
                </span>
              </div>

              {successMsg && (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-emerald-200 leading-relaxed">
                    <p className="font-bold text-emerald-300">Berhasil!</p>
                    <p>{successMsg}</p>
                  </div>
                </div>
              )}

              {/* PAID STATE SUMMARY */}
              {activeOrder.status === 'PAID' ? (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center space-y-4">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
                    <ShieldCheck className="h-8 w-8" />
                  </div>
                  <div>
                    <h4 className="font-display text-xl font-bold text-white">
                      Pembayaran Lunas & Aktif!
                    </h4>
                    <p className="mt-1 text-xs text-slate-300">
                      Semua kursus, license key produk digital, atau tracker proyek jasa
                      Anda sudah tersedia di <strong>Dashboard Saya</strong>.
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-950/60 p-3 text-left text-xs space-y-1.5">
                    {activeOrder.items.map((it) => (
                      <div key={it.id} className="flex justify-between gap-2">
                        <span className="text-slate-300">{it.itemTitle}</span>
                        {it.licenseKey && (
                          <span className="font-mono text-emerald-300">
                            {it.licenseKey}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={onClose}
                    className="rounded-xl bg-emerald-400 px-6 py-2.5 text-xs font-bold text-slate-950 hover:brightness-110 cursor-pointer"
                  >
                    Tutup & Buka Dashboard Saya
                  </button>
                </div>
              ) : (
                <>
                  {/* QRIS PANEL */}
                  {activeOrder.paymentMethod === 'QRIS' && (
                    <div className="rounded-2xl border border-cyan-500/25 bg-[#0d1324] p-5 text-center space-y-4">
                      <div className="flex items-center justify-between text-xs text-slate-300">
                        <span className="font-bold text-white">
                          QRIS {paymentSettings?.qris.merchantName || 'BOYANG DIGITAL'}
                        </span>
                        <span className="font-mono text-[11px] text-cyan-300">
                          NMID: {paymentSettings?.qris.nmid || 'ID1026000889911'}
                        </span>
                      </div>

                      <div className="mx-auto inline-block rounded-2xl bg-white p-3 shadow-xl">
                        {paymentSettings?.qris.customImageUrl ? (
                          <img
                            src={paymentSettings.qris.customImageUrl}
                            alt="QRIS Boyang Digital"
                            className="h-56 w-56 object-contain"
                          />
                        ) : qrisDataUrl ? (
                          <img
                            src={qrisDataUrl}
                            alt="QRIS Dinamis Boyang Digital"
                            className="h-56 w-56"
                          />
                        ) : (
                          <div className="flex h-56 w-56 items-center justify-center text-xs text-slate-900">
                            Memuat QRIS...
                          </div>
                        )}
                      </div>

                      <p className="text-xs text-slate-300 max-w-md mx-auto">
                        Scan kode QRIS di atas melalui aplikasi{' '}
                        <strong>BCA Mobile, Livin Mandiri, GoPay, OVO, DANA, ShopeePay</strong>{' '}
                        atau dompet QRIS lainnya. Nominal otomatis terisi sesuai tagihan.
                      </p>

                      <div className="flex flex-wrap justify-center gap-2">
                        {qrisDataUrl && (
                          <a
                            href={qrisDataUrl}
                            download={`QRIS-${activeOrder.invoiceNumber}.png`}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2 text-xs font-semibold text-white hover:bg-white/10"
                          >
                            <Download className="h-3.5 w-3.5" /> Unduh QRIS PNG
                          </a>
                        )}
                        {paymentSettings?.sandboxMode && (
                          <button
                            type="button"
                            onClick={handleSandboxInstantPay}
                            disabled={loading}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-2 text-xs font-bold text-slate-950 hover:brightness-110 cursor-pointer"
                          >
                            <Zap className="h-3.5 w-3.5" /> Simulasi Bayar QRIS Instan (Demo)
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* BANK TRANSFER PANEL */}
                  {activeOrder.paymentMethod === 'BANK_TRANSFER' && selectedBank && (
                    <div className="rounded-2xl border border-white/15 bg-[#0d1324] p-5 space-y-3">
                      <div className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                        Transfer ke Rekening {selectedBank.bankName}
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/60 p-3.5">
                        <div>
                          <div className="text-[11px] text-slate-400">Nomor Rekening</div>
                          <div className="font-mono text-lg font-bold text-white">
                            {selectedBank.accountNumber}
                          </div>
                          <div className="text-xs text-slate-300 mt-0.5">
                            a.n. {selectedBank.accountHolder}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            copyText('bank', selectedBank.accountNumber)
                          }
                          className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-200 cursor-pointer"
                        >
                          {copiedKey === 'bank' ? (
                            <>
                              <Check className="h-3.5 w-3.5" /> Tersalin
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" /> Salin No. Rek
                            </>
                          )}
                        </button>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/60 px-3.5 py-2.5 text-xs">
                        <span className="text-slate-400">Transfer Nominal Tepat</span>
                        <button
                          type="button"
                          onClick={() =>
                            copyText('total', String(activeOrder.totalIdr))
                          }
                          className="inline-flex items-center gap-1.5 font-mono font-bold text-cyan-300 cursor-pointer"
                        >
                          {formatIdr(activeOrder.totalIdr)}
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* E-WALLET PANEL */}
                  {activeOrder.paymentMethod === 'EWALLET' && selectedEwallet && (
                    <div className="rounded-2xl border border-white/15 bg-[#0d1324] p-5 space-y-3">
                      <div className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                        Pembayaran E-Wallet {selectedEwallet.provider}
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/60 p-3.5">
                        <div>
                          <div className="text-[11px] text-slate-400">
                            Nomor / ID {selectedEwallet.provider}
                          </div>
                          <div className="font-mono text-lg font-bold text-white">
                            {selectedEwallet.accountNumber}
                          </div>
                          <div className="text-xs text-slate-300 mt-0.5">
                            {selectedEwallet.accountName}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            copyText('ew', selectedEwallet.accountNumber)
                          }
                          className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-200 cursor-pointer"
                        >
                          {copiedKey === 'ew' ? (
                            <>
                              <Check className="h-3.5 w-3.5" /> Tersalin
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" /> Salin Nomor
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-slate-400">
                        {selectedEwallet.instructions}
                      </p>
                    </div>
                  )}

                  {/* WEB3 CRYPTO PANEL */}
                  {activeOrder.paymentMethod === 'WEB3_CRYPTO' && paymentSettings && (
                    <div className="rounded-2xl border border-violet-500/30 bg-violet-500/10 p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-violet-300">
                          Web3 Treasury Payment ({selectedChain?.name})
                        </span>
                        <span className="font-mono text-xs text-violet-200">
                          ≈{' '}
                          {(
                            activeOrder.totalIdr / (selectedChain?.idrPerToken || 48000000)
                          ).toFixed(6)}{' '}
                          {selectedChain?.symbol}
                        </span>
                      </div>

                      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/70 p-3">
                        <div className="min-w-0 pr-2">
                          <div className="text-[11px] text-slate-400">
                            Alamat Treasury Boyang Digital ({paymentSettings.web3.ensDomain})
                          </div>
                          <div className="font-mono text-xs text-white truncate">
                            {paymentSettings.web3.treasuryAddress}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            copyText('w3', paymentSettings.web3.treasuryAddress)
                          }
                          className="shrink-0 rounded-lg border border-violet-400/30 bg-violet-500/20 px-2.5 py-1.5 text-xs text-violet-200 cursor-pointer"
                        >
                          {copiedKey === 'w3' ? 'Tersalin' : 'Salin'}
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={handlePayWithConnectedWallet}
                          disabled={loading}
                          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 px-4 py-2.5 text-xs font-bold text-white hover:brightness-110 cursor-pointer"
                        >
                          <Wallet className="h-4 w-4" />
                          Kirim Langsung via MetaMask / Wallet
                        </button>
                        {paymentSettings.sandboxMode && (
                          <button
                            type="button"
                            onClick={handleSandboxInstantPay}
                            disabled={loading}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-2.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/25 cursor-pointer"
                          >
                            <Zap className="h-3.5 w-3.5" /> Simulasi On-Chain Confirmed
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* PROOF UPLOAD / CONFIRMATION FORM */}
                  <form
                    onSubmit={handleSubmitProof}
                    className="rounded-2xl border border-white/10 bg-[#0d1324] p-5 space-y-3"
                  >
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Konfirmasi & Unggah Bukti Pembayaran
                    </h4>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          Nama Pengirim / Pemilik Rekening
                        </label>
                        <input
                          type="text"
                          value={senderName}
                          onChange={(e) => setSenderName(e.target.value)}
                          placeholder="Nama di rekening / e-wallet"
                          className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          {activeOrder.paymentMethod === 'WEB3_CRYPTO'
                            ? 'Transaction Hash (0x...)'
                            : 'No. Referensi / Catatan'}
                        </label>
                        <input
                          type="text"
                          value={
                            activeOrder.paymentMethod === 'WEB3_CRYPTO'
                              ? web3TxHash
                              : paymentReference
                          }
                          onChange={(e) =>
                            activeOrder.paymentMethod === 'WEB3_CRYPTO'
                              ? setWeb3TxHash(e.target.value)
                              : setPaymentReference(e.target.value)
                          }
                          placeholder={
                            activeOrder.paymentMethod === 'WEB3_CRYPTO'
                              ? '0x...'
                              : 'Opsional'
                          }
                          className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 font-mono text-xs text-white focus:border-cyan-400 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Upload Bukti Screenshot / Struk Transfer (JPG/PNG/PDF, max 5MB)
                      </label>
                      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-slate-950/50 py-3 px-4 text-xs text-slate-300 hover:border-cyan-400/50">
                        <Upload className="h-4 w-4 text-cyan-400" />
                        <span>
                          {proofFile
                            ? proofFile.name
                            : 'Klik untuk pilih file bukti pembayaran'}
                        </span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) =>
                            setProofFile(e.target.files?.[0] || null)
                          }
                        />
                      </label>
                    </div>

                    {activeOrder.paymentProofUrl && (
                      <a
                        href={activeOrder.paymentProofUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Lihat bukti yang sudah diunggah
                      </a>
                    )}

                    {error && (
                      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-xl bg-white px-4 py-3 text-xs font-bold text-slate-950 hover:bg-slate-200 transition cursor-pointer"
                    >
                      {loading
                        ? 'Mengirim...'
                        : 'Kirim Konfirmasi Pembayaran ke Admin'}
                    </button>
                  </form>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
