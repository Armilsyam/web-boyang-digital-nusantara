import React, { useState } from 'react';
import {
  Award,
  CheckCircle2,
  Cloud,
  Cpu,
  Lock,
  Search,
  Send,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { api, type VerificationResult } from '../lib/api';
import { formatDateId, shortenAddress } from '../lib/format';

export const Web3AndVerifySection: React.FC = () => {
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyResult, setVerifyResult] = useState<VerificationResult | null>(null);
  const [verifyError, setVerifyError] = useState('');
  const [verifying, setVerifying] = useState(false);

  const [consultForm, setConsultForm] = useState({
    name: '',
    email: '',
    whatsapp: '',
    serviceInterest: 'Fullstack Website & SaaS',
    budgetRange: 'Rp 5 Juta - Rp 15 Juta',
    message: '',
  });
  const [consultSending, setConsultSending] = useState(false);
  const [consultSuccess, setConsultSuccess] = useState('');
  const [consultError, setConsultError] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyCode.trim()) return;
    setVerifying(true);
    setVerifyError('');
    setVerifyResult(null);
    try {
      const res = await api.verifyPublicCode(verifyCode.trim());
      setVerifyResult(res);
    } catch (err: unknown) {
      setVerifyError((err as Error).message);
    } finally {
      setVerifying(false);
    }
  };

  const handleConsultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConsultSending(true);
    setConsultError('');
    setConsultSuccess('');
    try {
      const res = await api.submitConsultation(consultForm);
      setConsultSuccess(res.message);
      setConsultForm({
        name: '',
        email: '',
        whatsapp: '',
        serviceInterest: 'Fullstack Website & SaaS',
        budgetRange: 'Rp 5 Juta - Rp 15 Juta',
        message: '',
      });
    } catch (err: unknown) {
      setConsultError((err as Error).message);
    } finally {
      setConsultSending(false);
    }
  };

  return (
    <div className="border-t border-white/[0.06] bg-[#060913]">
      {/* Web3 & Architecture Section */}
      <section id="web3-hub" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
          {/* Left: Web3 & Cloud Hosting Readiness */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-violet-400">
                Arsitektur Modern & Fleksibel Web3
              </span>
              <h2 className="mt-2 font-display text-3xl font-bold text-white">
                Siap Skala Web2 Hari Ini, Tangguh Menuju Ekosistem Web3
              </h2>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                Boyang Digital dirancang modular agar dapat langsung di-hosting ke
                VPS, Docker, Railway, maupun Cloud Run sekaligus siap berintegrasi
                dengan jaringan blockchain EVM.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-[#0b101e] p-5">
                <Wallet className="h-6 w-6 text-violet-400 mb-3" />
                <h3 className="font-display text-base font-bold text-white">
                  Sign-In With Ethereum (SIWE)
                </h3>
                <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                  Pengguna bisa masuk atau menautkan wallet MetaMask/Rabby menggunakan
                  verifikasi tanda tangan kriptografi <code className="text-violet-300">personal_sign</code>{' '}
                  yang diverifikasi aman di backend Viem.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0b101e] p-5">
                <Award className="h-6 w-6 text-cyan-400 mb-3" />
                <h3 className="font-display text-base font-bold text-white">
                  Sertifikat & Lisensi Terverifikasi
                </h3>
                <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                  Setiap sertifikat kelulusan kursus dan lisensi produk digital
                  memiliki kode unik + SHA-256 attestation hash siap minting ke
                  Soulbound NFT.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0b101e] p-5">
                <Cpu className="h-6 w-6 text-emerald-400 mb-3" />
                <h3 className="font-display text-base font-bold text-white">
                  Hybrid Fiat QRIS & Crypto EVM
                </h3>
                <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                  Terima Rupiah via QRIS Dinamis, BCA, Mandiri, BNI, BRI, GoPay, OVO,
                  DANA sekaligus pembayaran langsung di Base, Polygon, Arbitrum &
                  Ethereum.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0b101e] p-5">
                <Cloud className="h-6 w-6 text-amber-400 mb-3" />
                <h3 className="font-display text-base font-bold text-white">
                  Cloud & VPS Hosting Ready
                </h3>
                <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                  Dibangun dalam satu Node.js server terpadu dengan SQLite WAL,
                  Dockerfile, railway.toml, dan panduan deploy lengkap untuk produksi.
                </p>
              </div>
            </div>
          </div>

          {/* Right: Public Certificate & License Verifier */}
          <div className="lg:col-span-5 rounded-3xl border border-violet-500/25 bg-[#0b101e] p-6 shadow-xl">
            <div className="flex items-center gap-2.5 mb-2">
              <ShieldCheck className="h-5 w-5 text-violet-400" />
              <h3 className="font-display text-lg font-bold text-white">
                Verifikasi Sertifikat & Lisensi
              </h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Masukkan Kode Sertifikat Kursus (<code className="text-slate-300">CERT-BD-...</code>)
              atau License Key Produk (<code className="text-slate-300">BYD-...</code>) untuk
              mengecek keaslian & hash attestasi.
            </p>

            <form onSubmit={handleVerify} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  placeholder="Contoh: CERT-BD-2026-..."
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 py-2.5 pl-9 pr-3 font-mono text-xs text-white focus:border-violet-400 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={verifying}
                className="rounded-xl bg-violet-500 px-4 py-2.5 text-xs font-bold text-white hover:bg-violet-400 transition cursor-pointer"
              >
                {verifying ? 'Cek...' : 'Verifikasi'}
              </button>
            </form>

            {verifyError && (
              <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                {verifyError}
              </div>
            )}

            {verifyResult && (
              <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 font-bold text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" />
                    {verifyResult.kind === 'COURSE_CERTIFICATE'
                      ? 'Sertifikat Terdaftar'
                      : 'Lisensi Komersial Aktif'}
                  </span>
                  <span className="font-mono text-[10px] text-emerald-200 bg-emerald-500/20 px-2 py-0.5 rounded">
                    {verifyResult.standard}
                  </span>
                </div>
                <div className="pt-1 space-y-1 text-slate-200">
                  <div>
                    <span className="text-slate-400">Judul:</span>{' '}
                    <strong>{verifyResult.title}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Pemilik:</span>{' '}
                    {verifyResult.ownerName}
                    {verifyResult.ownerWallet &&
                      ` (${shortenAddress(verifyResult.ownerWallet)})`}
                  </div>
                  <div>
                    <span className="text-slate-400">Status:</span>{' '}
                    {verifyResult.status}
                    {verifyResult.progressPercent !== undefined &&
                      ` (${verifyResult.progressPercent}%)`}
                  </div>
                  {verifyResult.issuedAt && (
                    <div>
                      <span className="text-slate-400">Tanggal Terbit:</span>{' '}
                      {formatDateId(verifyResult.issuedAt)}
                    </div>
                  )}
                  {verifyResult.attestationHash && (
                    <div className="pt-1">
                      <span className="text-slate-400 block">Attestation Hash:</span>
                      <code className="block break-all rounded bg-black/40 p-1.5 font-mono text-[10px] text-violet-300 mt-0.5">
                        {verifyResult.attestationHash}
                      </code>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="mt-5 rounded-xl border border-white/10 bg-slate-950/50 p-3 flex items-center gap-2.5 text-[11px] text-slate-400">
              <Lock className="h-4 w-4 text-cyan-400 shrink-0" />
              <span>
                Kode sertifikat & lisensi dibuat otomatis saat Anda menyelesaikan kursus
                atau membeli produk di Boyang Digital.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Consultation Form Section */}
      <section
        id="konsultasi"
        className="border-t border-white/[0.06] mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#0d1426] via-[#0a0f1d] to-[#080b14] p-6 sm:p-10">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-5 space-y-4">
              <span className="text-xs font-semibold uppercase tracking-widest text-cyan-400">
                Konsultasi Gratis
              </span>
              <h2 className="font-display text-3xl font-bold text-white">
                Punya Proyek Custom atau Roadmap Web3?
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Diskusikan kebutuhan website, sistem SaaS, otomasi AI, atau smart
                contract bisnis Anda bersama tim arsitek Boyang Digital. Gratis estimasi
                waktu dan anggaran.
              </p>
              <div className="space-y-2 text-xs text-slate-300 pt-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Respon cepat dalam &lt; 2 jam kerja via WhatsApp/Email</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Mendukung NDA & perjanjian kerja resmi</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Opsi pembayaran bertahap (termin) via QRIS/Bank/Crypto</span>
                </div>
              </div>
            </div>

            <form
              onSubmit={handleConsultSubmit}
              className="lg:col-span-7 grid gap-3.5 sm:grid-cols-2"
            >
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nama Anda *</label>
                <input
                  type="text"
                  required
                  value={consultForm.name}
                  onChange={(e) =>
                    setConsultForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Nama lengkap"
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3.5 py-2.5 text-xs text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={consultForm.email}
                  onChange={(e) =>
                    setConsultForm((f) => ({ ...f, email: e.target.value }))
                  }
                  placeholder="email@bisnis.com"
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3.5 py-2.5 text-xs text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  No. WhatsApp *
                </label>
                <input
                  type="text"
                  required
                  value={consultForm.whatsapp}
                  onChange={(e) =>
                    setConsultForm((f) => ({ ...f, whatsapp: e.target.value }))
                  }
                  placeholder="0812xxxxxxxx"
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3.5 py-2.5 text-xs text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Bidang Layanan
                </label>
                <select
                  value={consultForm.serviceInterest}
                  onChange={(e) =>
                    setConsultForm((f) => ({ ...f, serviceInterest: e.target.value }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3.5 py-2.5 text-xs text-white focus:border-cyan-400 focus:outline-none"
                >
                  <option>Fullstack Website & SaaS</option>
                  <option>Web3, Smart Contract & dApp</option>
                  <option>AI Agent & Workflow Automation</option>
                  <option>Mobile App (Android / iOS)</option>
                  <option>UI/UX & Brand Identity</option>
                  <option>Corporate Training / Kursus Tim</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">
                  Estimasi Budget
                </label>
                <select
                  value={consultForm.budgetRange}
                  onChange={(e) =>
                    setConsultForm((f) => ({ ...f, budgetRange: e.target.value }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3.5 py-2.5 text-xs text-white focus:border-cyan-400 focus:outline-none"
                >
                  <option>Di bawah Rp 5 Juta</option>
                  <option>Rp 5 Juta - Rp 15 Juta</option>
                  <option>Rp 15 Juta - Rp 50 Juta</option>
                  <option>Enterprise (&gt; Rp 50 Juta)</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">
                  Ceritakan Kebutuhan Proyek Anda *
                </label>
                <textarea
                  rows={3}
                  required
                  value={consultForm.message}
                  onChange={(e) =>
                    setConsultForm((f) => ({ ...f, message: e.target.value }))
                  }
                  placeholder="Jelaskan tujuan, target peluncuran, atau fitur khusus yang diinginkan..."
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3.5 py-2.5 text-xs text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>

              {consultError && (
                <div className="sm:col-span-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                  {consultError}
                </div>
              )}
              {consultSuccess && (
                <div className="sm:col-span-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                  {consultSuccess}
                </div>
              )}

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={consultSending}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-500 py-3 text-xs sm:text-sm font-bold text-slate-950 hover:brightness-110 transition cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                  {consultSending ? 'Mengirim...' : 'Kirim Permintaan Konsultasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};
