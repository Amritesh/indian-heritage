import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';

export function ProtectedRoute() {
  const { isAuthenticated, loading, needsOnboarding, isAdmin, isEditor } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <span className="material-symbols-outlined text-5xl text-primary animate-pulse">
            account_balance
          </span>
          <p className="font-label text-xs uppercase tracking-widest text-outline">
            Loading archive...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin && !isEditor) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4 max-w-md px-6">
          <span className="material-symbols-outlined text-5xl text-error">block</span>
          <h1 className="font-headline text-2xl font-bold text-on-surface">Access Denied</h1>
          <p className="text-on-surface-variant">
            You do not have admin or editor permissions. Contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  if (needsOnboarding && location.pathname !== '/admin/onboarding') {
    return <Navigate to="/admin/onboarding" replace />;
  }

  return <Outlet />;
}
