import { useCollections } from '@/entities/collection/hooks/useCollections';
import { CollectionCard } from '@/shared/ui/CollectionCard';
import { ErrorState } from '@/shared/ui/ErrorState';
import { SectionHeader } from '@/shared/ui/SectionHeader';
import { CollectionSkeletonGrid } from '@/shared/ui/Skeletons';

export function CollectionsPage() {
  const { data, isLoading, isError, error } = useCollections();

  return (
    <div className="page-shell">
      <section className="relative mb-12 text-center">
        <h1 className="font-headline text-4xl md:text-6xl font-semibold mb-6 text-on-surface tracking-tight">
          Trace the <span className="italic text-primary">Ancestry</span> of History
        </h1>
        <p className="max-w-2xl mx-auto text-on-surface-variant font-body mb-10 text-lg leading-relaxed">
          Discover artifacts across eras, dynasties, and regions through our curated archival collections.
        </p>
      </section>

      <SectionHeader
        eyebrow="Collection Registry"
        title="Available archive collections"
        description="Explore British India, Mughal, and Foreign Ruler collections, preserved with museum-grade metadata and scholarly detail. More collections are being added as the archive grows."
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
    </div>
  );
}
