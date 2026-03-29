import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAdminItems, publishItem, unpublishItem, archiveItem } from '@/entities/item/api/itemAdminService';
import { getAllCollectionsAdmin } from '@/entities/collection/api/collectionAdminService';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { StatusBadge } from '@/shared/ui/StatusBadge';

type StatusFilter = 'all' | 'published' | 'unpublished';

export function AdminItemsPage() {
  const qc = useQueryClient();
  const [collectionSlug, setCollectionSlug] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [confirmArchive, setConfirmArchive] = useState<string | null>(null);

  const { data: collections = [] } = useQuery({
    queryKey: ['admin', 'collections'],
    queryFn: getAllCollectionsAdmin,
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['admin', 'items', collectionSlug, statusFilter],
    queryFn: () => getAdminItems({ collectionSlug: collectionSlug || undefined, status: statusFilter }),
  });

  const publishMutation = useMutation({
    mutationFn: publishItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'items'] }),
  });

  const unpublishMutation = useMutation({
    mutationFn: unpublishItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'items'] }),
  });

  const archiveMutation = useMutation({
    mutationFn: archiveItem,
    onSuccess: () => {
      setConfirmArchive(null);
      qc.invalidateQueries({ queryKey: ['admin', 'items'] });
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="eyebrow">Archive</span>
          <h1 className="mt-2 font-headline text-3xl font-bold text-on-surface">Items</h1>
        </div>
        <Link to="/admin/items/new" className="btn-primary shrink-0">
          <span className="material-symbols-outlined text-lg">add</span>
          New Item
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={collectionSlug}
          onChange={(e) => setCollectionSlug(e.target.value)}
          className="text-sm border border-outline-variant/30 rounded-lg px-3 py-2 bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">All Collections</option>
          {collections.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.displayName}
            </option>
          ))}
        </select>

        <div className="flex rounded-lg border border-outline-variant/30 overflow-hidden">
          {(['all', 'published', 'unpublished'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 text-sm font-label font-semibold capitalize transition-colors ${
                statusFilter === s
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <span className="text-sm text-on-surface-variant ml-auto">
          {isLoading ? '—' : `${items.length} item${items.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant/10 bg-surface-container-low/50 hidden sm:block">
          <div className="grid grid-cols-[2fr,1fr,auto,auto] gap-4 text-xs font-label font-bold uppercase tracking-wider text-outline">
            <span>Item</span>
            <span>Collection</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
        </div>

        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="px-6 py-4 border-b border-outline-variant/10 flex items-center gap-4">
              <div className="h-4 flex-1 bg-outline/10 rounded animate-pulse" />
              <div className="h-4 w-24 bg-outline/10 rounded animate-pulse" />
              <div className="h-6 w-20 bg-outline/10 rounded-full animate-pulse" />
              <div className="h-8 w-24 bg-outline/10 rounded animate-pulse" />
            </div>
          ))
        ) : items.length === 0 ? (
          <div className="px-6 py-16 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-5xl text-outline mb-4 block">inventory_2</span>
            <p className="font-semibold">No items found</p>
            <p className="text-sm mt-1">Try changing the filters or add a new item.</p>
          </div>
        ) : (
          items.map((item) => {
            const isPublished = Boolean((item as unknown as Record<string, unknown>).published);
            return (
              <div
                key={item.id}
                className="px-6 py-4 border-b border-outline-variant/10 last:border-0 grid grid-cols-[2fr,1fr,auto,auto] gap-4 items-center hover:bg-surface-container-low/30 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-on-surface truncate">{item.title}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5 truncate">{item.period}</p>
                </div>
                <p className="text-xs text-on-surface-variant truncate">{item.collectionName}</p>
                <StatusBadge status={isPublished ? 'active' : 'inactive'} />
                <div className="flex items-center gap-1">
                  <Link
                    to={`/admin/items/${item.id}/edit`}
                    className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors"
                    title="Edit"
                  >
                    <span className="material-symbols-outlined text-lg">edit</span>
                  </Link>
                  {isPublished ? (
                    <button
                      onClick={() => unpublishMutation.mutate(item.id)}
                      disabled={unpublishMutation.isPending}
                      className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-50"
                      title="Unpublish"
                    >
                      <span className="material-symbols-outlined text-lg">visibility_off</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => publishMutation.mutate(item.id)}
                      disabled={publishMutation.isPending}
                      className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-50"
                      title="Publish"
                    >
                      <span className="material-symbols-outlined text-lg">publish</span>
                    </button>
                  )}
                  <button
                    onClick={() => setConfirmArchive(item.id)}
                    className="p-2 rounded-lg text-on-surface-variant hover:bg-error-container/30 hover:text-error transition-colors"
                    title="Archive"
                  >
                    <span className="material-symbols-outlined text-lg">archive</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <ConfirmDialog
        open={Boolean(confirmArchive)}
        title="Archive Item"
        message="This will unpublish and archive the item. It won't appear in the public gallery."
        confirmLabel="Archive"
        destructive
        onConfirm={() => confirmArchive && archiveMutation.mutate(confirmArchive)}
        onCancel={() => setConfirmArchive(null)}
      />
    </div>
  );
}
