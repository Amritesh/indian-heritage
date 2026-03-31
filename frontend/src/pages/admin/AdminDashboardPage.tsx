import { useQuery } from '@tanstack/react-query';
import {
  collection,
  getCountFromServer,
  getDocs,
  orderBy,
  query,
  limit,
  where,
  Query,
  DocumentData,
} from 'firebase/firestore';
import { getFirestoreOrThrow } from '@/shared/services/firestore';
import { useAuth } from '@/features/auth/context/AuthContext';
import { formatCurrency } from '@/shared/lib/formatters';
import { getLatestIngestRun } from '@/entities/ingest/api/ingestProgressService';

async function getDashboardStats() {
  const db = getFirestoreOrThrow();

  const publishedQuery: Query<DocumentData> = query(
    collection(db, 'items'),
    where('published', '==', true),
  );

  const [itemsSnap, collectionsSnap, publishedSnap, recentSnap] = await Promise.all([
    getCountFromServer(collection(db, 'items')),
    getCountFromServer(collection(db, 'collections')),
    getCountFromServer(publishedQuery),
    getDocs(query(collection(db, 'items'), where('published', '==', true), orderBy('pageNumber', 'asc'), limit(5))),
  ]);

  // Calculate estimated worth from collection docs
  const collSnap = await getDocs(collection(db, 'collections'));
  const totalWorth = collSnap.docs.reduce(
    (sum, d) => sum + Number(d.data().estimatedWorth ?? 0),
    0,
  );

  return {
    totalItems: itemsSnap.data().count,
    publishedItems: publishedSnap.data().count,
    totalCollections: collectionsSnap.data().count,
    totalWorth,
    recentItems: recentSnap.docs.map((d) => ({
      id: d.id,
      title: String(d.data().title ?? ''),
      collectionName: String(d.data().collectionName ?? ''),
      period: String(d.data().period ?? ''),
    })),
  };
}

