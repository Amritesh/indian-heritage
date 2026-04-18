import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useCollections } from '@/entities/collection/hooks/useCollections';
import { useCollectionItems } from '@/entities/item/hooks/useCollectionItems';
import { ItemSkeletonGrid } from '@/shared/ui/Skeletons';
import { ErrorState } from '@/shared/ui/ErrorState';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ItemGrid } from '@/shared/ui/ItemGrid';
import { SectionHeader } from '@/shared/ui/SectionHeader';

export function HomeSpotlight() {
  const { data: collections } = useCollections();
  const featuredCollectionSlug = useMemo(() => collections?.[0]?.slug ?? '', [collections]);
  const { data, isLoading, isError, error } = useCollectionItems({
    collectionSlug: featuredCollectionSlug,
    limit: 3,
    sort: 'featured',
  });

  const items = data?.items?.slice(0, 3) ?? [];

  return (
    <section className="page-shell">
      <SectionHeader
        eyebrow="Curated Spotlight"
        title="Artifacts from the archive"
        description="Selected specimens from our collections, each with detailed metadata, provenance, and scholarly notes."
        action={
          <Link to="/search" className="btn-ghost flex items-center gap-2">
            Search archive
            <span className="material-symbols-outlined text-sm">search</span>
          </Link>
        }
      />

      {isLoading && <ItemSkeletonGrid count={3} />}
      {isError && <ErrorState message={(error as Error).message} />}
      {items.length > 0 && <ItemGrid items={items} />}
      {!isLoading && items.length === 0 && (
        <EmptyState
          title="Spotlight will appear after import"
          description="Run the import script to populate Firestore with collection items."
          icon="archive"
        />
      )}
    </section>
  );
}
