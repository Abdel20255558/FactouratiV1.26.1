import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import EmailVerificationBanner from './components/auth/EmailVerificationBanner';
import ExpirationNotification from './components/auth/ExpirationNotification';
import ExpiredAccountModal from './components/auth/ExpiredAccountModal';
import ExpiryAlert from './components/license/ExpiryAlert';
import LicenseAlert from './components/license/LicenseAlert';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { LicenseProvider, useLicense } from './contexts/LicenseContext';
import { OrderProvider } from './contexts/OrderContext';
import { StockProvider } from './contexts/StockContext';
import { SupplierProvider } from './contexts/SupplierContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { UserManagementProvider } from './contexts/UserManagementContext';

const HomePage = lazy(() => import('./components/home/HomePage'));
const BlogPage = lazy(() => import('./components/blog/BlogPage'));
const BlogArticlePage = lazy(() => import('./components/blog/BlogArticlePage'));
const BlogCategoryPage = lazy(() => import('./components/blog/BlogCategoryPage'));
const Login = lazy(() => import('./components/auth/Login'));
const PricingPage = lazy(() => import('./components/public/PricingPage'));
const FaqPage = lazy(() => import('./components/public/FaqPage'));
const NotFoundPage = lazy(() => import('./components/public/NotFoundPage'));
const Dashboard = lazy(() => import('./components/dashboard/Dashboard'));
const GlobalSearch = lazy(() => import('./components/layout/GlobalSearch'));
const NotificationCenter = lazy(() => import('./components/layout/NotificationCenter'));
const InvoicesList = lazy(() => import('./components/invoices/InvoicesList'));
const CreateInvoice = lazy(() => import('./components/invoices/CreateInvoice'));
const QuotesList = lazy(() => import('./components/quotes/QuotesList'));
const CreateQuote = lazy(() => import('./components/quotes/CreateQuote'));
const ClientsList = lazy(() => import('./components/clients/ClientsList'));
const ProductsList = lazy(() => import('./components/products/ProductsList'));
const Settings = lazy(() => import('./components/settings/Settings'));
const Reports = lazy(() => import('./components/reports/Reports'));
const UpgradePage = lazy(() => import('./components/license/UpgradePage'));
const ProUpgradeSuccess = lazy(() => import('./components/license/ProUpgradeSuccess'));
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));
const StockManagement = lazy(() => import('./components/stock/StockManagement'));
const HRManagement = lazy(() => import('./components/hr/HRManagement'));
const SupplierManagement = lazy(() => import('./components/suppliers/SupplierManagement'));
const SuppliersSection = lazy(() => import('./components/suppliers/SuppliersSection'));
const AccountManagement = lazy(() => import('./components/account/AccountManagement'));
const ProjectManagement = lazy(() => import('./components/projects/ProjectManagement'));
const OrdersList = lazy(() => import('./components/orders/OrdersList'));
const CreateOrder = lazy(() => import('./components/orders/CreateOrder'));
const OrderDetail = lazy(() => import('./components/orders/OrderDetail'));
const EditOrder = lazy(() => import('./components/orders/EditOrder'));
const EmailVerificationPage = lazy(() => import('./components/auth/EmailVerificationPage'));
const EmailActionPage = lazy(() => import('./components/auth/EmailActionPage'));

function RouteLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-600 shadow-sm">
        Chargement...
      </div>
    </div>
  );
}