export function AdminDashboardPage() {
  const { userProfile } = useAuth();
  const { data: latestIngestRun, isLoading: isLoadingLatestIngestRun } = useQuery({
    queryKey: ['admin', 'ingest-run', 'princely-states'],
    queryFn: () => getLatestIngestRun('princely-states'),
  });
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'dashboard-stats'],
    queryFn: getDashboardStats,
  });

  const statCards = [
    {
      label: 'Total Items',
      value: data?.totalItems,
      icon: 'inventory_2',
      color: 'text-primary',
    },
    {
      label: 'Published',
      value: data?.publishedItems,
      icon: 'published_with_changes',
      color: 'text-tertiary',
    },
    {
      label: 'Collections',
      value: data?.totalCollections,
      icon: 'collections_bookmark',
      color: 'text-secondary',
    },
    {
      label: 'Est. Archive Worth',
      value: data?.totalWorth != null ? formatCurrency(data.totalWorth) : undefined,
      isText: true,
      icon: 'payments',
      color: 'text-primary',
    },
  ];

  return (
    <div className="space-y-10">
      <div>
        <span className="eyebrow">Overview</span>
        <h1 className="mt-2 font-headline text-3xl font-bold text-on-surface">
          Welcome back, {userProfile?.displayName?.split(' ')[0] ?? 'Curator'}
        </h1>
        <p className="mt-1 text-on-surface-variant">Here's what's happening with the archive.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, isText, icon, color }) => (
          <div
            key={label}
            className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-5 flex items-center gap-4"
          >
            <div className="w-11 h-11 rounded-xl bg-surface-container-low flex items-center justify-center shrink-0">
              <span className={`material-symbols-outlined text-xl ${color}`}>{icon}</span>
            </div>
            <div className="min-w-0">
              {isLoading ? (
                <div className="h-7 w-14 bg-outline/10 rounded animate-pulse" />
              ) : isText ? (
                <p className="font-headline text-xl font-bold text-on-surface truncate">{value ?? '—'}</p>
              ) : (
                <p className="font-headline text-2xl font-bold text-on-surface tabular-nums">
                  {(value as number)?.toLocaleString() ?? '0'}
                </p>
              )}
              <p className="text-[10px] text-on-surface-variant mt-0.5 uppercase tracking-wider font-label font-semibold truncate">
                {label}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-6">
        <div className="flex items-start justify-between gap-4 border-b border-outline-variant/10 pb-4">
          <div>
            <h2 className="font-label text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Latest Ingest
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Current progress for the princely-states batch.
            </p>
          </div>
          <div className="rounded-full border border-outline-variant/10 bg-surface-container-low px-3 py-1 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
            {isLoadingLatestIngestRun ? 'Loading…' : latestIngestRun?.status ?? 'No run yet'}
          </div>
        </div>

        {latestIngestRun ? (
          <div className="mt-5 grid grid-cols-2 gap-4 text-sm lg:grid-cols-4">
            <div className="rounded-xl bg-surface-container-low/60 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-outline">Total Pages</p>
              <p className="mt-2 font-headline text-2xl font-bold text-on-surface tabular-nums">
                {latestIngestRun.summary.totalPages}
              </p>
            </div>
            <div className="rounded-xl bg-surface-container-low/60 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-outline">Completed</p>
              <p className="mt-2 font-headline text-2xl font-bold text-on-surface tabular-nums">
                {latestIngestRun.summary.completedPages}
              </p>
            </div>
            <div className="rounded-xl bg-surface-container-low/60 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-outline">Failed</p>
              <p className="mt-2 font-headline text-2xl font-bold text-on-surface tabular-nums">
                {latestIngestRun.summary.failedPages}
              </p>
            </div>
            <div className="rounded-xl bg-surface-container-low/60 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-outline">Running</p>
              <p className="mt-2 font-headline text-2xl font-bold text-on-surface tabular-nums">
                {latestIngestRun.summary.runningPages}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-on-surface-variant">
            No ingest runs recorded yet for princely-states.
          </p>
        )}
      </div>

      {/* Recent Items */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10">
        <div className="p-6 border-b border-outline-variant/10">
          <h2 className="font-label text-xs font-bold uppercase tracking-[0.2em] text-primary">Recent Items</h2>
        </div>
        <div className="divide-y divide-outline-variant/10">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-6 py-4 flex items-center gap-4">
                  <div className="h-4 flex-1 bg-outline/10 rounded animate-pulse" />
                  <div className="h-4 w-32 bg-outline/10 rounded animate-pulse" />
                </div>
              ))
            : (data?.recentItems ?? []).map((item) => (
                <a
                  key={item.id}
                  href={`/items/${item.id}`}
                  className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-surface-container-low/40 transition-colors block"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-on-surface truncate">{item.title}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">{item.collectionName}</p>
                  </div>
                  {item.period && (
                    <p className="text-xs text-outline shrink-0">{item.period}</p>
                  )}
                </a>
              ))}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { to: '/admin/items/new', icon: 'add_photo_alternate', label: 'Add New Item', desc: 'Create a new archive entry' },
          { to: '/admin/import', icon: 'cloud_download', label: 'Import Tools', desc: 'Sync from source collections' },
          { to: '/admin/collections', icon: 'collections_bookmark', label: 'Manage Collections', desc: 'Enable or configure collections' },
          { to: '/admin/items', icon: 'inventory_2', label: 'Browse Items', desc: 'Edit, archive, or publish items' },
        ].map(({ to, icon, label, desc }) => (
          <a
            key={to}
            href={to}
            className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-5 flex items-center gap-4 hover:border-primary/30 hover:bg-primary/5 transition-all group"
          >
            <span className="material-symbols-outlined text-2xl text-primary group-hover:scale-110 transition-transform">
              {icon}
            </span>
            <div>
              <p className="font-semibold text-sm text-on-surface">{label}</p>
              <p className="text-xs text-on-surface-variant mt-0.5">{desc}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
