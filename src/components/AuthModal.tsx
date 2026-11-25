import React, { useState } from 'react';
import {
  KeyRound,
  LogIn,
  Shield,
  User as UserIcon,
  UserPlus,
  Wallet,
  X,
} from 'lucide-react';
import type { User } from '../types';
import { api } from '../lib/api';
import { connectInjectedWallet, signPersonalMessage } from '../lib/web3';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res =
        mode === 'LOGIN'
          ? await api.login({ email, password })
          : await api.register({ name, email, password, phone });
      onSuccess(res.user);
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleWeb3Login = async () => {
    setError('');
    setLoading(true);
    try {
      const { address } = await connectInjectedWallet();
      const { nonce, message } = await api.web3Nonce(address);
      const signature = await signPersonalMessage(address, message);
      const res = await api.web3Verify({
        walletAddress: address,
        signature,
        nonce,
        message,
      });
      onSuccess(res.user);
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const quickFillDemo = async (role: 'USER' | 'ADMIN') => {
    setMode('LOGIN');
    setError('');
    setLoading(true);
    const creds =
      role === 'ADMIN'
        ? { email: 'admin@boyangdigital.id', password: 'AdminBoyang#2026' }
        : { email: 'user@boyangdigital.id', password: 'UserBoyang#2026' };
    try {
      const res = await api.login(creds);
      onSuccess(res.user);
      onClose();
    } catch (err: unknown) {
      setEmail(creds.email);
      setPassword(creds.password);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/15 bg-[#090d1a] p-6 sm:p-7 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-cyan-400">
            BOYANG DIGITAL ACCOUNT
          </span>
          <h3 className="mt-1 font-display text-2xl font-bold text-white">
            {mode === 'LOGIN' ? 'Masuk ke Ekosistem' : 'Buat Akun Baru'}
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Akses kursus, unduh produk digital, pantau proyek jasa & kelola transaksi.
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="mb-5 grid grid-cols-2 rounded-xl border border-white/10 bg-slate-950/60 p-1">
          <button
            type="button"
            onClick={() => {
              setMode('LOGIN');
              setError('');
            }}
            className={`rounded-lg py-2 text-xs font-semibold transition cursor-pointer ${
              mode === 'LOGIN'
                ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Masuk
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('REGISTER');
              setError('');
            }}
            className={`rounded-lg py-2 text-xs font-semibold transition cursor-pointer ${
              mode === 'REGISTER'
                ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Daftar Akun
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'REGISTER' && (
            <>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama Anda"
                  className="w-full rounded-xl border border-white/10 bg-[#0e1526] px-3.5 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  No. WhatsApp / HP
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0812xxxxxxxx"
                  className="w-full rounded-xl border border-white/10 bg-[#0e1526] px-3.5 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs text-slate-400 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className="w-full rounded-xl border border-white/10 bg-[#0e1526] px-3.5 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              className="w-full rounded-xl border border-white/10 bg-[#0e1526] px-3.5 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-500 py-3 text-sm font-bold text-slate-950 hover:brightness-110 disabled:opacity-60 transition cursor-pointer"
          >
            {mode === 'LOGIN' ? (
              <>
                <LogIn className="h-4 w-4" /> Masuk Sekarang
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" /> Daftar & Masuk
              </>
            )}
          </button>
        </form>

        {/* Web3 Sign-In */}
        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-[11px] text-slate-500">atau otentikasi Web3</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <button
          type="button"
          onClick={handleWeb3Login}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-violet-500/35 bg-violet-500/10 py-2.5 text-xs font-semibold text-violet-200 hover:bg-violet-500/20 transition cursor-pointer"
        >
          <Wallet className="h-4 w-4 text-violet-400" />
          Sign-In With Ethereum (MetaMask / EVM)
        </button>

        {/* Quick Multi-Role Demo Access */}
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
            <KeyRound className="h-3.5 w-3.5 text-cyan-400" />
            Akses Cepat Demo Multi-Role
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => quickFillDemo('USER')}
              disabled={loading}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20 cursor-pointer"
            >
              <UserIcon className="h-3.5 w-3.5" />
              Login User Demo
            </button>
            <button
              type="button"
              onClick={() => quickFillDemo('ADMIN')}
              disabled={loading}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-500/20 cursor-pointer"
            >
              <Shield className="h-3.5 w-3.5" />
              Login Admin Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
