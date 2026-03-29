import { ItemRecord } from '@/entities/item/model/types';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ItemGrid } from '@/shared/ui/ItemGrid';

type SearchResultsProps = {
  items: ItemRecord[];
  term: string;
};

export function SearchResults({ items, term }: SearchResultsProps) {
  if (!items.length) {
    return (
      <EmptyState
        title="The archives are silent"
        description={`No records matched "${term}". Try a broader dynasty, material, ruler, or mint.`}
        actionLabel="Browse collections"
        actionTo="/collections"
        icon="search_off"
      />
    );
  }

  return <ItemGrid items={items} />;
}
