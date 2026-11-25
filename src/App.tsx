import React, { useEffect, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import type {
  CartEntry,
  CatalogItem,
  CatalogItemType,
  Order,
  PaymentSettings,
  PromoCode,
  User,
} from './types';
import { api } from './lib/api';
import { connectInjectedWallet, getConnectedWalletSilent } from './lib/web3';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { CatalogSection } from './components/CatalogSection';
import { ItemDetailModal } from './components/ItemDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { AuthModal } from './components/AuthModal';
import { UserDashboard } from './components/UserDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { Web3AndVerifySection } from './components/Web3AndVerifySection';
import { Footer } from './components/Footer';

export function App() {
  const [activeView, setActiveView] = useState<
    'HOME' | 'USER_DASHBOARD' | 'ADMIN_DASHBOARD'
  >('HOME');
  const [user, setUser] = useState<User | null>(null);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [paymentSettings, setPaymentSettings] =
    useState<PaymentSettings | null>(null);

  const [activeCatalogType, setActiveCatalogType] = useState<
    CatalogItemType | 'ALL'
  >('ALL');
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);

  // Cart & Promo State
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [promoDiscountIdr, setPromoDiscountIdr] = useState(0);

  // Modals
  const [authOpen, setAuthOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [resumeOrder, setResumeOrder] = useState<Order | null>(null);

  // Web3 & Toast
  const [wallet, setWallet] = useState<{ address: string; chainId: number } | null>(
    null
  );
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  const loadCatalog = async () => {
    setLoadingCatalog(true);
    try {
      const res = await api.getCatalog();
      setCatalog(res.items);
    } finally {
      setLoadingCatalog(false);
    }
  };

  const loadPaymentConfig = async () => {
    try {
      const cfg = await api.getPaymentConfig();
      setPaymentSettings(cfg);
    } catch {
      // ignore initial error
    }
  };

  useEffect(() => {
    api
      .me()
      .then((res) => setUser(res.user))
      .catch(() => setUser(null));
    loadCatalog();
    loadPaymentConfig();
    getConnectedWalletSilent().then((w) => {
      if (w) setWallet(w);
    });
  }, []);

  const handleConnectWallet = async () => {
    try {
      const w = await connectInjectedWallet();
      setWallet(w);
      showToast(`Wallet terhubung: ${w.address.slice(0, 6)}...${w.address.slice(-4)}`);
    } catch (err: unknown) {
      showToast((err as Error).message);
    }
  };

  const handleNavigateSection = (
    sectionId: string,
    filterType?: CatalogItemType | 'ALL'
  ) => {
    if (filterType) {
      setActiveCatalogType(filterType);
    }
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const addToCart = (entry: CartEntry) => {
    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (p) =>
          p.catalogItem.id === entry.catalogItem.id &&
          p.tierName === entry.tierName &&
          entry.catalogItem.type !== 'SERVICE'
      );
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = {
          ...next[existingIdx],
          quantity: next[existingIdx].quantity + entry.quantity,
        };
        return next;
      }
      return [...prev, entry];
    });
    showToast(`Ditambahkan ke keranjang: ${entry.catalogItem.title}`);
  };

  const handleQuickAdd = (item: CatalogItem) => {
    addToCart({
      catalogItem: item,
      quantity: 1,
      tierName: item.metadata.licenseType,
      unitPriceIdr: item.priceIdr,
    });
    setCartOpen(true);
  };

  const handleBuyNow = (entry: CartEntry) => {
    setCart([entry]);
    setAppliedPromo(null);
    setPromoDiscountIdr(0);
    setSelectedItem(null);
    setResumeOrder(null);
    setCheckoutOpen(true);
  };

  const handleApplyPromo = async (code: string) => {
    const subtotal = cart.reduce(
      (sum, i) => sum + i.unitPriceIdr * i.quantity,
      0
    );
    const res = await api.validatePromo(code, subtotal);
    setAppliedPromo(res.promo);
    setPromoDiscountIdr(res.discountIdr);
  };

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
    setActiveView('HOME');
    showToast('Anda telah keluar dari akun.');
  };

  const counts = {
    services: catalog.filter((i) => i.type === 'SERVICE').length,
    courses: catalog.filter((i) => i.type === 'COURSE').length,
    products: catalog.filter((i) => i.type === 'PRODUCT').length,
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#05070e] text-slate-100">
      <Navbar
        activeView={activeView}
        onChangeView={(v) => {
          if (v === 'USER_DASHBOARD' && !user) {
            setAuthOpen(true);
            return;
          }
          if (v === 'ADMIN_DASHBOARD' && user?.role !== 'ADMIN') {
            setAuthOpen(true);
            return;
          }
          setActiveView(v);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        user={user}
        cartCount={cart.reduce((s, c) => s + c.quantity, 0)}
        onOpenCart={() => setCartOpen(true)}
        onOpenAuth={() => setAuthOpen(true)}
        onLogout={handleLogout}
        wallet={wallet}
        onConnectWallet={handleConnectWallet}
        onNavigateSection={handleNavigateSection}
      />

      <main className="flex-1">
        {activeView === 'HOME' && (
          <>
            <HeroSection
              counts={counts}
              onExplore={(type) => handleNavigateSection('katalog', type)}
              onOpenConsult={() => handleNavigateSection('konsultasi')}
              onConnectWallet={handleConnectWallet}
              walletAddress={wallet?.address}
            />
            <CatalogSection
              items={catalog}
              loading={loadingCatalog}
              activeType={activeCatalogType}
              onChangeType={setActiveCatalogType}
              onSelectItem={setSelectedItem}
              onQuickAdd={handleQuickAdd}
            />
            <Web3AndVerifySection />
          </>
        )}

        {activeView === 'USER_DASHBOARD' && user && (
          <UserDashboard
            user={user}
            onUserUpdated={setUser}
            onOpenOrderModal={(ord) => {
              setResumeOrder(ord);
              setCheckoutOpen(true);
            }}
            onExploreCatalog={() => {
              setActiveView('HOME');
              setTimeout(() => handleNavigateSection('katalog', 'ALL'), 80);
            }}
          />
        )}

        {activeView === 'ADMIN_DASHBOARD' && user?.role === 'ADMIN' && (
          <AdminDashboard
            currentUser={user}
            onCatalogChanged={loadCatalog}
            onSettingsChanged={loadPaymentConfig}
          />
        )}
      </main>

      <Footer
        onNavigateSection={(sectionId, filterType) => {
          setActiveView('HOME');
          setTimeout(() => handleNavigateSection(sectionId, filterType), 60);
        }}
      />

      {/* Modals & Drawers */}
      <ItemDetailModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onAddToCart={addToCart}
        onBuyNow={handleBuyNow}
      />

      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        onUpdateQty={(idx, delta) => {
          setCart((prev) =>
            prev
              .map((it, i) =>
                i === idx ? { ...it, quantity: it.quantity + delta } : it
              )
              .filter((it) => it.quantity > 0)
          );
        }}
        onRemoveItem={(idx) => {
          setCart((prev) => prev.filter((_, i) => i !== idx));
        }}
        appliedPromo={appliedPromo}
        promoDiscountIdr={promoDiscountIdr}
        onApplyPromo={handleApplyPromo}
        onClearPromo={() => {
          setAppliedPromo(null);
          setPromoDiscountIdr(0);
        }}
        onProceedCheckout={() => {
          setCartOpen(false);
          setResumeOrder(null);
          setCheckoutOpen(true);
        }}
      />

      <CheckoutModal
        isOpen={checkoutOpen}
        onClose={() => {
          setCheckoutOpen(false);
          setResumeOrder(null);
        }}
        cart={cart}
        appliedPromo={appliedPromo}
        promoDiscountIdr={promoDiscountIdr}
        user={user}
        paymentSettings={paymentSettings}
        existingOrder={resumeOrder}
        onNeedAuth={() => setAuthOpen(true)}
        onOrderCompleted={(order, shouldClearCart) => {
          if (shouldClearCart) {
            setCart([]);
            setAppliedPromo(null);
            setPromoDiscountIdr(0);
          }
          if (order.status === 'PAID') {
            showToast(`Invoice ${order.invoiceNumber} lunas! Akses Anda aktif.`);
          }
        }}
      />

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={(loggedInUser) => {
          setUser(loggedInUser);
          showToast(`Selamat datang, ${loggedInUser.name}!`);
        }}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-2xl border border-cyan-400/35 bg-[#0c1324] px-4 py-3 text-xs font-semibold text-white shadow-2xl">
          <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0" />
          <span>{toast}</span>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
