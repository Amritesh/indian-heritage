import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCollection } from '@/entities/collection/hooks/useCollections';
import { useCollectionItems } from '@/entities/item/hooks/useCollectionItems';
import { ItemSort } from '@/entities/item/model/types';
import { CollectionFilters } from '@/features/collection-browser/components/CollectionFilters';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { ImageWithFallback } from '@/shared/ui/ImageWithFallback';
import { ItemGrid } from '@/shared/ui/ItemGrid';
import { ItemSkeletonGrid } from '@/shared/ui/Skeletons';
import { formatCurrency } from '@/shared/lib/formatters';

export function CollectionDetailPage() {
  const { slug = '' } = useParams();
  const {
    data: collection,
    isLoading: isCollectionLoading,
    isError: isCollectionError,
    error: collectionError,
  } = useCollection(slug);

  const [search, setSearch] = useState('');
  const [material, setMaterial] = useState('');
  const [sort, setSort] = useState<ItemSort>('featured');
  const debouncedSearch = useDebouncedValue(search);

  const {
    data,
    isLoading: isItemsLoading,
    isError: isItemsError,
    error: itemsError,
    fetchNextPage,
    isFetchingNextPage,
  } = useCollectionItems({
    collectionSlug: slug,
    search: debouncedSearch,
    material,
    sort,
  });

  const items = data?.items ?? [];
  const hasMore = data?.hasMore ?? false;
  const totalLoaded = data?.totalLoaded ?? 0;

  const materials = useMemo(
    () => collection?.filterableMaterials ?? [],
    [collection?.filterableMaterials],
  );

  const worthLabel = formatCurrency(collection?.estimatedWorth);

  if (isCollectionLoading) {
    return (
      <div className="page-shell">
        <ItemSkeletonGrid count={3} />
      </div>
    );
  }

  if (isCollectionError) {
    return (
      <div className="page-shell">
        <ErrorState message={(collectionError as Error).message} />
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="page-shell">
        <EmptyState
          title="Collection not found"
          description="This collection either has not been imported yet or is not enabled for public display."
          actionLabel="Back to collections"
          actionTo="/collections"
          icon="folder_off"
        />
      </div>
    );
  }

  return (
    <div className="page-shell">
      {/* Collection Hero */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-0 items-center bg-surface-container-low rounded-xl overflow-hidden min-h-[350px] mb-12">
        <div className="md:col-span-7 h-full relative min-h-[250px]">
          <ImageWithFallback
            src={collection.heroImage}
            alt={collection.name}
            wrapperClassName="min-h-[250px] md:min-h-[350px]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-surface-container-low md:block hidden" />
        </div>
        <div className="md:col-span-5 p-8 md:p-10 space-y-6">
          <nav className="flex items-center gap-2">
            <Link
              to="/collections"
              className="font-label text-[10px] font-bold uppercase tracking-widest text-outline hover:text-primary transition-colors"
            >
              Collections
            </Link>
            <span className="material-symbols-outlined text-xs text-outline">chevron_right</span>
            <span className="font-label text-[10px] font-bold uppercase tracking-widest text-primary">
              {collection.name}
            </span>
          </nav>
          <div>
            {collection.heroEyebrow && (
              <span className="eyebrow">{collection.heroEyebrow}</span>
            )}
            <h1 className="mt-2 font-headline text-3xl md:text-4xl font-bold leading-tight text-on-surface">
              {collection.displayName}
            </h1>
          </div>
          <p className="text-on-surface-variant leading-relaxed">{collection.longDescription}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-outline-variant/20">
            <div>
              <div className="metadata-label">Culture</div>
              <div className="mt-1 text-sm font-semibold">{collection.culture || '—'}</div>
            </div>
            <div>
              <div className="metadata-label">Period</div>
              <div className="mt-1 text-sm font-semibold">{collection.periodLabel || '—'}</div>
            </div>
            <div>
              <div className="metadata-label">Items</div>
              <div className="mt-1 text-sm font-semibold tabular-nums">{collection.itemCount.toLocaleString()}</div>
            </div>
            {worthLabel && (
              <div>
                <div className="metadata-label">Est. Worth</div>
                <div className="mt-1 text-sm font-semibold text-primary">{worthLabel}</div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Filters and Items */}
      <CollectionFilters
        searchValue={search}
        onSearchChange={setSearch}
        material={material}
        materials={materials}
        onMaterialChange={setMaterial}
        sort={sort}
        onSortChange={setSort}
      />

      {isItemsLoading && <ItemSkeletonGrid />}
      {isItemsError && <ErrorState message={(itemsError as Error).message} />}

      {items.length > 0 && (
        <>
          <ItemGrid items={items} />

          {/* Pagination footer */}
          <div className="mt-10 flex flex-col items-center gap-4">
            <p className="text-sm text-on-surface-variant">
              Showing <span className="font-semibold text-on-surface">{totalLoaded}</span> of{' '}
              <span className="font-semibold text-on-surface">{collection.itemCount}</span> artifacts
            </p>

            {hasMore && (
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="btn-secondary disabled:opacity-50"
              >
                {isFetchingNextPage ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                    Loading more…
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">expand_more</span>
                    Load more artifacts
                  </>
                )}
              </button>
            )}

            {!hasMore && totalLoaded > 0 && (
              <p className="text-xs text-outline uppercase tracking-wider font-label">
                ── All {totalLoaded} artifacts loaded ──
              </p>
            )}
          </div>
        </>
      )}

      {!isItemsLoading && items.length === 0 && (
        <EmptyState
          title="No matching artifacts"
          description="Try clearing the current search or material filter to reveal the full collection."
          icon="search_off"
        />
      )}
    </div>
  );
}
