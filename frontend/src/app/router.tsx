import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '@/app/shell/AppShell';
import { AdminLayout } from '@/app/layouts/AdminLayout';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { AboutPage } from '@/pages/about/AboutPage';
import { CollectionDetailPage } from '@/pages/collection-detail/CollectionDetailPage';
import { CollectionsPage } from '@/pages/collections/CollectionsPage';
import { HomePage } from '@/pages/home/HomePage';
import { ItemDetailPage } from '@/pages/item-detail/ItemDetailPage';
import { NotFoundPage } from '@/pages/not-found/NotFoundPage';
import { SearchPage } from '@/pages/search/SearchPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { AdminOnboardingPage } from '@/pages/admin/AdminOnboardingPage';
import { AdminProfilePage } from '@/pages/admin/AdminProfilePage';
import { AdminCollectionsPage } from '@/pages/admin/AdminCollectionsPage';
import { AdminCollectionFormPage } from '@/pages/admin/AdminCollectionFormPage';
import { AdminItemsPage } from '@/pages/admin/AdminItemsPage';
import { AdminItemFormPage } from '@/pages/admin/AdminItemFormPage';
import { AdminImportPage } from '@/pages/admin/AdminImportPage';
import { RouteErrorBoundary } from '@/shared/ui/RouteErrorBoundary';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'collections', element: <CollectionsPage /> },
      { path: 'collections/:slug', element: <CollectionDetailPage /> },
      { path: 'items/:itemId', element: <ItemDetailPage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'about', element: <AboutPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: '/login',
    element: <LoginPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: '/admin',
    element: <ProtectedRoute />,
    errorElement: <RouteErrorBoundary />,
    children: [
      // Onboarding sits outside the admin shell layout
      { path: 'onboarding', element: <AdminOnboardingPage /> },
      // All other admin routes use the sidebar layout
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminDashboardPage /> },
          { path: 'profile', element: <AdminProfilePage /> },
          { path: 'collections', element: <AdminCollectionsPage /> },
          { path: 'collections/new', element: <AdminCollectionFormPage /> },
          { path: 'collections/:id/edit', element: <AdminCollectionFormPage /> },
          { path: 'items', element: <AdminItemsPage /> },
          { path: 'items/new', element: <AdminItemFormPage /> },
          { path: 'items/:id/edit', element: <AdminItemFormPage /> },
          { path: 'import', element: <AdminImportPage /> },
        ],
      },
    ],
  },
]);
