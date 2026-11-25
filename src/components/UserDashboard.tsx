import React, { useEffect, useState } from 'react';
import {
  Award,
  BookOpen,
  Briefcase,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  GraduationCap,
  KeyRound,
  LayoutDashboard,
  PlayCircle,
  RefreshCw,
  ShieldCheck,
  Unlink,
  User as UserIcon,
  Wallet,
} from 'lucide-react';
import type { CourseEnrollment, Order, User } from '../types';
import { api, type UserDashboardResponse } from '../lib/api';
import {
  formatDateId,
  formatIdr,
  getOrderStatusMeta,
  getServiceStatusMeta,
  shortenAddress,
} from '../lib/format';
import { connectInjectedWallet, signPersonalMessage } from '../lib/web3';

interface UserDashboardProps {
  user: User;
  onUserUpdated: (user: User) => void;
  onOpenOrderModal: (order: Order) => void;
  onExploreCatalog: () => void;
}

type UserTab =
  | 'OVERVIEW'
  | 'COURSES'
  | 'PRODUCTS'
  | 'SERVICES'
  | 'ORDERS'
  | 'PROFILE';

export const UserDashboard: React.FC<UserDashboardProps> = ({
  user,
  onUserUpdated,
  onOpenOrderModal,
  onExploreCatalog,
}) => {
  const [tab, setTab] = useState<UserTab>('OVERVIEW');
  const [data, setData] = useState<UserDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeEnrollmentId, setActiveEnrollmentId] = useState<string | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [showCertModal, setShowCertModal] = useState<CourseEnrollment | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Profile state
  const [profileName, setProfileName] = useState(user.name);
  const [profilePhone, setProfilePhone] = useState(user.phone || '');
  const [newPassword, setNewPassword] = useState('');
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.getUserDashboard();
      setData(res);
      if (res.enrollments.length > 0 && !activeEnrollmentId) {
        const firstEnr = res.enrollments[0];
        setActiveEnrollmentId(firstEnr.id);
        const firstLesson =
          firstEnr.course?.metadata.modules?.[0]?.lessons?.[0]?.id || null;
        setActiveLessonId(firstLesson);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const copyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleToggleLesson = async (courseId: string, lessonId: string) => {
    try {
      const res = await api.toggleLesson(courseId, lessonId);
      setData((prev) =>
        prev
          ? {
              ...prev,
              enrollments: prev.enrollments.map((e) =>
                e.id === res.enrollment.id ? res.enrollment : e
              ),
            }
          : prev
      );
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleBindWallet = async () => {
    setProfileErr('');
    setProfileMsg('');
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
      onUserUpdated(res.user);
      setProfileMsg('Wallet Web3 berhasil diverifikasi dan ditautkan ke akun Anda!');
    } catch (err: unknown) {
      setProfileErr((err as Error).message);
    }
  };

  const handleUnlinkWallet = async () => {
    try {
      const res = await api.web3Unlink();
      onUserUpdated(res.user);
      setProfileMsg('Tautan wallet Web3 dilepas.');
    } catch (err: unknown) {
      setProfileErr((err as Error).message);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileErr('');
    setProfileMsg('');
    try {
      const res = await api.updateProfile({
        name: profileName,
        phone: profilePhone,
        newPassword: newPassword || undefined,
      });
      onUserUpdated(res.user);
      setNewPassword('');
      setProfileMsg('Profil berhasil diperbarui.');
    } catch (err: unknown) {
      setProfileErr((err as Error).message);
    }
  };

  const activeEnrollment =
    data?.enrollments.find((e) => e.id === activeEnrollmentId) ||
    data?.enrollments[0] ||
    null;

  const activeLesson =
    activeEnrollment?.course?.metadata.modules
      ?.flatMap((m) => m.lessons)
      .find((l) => l.id === activeLessonId) ||
    activeEnrollment?.course?.metadata.modules?.[0]?.lessons?.[0] ||
    null;

  const navTabs: Array<{
    id: UserTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
  }> = [
    { id: 'OVERVIEW', label: 'Ringkasan', icon: LayoutDashboard },
    {
      id: 'COURSES',
      label: 'Kursus Saya',
      icon: GraduationCap,
      count: data?.enrollments.length || 0,
    },
    {
      id: 'PRODUCTS',
      label: 'Produk Digital',
      icon: Code2,
      count: data?.digitalProducts.length || 0,
    },
    {
      id: 'SERVICES',
      label: 'Proyek Jasa',
      icon: Briefcase,
      count: data?.serviceProjects.length || 0,
    },
    {
      id: 'ORDERS',
      label: 'Transaksi & Invoice',
      icon: CreditCard,
      count: data?.orders.length || 0,
    },
    { id: 'PROFILE', label: 'Profil & Web3', icon: UserIcon },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-[#0b101e] p-6">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-cyan-400">
            PORTAL MEMBER · BOYANG DIGITAL
          </span>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-white">
            Halo, {user.name}
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            {user.email}{' '}
            {user.walletAddress && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-violet-500/15 border border-violet-500/30 px-2 py-0.5 font-mono text-[11px] text-violet-300">
                <Wallet className="h-3 w-3" /> {shortenAddress(user.walletAddress)}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadDashboard}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-white/[0.08] cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button
            onClick={onExploreCatalog}
            className="rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-500 px-4 py-2 text-xs font-bold text-slate-950 hover:brightness-110 cursor-pointer"
          >
            + Belanja / Pesan Jasa
          </button>
        </div>
      </div>

      {/* Sub-navigation */}
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
                  ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-200'
                  : 'border-white/10 bg-[#0b101e] text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{t.label}</span>
              {t.count !== undefined && (
                <span className="rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-[10px]">
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading && !data ? (
        <div className="h-64 animate-pulse rounded-3xl border border-white/10 bg-[#0b101e]" />
      ) : (
        <>
          {/* OVERVIEW TAB */}
          {tab === 'OVERVIEW' && data && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <button
                  onClick={() => setTab('COURSES')}
                  className="text-left rounded-2xl border border-white/10 bg-[#0b101e] p-5 hover:border-indigo-400/40 transition cursor-pointer"
                >
                  <GraduationCap className="h-6 w-6 text-indigo-400 mb-3" />
                  <div className="font-mono text-2xl font-bold text-white">
                    {data.enrollments.length}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Kursus Aktif & LMS
                  </div>
                </button>
                <button
                  onClick={() => setTab('PRODUCTS')}
                  className="text-left rounded-2xl border border-white/10 bg-[#0b101e] p-5 hover:border-emerald-400/40 transition cursor-pointer"
                >
                  <Code2 className="h-6 w-6 text-emerald-400 mb-3" />
                  <div className="font-mono text-2xl font-bold text-white">
                    {data.digitalProducts.length}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Produk Digital & Lisensi
                  </div>
                </button>
                <button
                  onClick={() => setTab('SERVICES')}
                  className="text-left rounded-2xl border border-white/10 bg-[#0b101e] p-5 hover:border-cyan-400/40 transition cursor-pointer"
                >
                  <Briefcase className="h-6 w-6 text-cyan-400 mb-3" />
                  <div className="font-mono text-2xl font-bold text-white">
                    {data.serviceProjects.length}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Proyek Jasa Digital
                  </div>
                </button>
                <button
                  onClick={() => setTab('ORDERS')}
                  className="text-left rounded-2xl border border-white/10 bg-[#0b101e] p-5 hover:border-amber-400/40 transition cursor-pointer"
                >
                  <CreditCard className="h-6 w-6 text-amber-400 mb-3" />
                  <div className="font-mono text-2xl font-bold text-white">
                    {data.orders.length}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Total Transaksi Invoice
                  </div>
                </button>
              </div>

              {/* Web3 Wallet Banner */}
              <div className="rounded-2xl border border-violet-500/25 bg-violet-500/10 p-5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/20 text-violet-300">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Identitas Web3 & Attestasi Sertifikat
                    </h3>
                    <p className="text-xs text-violet-200/80">
                      {user.walletAddress
                        ? `Terhubung dengan alamat ${user.walletAddress}`
                        : 'Tautkan MetaMask / EVM wallet Anda untuk verifikasi sertifikat dan transaksi crypto.'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setTab('PROFILE')}
                  className="rounded-xl border border-violet-400/40 bg-violet-500/20 px-4 py-2 text-xs font-semibold text-violet-100 hover:bg-violet-500/30 cursor-pointer"
                >
                  {user.walletAddress ? 'Kelola Wallet' : 'Tautkan Wallet Web3'}
                </button>
              </div>
            </div>
          )}

          {/* COURSES LMS TAB */}
          {tab === 'COURSES' && data && (
            <div className="space-y-6">
              {data.enrollments.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-[#0b101e] p-12 text-center space-y-3">
                  <GraduationCap className="mx-auto h-10 w-10 text-slate-500" />
                  <p className="text-sm font-semibold text-slate-300">
                    Anda belum memiliki kursus aktif.
                  </p>
                  <button
                    onClick={onExploreCatalog}
                    className="rounded-xl bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950 cursor-pointer"
                  >
                    Jelajahi Kursus Academy
                  </button>
                </div>
              ) : (
                <>
                  {/* Course Selector Pills */}
                  <div className="flex flex-wrap gap-2.5">
                    {data.enrollments.map((enr) => (
                      <button
                        key={enr.id}
                        onClick={() => {
                          setActiveEnrollmentId(enr.id);
                          setActiveLessonId(
                            enr.course?.metadata.modules?.[0]?.lessons?.[0]?.id ||
                              null
                          );
                        }}
                        className={`rounded-xl border px-4 py-2.5 text-left text-xs transition cursor-pointer ${
                          activeEnrollment?.id === enr.id
                            ? 'border-indigo-400 bg-indigo-500/15 text-white'
                            : 'border-white/10 bg-[#0b101e] text-slate-400'
                        }`}
                      >
                        <div className="font-bold">{enr.course?.title}</div>
                        <div className="mt-0.5 font-mono text-[11px] text-cyan-300">
                          Progres: {enr.progressPercent}%
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Interactive LMS Player */}
                  {activeEnrollment && activeEnrollment.course && (
                    <div className="grid gap-6 lg:grid-cols-12">
                      {/* Left Syllabus Sidebar */}
                      <div className="lg:col-span-4 rounded-2xl border border-white/10 bg-[#0b101e] p-4 space-y-4">
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-slate-400">Progres Belajar</span>
                            <span className="font-mono font-bold text-cyan-300">
                              {activeEnrollment.progressPercent}%
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                            <div
                              className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500 transition-all"
                              style={{ width: `${activeEnrollment.progressPercent}%` }}
                            />
                          </div>
                        </div>

                        {activeEnrollment.progressPercent >= 100 && (
                          <button
                            onClick={() => setShowCertModal(activeEnrollment)}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 py-2.5 text-xs font-bold text-slate-950 cursor-pointer"
                          >
                            <Award className="h-4 w-4" />
                            Lihat Sertifikat Kelulusan
                          </button>
                        )}

                        <div className="space-y-3">
                          {activeEnrollment.course.metadata.modules?.map((mod) => (
                            <div key={mod.id} className="space-y-1.5">
                              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
                                {mod.title}
                              </div>
                              {mod.lessons.map((les) => {
                                const done =
                                  activeEnrollment.completedLessons.includes(les.id);
                                const isCurrent = activeLesson?.id === les.id;
                                return (
                                  <button
                                    key={les.id}
                                    onClick={() => setActiveLessonId(les.id)}
                                    className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-xs transition cursor-pointer ${
                                      isCurrent
                                        ? 'border-cyan-400/50 bg-cyan-500/10 text-white'
                                        : 'border-white/5 bg-white/[0.02] text-slate-300 hover:bg-white/[0.05]'
                                    }`}
                                  >
                                    <span className="flex items-center gap-2 min-w-0">
                                      {done ? (
                                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                                      ) : (
                                        <PlayCircle className="h-4 w-4 shrink-0 text-cyan-400" />
                                      )}
                                      <span className="truncate">{les.title}</span>
                                    </span>
                                    <span className="font-mono text-[10px] text-slate-500 shrink-0">
                                      {les.duration}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Right Lesson Content Viewer */}
                      <div className="lg:col-span-8 rounded-2xl border border-white/10 bg-[#0b101e] p-6 space-y-5">
                        {activeLesson ? (
                          <>
                            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
                              <div>
                                <span className="text-[11px] font-mono text-cyan-400">
                                  Durasi Materi: {activeLesson.duration}
                                </span>
                                <h2 className="mt-1 font-display text-xl font-bold text-white">
                                  {activeLesson.title}
                                </h2>
                                <p className="mt-1 text-xs text-slate-400">
                                  {activeLesson.summary}
                                </p>
                              </div>

                              <button
                                onClick={() =>
                                  handleToggleLesson(
                                    activeEnrollment.catalogItemId,
                                    activeLesson.id
                                  )
                                }
                                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold transition cursor-pointer ${
                                  activeEnrollment.completedLessons.includes(
                                    activeLesson.id
                                  )
                                    ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-300'
                                    : 'bg-cyan-400 text-slate-950 hover:brightness-110'
                                }`}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                {activeEnrollment.completedLessons.includes(
                                  activeLesson.id
                                )
                                  ? 'Selesai Dipelajari'
                                  : 'Tandai Selesai'}
                              </button>
                            </div>

                            {/* Interactive Lesson Player Canvas */}
                            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-[#0d1426] to-indigo-950/40 p-6 space-y-4">
                              <div className="flex items-center gap-2 text-xs text-cyan-300 font-semibold">
                                <BookOpen className="h-4 w-4" />
                                Materi Inti & Pembahasan Praktis
                              </div>
                              <p className="text-sm leading-relaxed text-slate-200">
                                {activeLesson.content}
                              </p>
                              {activeLesson.codeSnippet && (
                                <div className="space-y-1.5">
                                  <div className="text-[11px] font-mono text-slate-400">
                                    Contoh Implementasi Kode:
                                  </div>
                                  <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/70 p-4 font-mono text-xs text-emerald-300">
                                    {activeLesson.codeSnippet}
                                  </pre>
                                </div>
                              )}
                            </div>

                            {/* Certificate Preview Bar */}
                            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 text-xs">
                              <div>
                                <span className="text-slate-400">Kode Sertifikat: </span>
                                <code className="font-mono text-violet-300 font-semibold">
                                  {activeEnrollment.certificateCode}
                                </code>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  Selesaikan seluruh materi (100%) untuk menerbitkan
                                  sertifikat resmi Anda.
                                </p>
                              </div>
                              {activeEnrollment.progressPercent >= 100 && (
                                <button
                                  onClick={() => setShowCertModal(activeEnrollment)}
                                  className="rounded-lg bg-violet-500 px-3 py-1.5 text-xs font-bold text-white cursor-pointer"
                                >
                                  Buka Sertifikat
                                </button>
                              )}
                            </div>
                          </>
                        ) : (
                          <p className="text-sm text-slate-400">
                            Pilih materi di sebelah kiri untuk mulai belajar.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* DIGITAL PRODUCTS TAB */}
          {tab === 'PRODUCTS' && data && (
            <div className="space-y-4">
              {data.digitalProducts.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-[#0b101e] p-12 text-center space-y-3">
                  <Code2 className="mx-auto h-10 w-10 text-slate-500" />
                  <p className="text-sm font-semibold text-slate-300">
                    Belum ada produk digital yang dimiliki.
                  </p>
                  <button
                    onClick={onExploreCatalog}
                    className="rounded-xl bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950 cursor-pointer"
                  >
                    Lihat Produk Digital
                  </button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {data.digitalProducts.map((prod) => (
                    <div
                      key={prod.id}
                      className="rounded-2xl border border-white/10 bg-[#0b101e] p-5 space-y-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[11px] font-semibold text-emerald-400 uppercase">
                            {prod.category} · {String(prod.productMetadata.version || 'v1.0')}
                          </span>
                          <h3 className="mt-1 font-display text-base font-bold text-white">
                            {prod.itemTitle}
                          </h3>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Invoice: {prod.invoiceNumber}
                          </p>
                        </div>
                        <span className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                          Aktif
                        </span>
                      </div>

                      {prod.licenseKey && (
                        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/70 px-3.5 py-2.5">
                          <div>
                            <div className="text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1">
                              <KeyRound className="h-3 w-3 text-cyan-400" /> License Key
                            </div>
                            <div className="font-mono text-xs font-bold text-cyan-300 mt-0.5">
                              {prod.licenseKey}
                            </div>
                          </div>
                          <button
                            onClick={() => copyText(prod.id, prod.licenseKey!)}
                            className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1.5 text-xs text-slate-200 cursor-pointer"
                          >
                            {copiedId === prod.id ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-400" /> Disalin
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" /> Salin
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      <a
                        href={`/api/user/downloads/${prod.id}`}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 py-2.5 text-xs font-bold text-slate-950 hover:brightness-110 transition"
                      >
                        <Download className="h-4 w-4" />
                        Unduh Paket Aset & Panduan
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SERVICES TRACKER TAB */}
          {tab === 'SERVICES' && data && (
            <div className="space-y-4">
              {data.serviceProjects.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-[#0b101e] p-12 text-center space-y-3">
                  <Briefcase className="mx-auto h-10 w-10 text-slate-500" />
                  <p className="text-sm font-semibold text-slate-300">
                    Belum ada proyek jasa yang berjalan.
                  </p>
                </div>
              ) : (
                data.serviceProjects.map((srv) => {
                  const meta = getServiceStatusMeta(srv.serviceStatus);
                  return (
                    <div
                      key={srv.id}
                      className="rounded-2xl border border-white/10 bg-[#0b101e] p-6 space-y-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <span className="font-mono text-xs text-cyan-400">
                            {srv.invoiceNumber} · Paket: {srv.tierName}
                          </span>
                          <h3 className="mt-1 font-display text-lg font-bold text-white">
                            {srv.brief?.projectName || srv.itemTitle}
                          </h3>
                          <p className="text-xs text-slate-400">{srv.itemTitle}</p>
                        </div>
                        <span
                          className={`rounded-xl border px-3 py-1.5 text-xs font-bold ${meta.badgeClass}`}
                        >
                          {meta.label}
                        </span>
                      </div>

                      {/* 4-Step Pipeline */}
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          'Review Brief',
                          'Pengerjaan',
                          'QA & Revisi',
                          'Selesai',
                        ].map((label, idx) => {
                          const active = idx + 1 <= meta.step;
                          return (
                            <div key={label} className="space-y-1.5">
                              <div
                                className={`h-1.5 rounded-full ${
                                  active ? 'bg-cyan-400' : 'bg-slate-800'
                                }`}
                              />
                              <div
                                className={`text-[11px] font-medium ${
                                  active ? 'text-cyan-200' : 'text-slate-500'
                                }`}
                              >
                                {idx + 1}. {label}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {srv.serviceDeliverableUrl && (
                        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="text-emerald-200">
                            Link Staging / Hasil Deliverable:
                          </span>
                          <a
                            href={srv.serviceDeliverableUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-mono font-bold text-emerald-300 hover:underline"
                          >
                            {srv.serviceDeliverableUrl}
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      )}

                      {srv.serviceUpdates.length > 0 && (
                        <div className="space-y-2 border-t border-white/10 pt-4">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                            Riwayat Progres Tim Boyang Digital
                          </h4>
                          <div className="space-y-2">
                            {srv.serviceUpdates.map((u) => (
                              <div
                                key={u.id}
                                className="rounded-xl bg-slate-950/60 p-3 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1"
                              >
                                <span className="text-slate-200">{u.message}</span>
                                <span className="font-mono text-[10px] text-slate-500 shrink-0">
                                  {formatDateId(u.createdAt)} · {u.author}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ORDERS HISTORY TAB */}
          {tab === 'ORDERS' && data && (
            <div className="space-y-3">
              {data.orders.map((ord) => {
                const st = getOrderStatusMeta(ord.status);
                return (
                  <div
                    key={ord.id}
                    className="rounded-2xl border border-white/10 bg-[#0b101e] p-5 flex flex-wrap items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-sm font-bold text-white">
                          {ord.invoiceNumber}
                        </span>
                        <span
                          className={`rounded-lg border px-2 py-0.5 text-[11px] font-semibold ${st.badgeClass}`}
                        >
                          {st.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        {formatDateId(ord.createdAt)} · {ord.paymentMethod} (
                        {ord.paymentChannel}) · {ord.items.length} item
                      </p>
                      {ord.adminNote && (
                        <p className="text-[11px] text-cyan-300">
                          Catatan Admin: {ord.adminNote}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-[10px] text-slate-500 uppercase">Total</div>
                        <div className="font-mono text-base font-bold text-cyan-300">
                          {formatIdr(ord.totalIdr)}
                        </div>
                      </div>
                      <button
                        onClick={() => onOpenOrderModal(ord)}
                        className="rounded-xl border border-white/15 bg-white/[0.05] px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/10 cursor-pointer"
                      >
                        {ord.status === 'PAID' ? 'Detail Invoice' : 'Bayar / Upload Bukti'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* PROFILE & WEB3 TAB */}
          {tab === 'PROFILE' && (
            <div className="grid gap-6 lg:grid-cols-2">
              <form
                onSubmit={handleSaveProfile}
                className="rounded-2xl border border-white/10 bg-[#0b101e] p-6 space-y-4"
              >
                <h3 className="font-display text-lg font-bold text-white">
                  Pengaturan Profil Akun
                </h3>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Nama</label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3.5 py-2.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    No. WhatsApp
                  </label>
                  <input
                    type="text"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3.5 py-2.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Password Baru (opsional)
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Kosongkan jika tidak ingin ganti"
                    className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3.5 py-2.5 text-xs text-white"
                  />
                </div>

                {profileMsg && (
                  <p className="text-xs text-emerald-400">{profileMsg}</p>
                )}
                {profileErr && (
                  <p className="text-xs text-rose-400">{profileErr}</p>
                )}

                <button
                  type="submit"
                  className="rounded-xl bg-cyan-400 px-5 py-2.5 text-xs font-bold text-slate-950 hover:brightness-110 cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </form>

              <div className="rounded-2xl border border-violet-500/25 bg-[#0b101e] p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-violet-400" />
                  <h3 className="font-display text-lg font-bold text-white">
                    Koneksi Wallet Web3 (EVM)
                  </h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Tautkan alamat wallet EVM (MetaMask, Rabby, Coinbase Wallet) ke akun
                  Boyang Digital untuk otentikasi tanpa password, verifikasi kepemilikan
                  lisensi, dan kesiapan sertifikat Soulbound Web3.
                </p>

                {user.walletAddress ? (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                      <div className="text-[11px] text-emerald-300 font-semibold">
                        Wallet Terverifikasi
                      </div>
                      <div className="font-mono text-xs text-white break-all mt-1">
                        {user.walletAddress}
                      </div>
                    </div>
                    <button
                      onClick={handleUnlinkWallet}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-300 cursor-pointer"
                    >
                      <Unlink className="h-3.5 w-3.5" /> Putus Tautan Wallet
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleBindWallet}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 px-5 py-3 text-xs font-bold text-white hover:brightness-110 cursor-pointer"
                  >
                    <Wallet className="h-4 w-4" />
                    Verifikasi & Tautkan Wallet Sekarang
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Certificate Modal */}
      {showCertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-amber-400/40 bg-gradient-to-br from-[#0e1528] via-[#090d1a] to-[#131026] p-8 text-center space-y-5 shadow-2xl">
            <Award className="mx-auto h-12 w-12 text-amber-400" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-300">
                BOYANG DIGITAL ACADEMY · OFFICIAL CERTIFICATE
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold text-white">
                {user.name}
              </h2>
              <p className="mt-2 text-xs text-slate-300">
                Telah menyelesaikan 100% kurikulum & evaluasi pada program:
              </p>
              <h3 className="mt-1 font-display text-lg font-bold text-cyan-300">
                {showCertModal.course?.title}
              </h3>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-left font-mono text-[11px] space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Certificate ID:</span>
                <span className="text-amber-300 font-bold">
                  {showCertModal.certificateCode}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Issued At:</span>
                <span className="text-slate-200">
                  {formatDateId(showCertModal.issuedAt)}
                </span>
              </div>
              {user.walletAddress && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Bound Wallet:</span>
                  <span className="text-violet-300">
                    {shortenAddress(user.walletAddress)}
                  </span>
                </div>
              )}
              <div className="pt-1">
                <span className="text-slate-400 block">SHA-256 Attestation Hash:</span>
                <span className="text-[10px] text-emerald-300 break-all">
                  {showCertModal.certificateHash}
                </span>
              </div>
            </div>

            <div className="flex justify-center gap-3">
              <button
                onClick={() => window.print()}
                className="rounded-xl bg-amber-400 px-5 py-2.5 text-xs font-bold text-slate-950 cursor-pointer"
              >
                Cetak / Simpan PDF
              </button>
              <button
                onClick={() => setShowCertModal(null)}
                className="rounded-xl border border-white/15 px-5 py-2.5 text-xs font-semibold text-white cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
