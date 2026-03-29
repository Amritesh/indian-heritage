import { ItemRecord } from '@/entities/item/model/types';
import { ItemCard } from '@/shared/ui/ItemCard';

type ItemGridProps = {
  items: ItemRecord[];
};

export function ItemGrid({ items }: ItemGridProps) {
  return (
    <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  );
}
