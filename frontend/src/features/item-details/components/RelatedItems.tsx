import { ItemRecord } from '@/entities/item/model/types';
import { useRelatedItems } from '@/entities/item/hooks/useItem';
import { ErrorState } from '@/shared/ui/ErrorState';
import { ItemGrid } from '@/shared/ui/ItemGrid';
import { ItemSkeletonGrid } from '@/shared/ui/Skeletons';

type RelatedItemsProps = {
  item: ItemRecord;
};

export function RelatedItems({ item }: RelatedItemsProps) {
  const { data, isLoading, isError, error } = useRelatedItems(item);

  if (isLoading) return <ItemSkeletonGrid count={3} />;
  if (isError) return <ErrorState title="Related artifacts unavailable" message={(error as Error).message} />;
  if (!data?.length) return null;

  return (
    <section className="mt-24">
      <div className="flex justify-between items-end mb-8">
        <div className="space-y-2">
          <span className="eyebrow">Discover</span>
          <h3 className="font-headline text-3xl font-bold">Similar Artifacts</h3>
        </div>
      </div>
      <ItemGrid items={data} />
    </section>
  );
}
