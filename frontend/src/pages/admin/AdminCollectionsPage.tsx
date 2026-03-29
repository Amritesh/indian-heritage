import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllCollectionsAdmin, toggleCollectionEnabled } from '@/entities/collection/api/collectionAdminService';
import { StatusBadge } from '@/shared/ui/StatusBadge';

export function AdminCollectionsPage() {
  const qc = useQueryClient();
  const [toggling, setToggling] = useState<string | null>(null);

  const { data: collections = [], isLoading } = useQuery({
    queryKey: ['admin', 'collections'],
    queryFn: getAllCollectionsAdmin,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      toggleCollectionEnabled(id, enabled),
    onMutate: ({ id }) => setToggling(id),
    onSettled: () => {
      setToggling(null);
      qc.invalidateQueries({ queryKey: ['admin', 'collections'] });
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="eyebrow">Archive</span>
          <h1 className="mt-2 font-headline text-3xl font-bold text-on-surface">Collections</h1>
        </div>
        <Link to="/admin/collections/new" className="btn-primary shrink-0">
          <span className="material-symbols-outlined text-lg">add</span>
          New Collection
        </Link>
      </div>

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant/10 bg-surface-container-low/50">
          <div className="grid grid-cols-[1fr,auto,auto,auto] gap-4 text-xs font-label font-bold uppercase tracking-wider text-outline">
            <span>Collection</span>
            <span>Items</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
        </div>

        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-6 py-4 border-b border-outline-variant/10 flex items-center gap-4">
              <div className="h-4 flex-1 bg-outline/10 rounded animate-pulse" />
              <div className="h-4 w-12 bg-outline/10 rounded animate-pulse" />
              <div className="h-6 w-20 bg-outline/10 rounded-full animate-pulse" />
              <div className="h-8 w-20 bg-outline/10 rounded animate-pulse" />
            </div>
          ))
        ) : collections.length === 0 ? (
          <div className="px-6 py-16 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-5xl text-outline mb-4 block">collections_bookmark</span>
            <p className="font-semibold">No collections yet</p>
            <p className="text-sm mt-1">Create your first collection to get started.</p>
          </div>
        ) : (
          collections.map((col) => (
            <div
              key={col.id}
              className="px-6 py-4 border-b border-outline-variant/10 last:border-0 grid grid-cols-[1fr,auto,auto,auto] gap-4 items-center hover:bg-surface-container-low/30 transition-colors"
            >
              <div className="min-w-0">
                <p className="font-semibold text-sm text-on-surface truncate">{col.displayName}</p>
                <p className="text-xs text-on-surface-variant mt-0.5 truncate">{col.description}</p>
              </div>
              <span className="text-sm text-on-surface-variant tabular-nums">{col.itemCount}</span>
              <StatusBadge status={col.enabled ? 'active' : 'inactive'} />
              <div className="flex items-center gap-2">
                <Link
                  to={`/admin/collections/${col.id}/edit`}
                  className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors"
                  title="Edit"
                >
                  <span className="material-symbols-outlined text-lg">edit</span>
                </Link>
                <button
                  onClick={() => toggleMutation.mutate({ id: col.id, enabled: !col.enabled })}
                  disabled={toggling === col.id}
                  className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-50"
                  title={col.enabled ? 'Disable' : 'Enable'}
                >
                  <span className="material-symbols-outlined text-lg">
                    {col.enabled ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