function AppContent() {
  const { user, isAuthenticated, showExpiryAlert, setShowExpiryAlert, expiredDate, subscriptionStatus } = useAuth();
  const { showSuccessModal, setShowSuccessModal, upgradeExpiryDate } = useLicense();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showUpgradePage, setShowUpgradePage] = useState(false);
  const [showExpirationNotification, setShowExpirationNotification] = useState(false);
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  const [isRenewalFlow, setIsRenewalFlow] = useState(false);
  const [showBlockedUserModal, setShowBlockedUserModal] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (subscriptionStatus.shouldShowNotification) {
      setShowExpirationNotification(true);
    }

    if (subscriptionStatus.isExpired && user?.isAdmin) {
      setShowExpiredModal(true);
    }

    if (user && !user.isAdmin && user.email !== 'admin@facturati.ma') {
      const isCompanyProExpired =
        user.company.subscription !== 'pro' ||
        (user.company.expiryDate && new Date(user.company.expiryDate) < new Date());

      if (isCompanyProExpired) {
        setShowBlockedUserModal(true);
      }
    }
  }, [subscriptionStatus, user]);

  const handleRenewSubscription = () => {
    setShowExpirationNotification(false);
    setIsRenewalFlow(true);
    setShowUpgradePage(true);
  };

  const handleDismissNotification = () => {
    setShowExpirationNotification(false);
    localStorage.setItem('dismissedExpirationNotification', new Date().toISOString());
  };

  useEffect(() => {
    const dismissed = localStorage.getItem('dismissedExpirationNotification');
    if (!dismissed) {
      return;
    }

    const dismissedDate = new Date(dismissed);
    const now = new Date();
    const hoursDiff = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60);

    if (hoursDiff < 24) {
      setShowExpirationNotification(false);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowGlobalSearch(true);
      }

      if (e.key === 'Escape') {
        setShowGlobalSearch(false);
        setShowNotifications(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50">
        <Suspense fallback={<RouteLoader />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/tarifs" element={<PricingPage />} />
            <Route path="/faq" element={<FaqPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/blog/categorie/:categorySlug" element={<BlogCategoryPage />} />
            <Route path="/blog/:slug" element={<BlogArticlePage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/verify-email" element={<EmailVerificationPage />} />
            <Route path="/verify-email-success" element={<EmailActionPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </div>
    );
  }

  if (user?.email === 'admin@facturati.ma') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Suspense fallback={<RouteLoader />}>
          <Routes>
            <Route path="/" element={<AdminDashboard />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
          </Routes>
        </Suspense>
      </div>
    );
  }

  return (
    <>
      <EmailVerificationBanner />

      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
        <LicenseAlert onUpgrade={() => setShowUpgradePage(true)} />
        <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} onUpgrade={() => setShowUpgradePage(true)} />

        <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'} ml-0`}>
          <Header
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            onOpenSearch={() => setShowGlobalSearch(true)}
            onOpenNotifications={() => setShowNotifications(true)}
          />

          <main className="min-h-screen max-w-screen-xl mx-auto bg-gray-50 p-4 dark:bg-gray-900 sm:p-6">
            <Suspense fallback={<RouteLoader />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/invoices" element={<InvoicesList />} />
                <Route path="/invoices/create" element={<CreateInvoice />} />
                <Route path="/quotes" element={<QuotesList />} />
                <Route path="/quotes/create" element={<CreateQuote />} />
                <Route path="/clients" element={<ClientsList />} />
                <Route path="/products" element={<ProductsList />} />
                <Route path="/suppliers" element={<SuppliersSection />} />
                <Route path="/stock-management" element={<StockManagement />} />
                <Route path="/supplier-management" element={<SupplierManagement />} />
                <Route path="/hr-management" element={<HRManagement />} />
                <Route path="/project-management" element={<ProjectManagement />} />
                <Route path="/account-management" element={<AccountManagement />} />
                <Route path="/commandes" element={<OrdersList />} />
                <Route path="/commandes/nouveau" element={<CreateOrder />} />
                <Route path="/commandes/:id" element={<OrderDetail />} />
                <Route path="/commandes/:id/modifier" element={<EditOrder />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>
          </main>
        </div>

        {showExpirationNotification && subscriptionStatus.shouldShowNotification && (
          <ExpirationNotification
            daysRemaining={subscriptionStatus.daysRemaining}
            onRenew={handleRenewSubscription}
            onDismiss={handleDismissNotification}
          />
        )}

        <Suspense fallback={null}>
          <GlobalSearch isOpen={showGlobalSearch} onClose={() => setShowGlobalSearch(false)} />
        </Suspense>

        <Suspense fallback={null}>
          <NotificationCenter isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
        </Suspense>

        {showUpgradePage && (
          <Suspense fallback={null}>
            <UpgradePage
              onClose={() => {
                setShowUpgradePage(false);
                setIsRenewalFlow(false);
              }}
              isRenewal={isRenewalFlow}
            />
          </Suspense>
        )}

        {showExpiryAlert && expiredDate && (
          <ExpiryAlert
            isOpen={showExpiryAlert}
            onRenew={() => {
              setShowExpiryAlert(false);
              setIsRenewalFlow(true);
              setShowUpgradePage(true);
            }}
            onLater={() => setShowExpiryAlert(false)}
            expiryDate={expiredDate}
          />
        )}

        {showSuccessModal && upgradeExpiryDate && (
          <Suspense fallback={null}>
            <ProUpgradeSuccess
              isOpen={showSuccessModal}
              onClose={() => setShowSuccessModal(false)}
              expiryDate={upgradeExpiryDate}
            />
          </Suspense>
        )}

        {showExpiredModal && subscriptionStatus.isExpired && user?.isAdmin && (
          <ExpiredAccountModal
            isOpen={showExpiredModal}
            onClose={() => setShowExpiredModal(false)}
            isAdmin={true}
            expiryDate={subscriptionStatus.expiryDate || ''}
          />
        )}

        {showBlockedUserModal && user && !user.isAdmin && (
          <ExpiredAccountModal
            isOpen={showBlockedUserModal}
            onClose={() => setShowBlockedUserModal(false)}
            isAdmin={false}
            expiryDate={user.company.expiryDate || ''}
          />
        )}
      </div>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <UserManagementProvider>
              <OrderProvider>
                <StockProvider>
                  <SupplierProvider>
                    <DataProvider>
                      <LicenseProvider>
                        <AppContent />
                      </LicenseProvider>
                    </DataProvider>
                  </SupplierProvider>
                </StockProvider>
              </OrderProvider>
            </UserManagementProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
