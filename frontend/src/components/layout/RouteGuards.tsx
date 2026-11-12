import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { PageLoader } from '@/components/ui/spinner';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) return <PageLoader label="Loading your workspace…" />;
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (user?.platformRole !== 'admin' && user?.platformRole !== 'superadmin') {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}
