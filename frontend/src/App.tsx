import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { Spinner } from '@/components/ui/spinner';
import { useAuthStore } from '@/store/auth.store';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { RequireAuth, RequireAdmin } from '@/components/layout/RouteGuards';

// --- Public -----------------------------------------------------------------
const LandingPage = lazy(() => import('@/pages/public/LandingPage'));
const FeaturesPage = lazy(() => import('@/pages/public/FeaturesPage'));
const PricingPage = lazy(() => import('@/pages/public/PricingPage'));
const LoginPage = lazy(() => import('@/pages/public/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/public/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/public/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/public/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('@/pages/public/VerifyEmailPage'));
const PrivacyPage = lazy(() => import('@/pages/public/PrivacyPage'));
const TermsPage = lazy(() => import('@/pages/public/TermsPage'));
const PublicLinkInBio = lazy(() => import('@/pages/public/PublicLinkInBio'));
const NotFoundPage = lazy(() => import('@/pages/public/NotFoundPage'));

// --- Dashboard --------------------------------------------------------------
const OverviewPage = lazy(() => import('@/pages/dashboard/OverviewPage'));
const InstagramAccountsPage = lazy(() => import('@/pages/dashboard/InstagramAccountsPage'));
const AutomationsPage = lazy(() => import('@/pages/dashboard/AutomationsPage'));
const AutomationBuilderPage = lazy(() => import('@/pages/dashboard/AutomationBuilderPage'));
const ConversationsPage = lazy(() => import('@/pages/dashboard/ConversationsPage'));
const LeadsPage = lazy(() => import('@/pages/dashboard/LeadsPage'));
const LinkInBioBuilderPage = lazy(() => import('@/pages/dashboard/LinkInBioBuilderPage'));
const AnalyticsPage = lazy(() => import('@/pages/dashboard/AnalyticsPage'));
const SubscriptionPage = lazy(() => import('@/pages/dashboard/SubscriptionPage'));
const SettingsPage = lazy(() => import('@/pages/dashboard/SettingsPage'));

// --- Admin ------------------------------------------------------------------
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'));
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage'));
const AdminPaymentsPage = lazy(() => import('@/pages/admin/AdminPaymentsPage'));
const AdminSubscriptionsPage = lazy(() => import('@/pages/admin/AdminSubscriptionsPage'));
const AdminSystemPage = lazy(() => import('@/pages/admin/AdminSystemPage'));

function App() {
  return (
    <>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center">
            <Spinner size="lg" />
          </div>
        }
      >
        <Routes>
          {/* ---------- Public ---------- */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
          </Route>

          {/* ---------- Public link-in-bio ---------- */}
          <Route path="/p/:slug" element={<PublicLinkInBio />} />

          {/* ---------- Dashboard ---------- */}
          <Route
            element={
              <RequireAuth>
                <DashboardLayout />
              </RequireAuth>
            }
          >
            <Route path="/dashboard" element={<OverviewPage />} />
            <Route path="/dashboard/instagram" element={<InstagramAccountsPage />} />
            <Route path="/dashboard/automations" element={<AutomationsPage />} />
            <Route path="/dashboard/automations/:id" element={<AutomationBuilderPage />} />
            <Route path="/dashboard/conversations" element={<ConversationsPage />} />
            <Route path="/dashboard/leads" element={<LeadsPage />} />
            <Route path="/dashboard/link-in-bio" element={<LinkInBioBuilderPage />} />
            <Route path="/dashboard/analytics" element={<AnalyticsPage />} />
            <Route path="/dashboard/subscription" element={<SubscriptionPage />} />
            <Route path="/dashboard/settings" element={<SettingsPage />} />
          </Route>

          {/* ---------- Admin ---------- */}
          <Route
            element={
              <RequireAdmin>
                <AdminLayout />
              </RequireAdmin>
            }
          >
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/payments" element={<AdminPaymentsPage />} />
            <Route path="/admin/subscriptions" element={<AdminSubscriptionsPage />} />
            <Route path="/admin/system" element={<AdminSystemPage />} />
          </Route>

          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </Suspense>
      <Toaster />
    </>
  );
}

export default App;
