import { Link } from 'react-router-dom';
import { useCollections } from '@/entities/collection/hooks/useCollections';
import { CollectionSkeletonGrid } from '@/shared/ui/Skeletons';
import { CollectionCard } from '@/shared/ui/CollectionCard';
import { ErrorState } from '@/shared/ui/ErrorState';
import { SectionHeader } from '@/shared/ui/SectionHeader';

export function FeaturedHighlights() {
  const { data, isLoading, isError, error } = useCollections();

  return (
    <section className="page-shell">
      <SectionHeader
        eyebrow="Featured Collections"
        title="Curated archives of Indian heritage"
        description="Explore British India colonial coinage, Mughal imperial silver, and Foreign Ruler issues, preserved with museum-grade metadata and scholarly detail."
        action={
          <Link to="/collections" className="btn-ghost flex items-center gap-2">
            Browse all
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        }
      />

      {isLoading && <CollectionSkeletonGrid />}
      {isError && <ErrorState message={(error as Error).message} />}
      {data && (
        <div className="grid gap-6 md:grid-cols-2">
          {data.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      )}
    </section>
  );
}
