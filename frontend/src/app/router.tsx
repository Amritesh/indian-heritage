import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '@/app/shell/AppShell';
import { AboutPage } from '@/pages/about/AboutPage';
import { CollectionDetailPage } from '@/pages/collection-detail/CollectionDetailPage';
import { CollectionsPage } from '@/pages/collections/CollectionsPage';
import { HomePage } from '@/pages/home/HomePage';
import { ItemDetailPage } from '@/pages/item-detail/ItemDetailPage';
import { NotFoundPage } from '@/pages/not-found/NotFoundPage';
import { SearchPage } from '@/pages/search/SearchPage';
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
]);
