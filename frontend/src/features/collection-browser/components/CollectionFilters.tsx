import { ChangeEvent } from 'react';
import { ItemSort } from '@/entities/item/model/types';

type CollectionFiltersProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  material: string;
  materials: string[];
  onMaterialChange: (value: string) => void;
  sort: ItemSort;
  onSortChange: (value: ItemSort) => void;
};

export function CollectionFilters({
  searchValue,
  onSearchChange,
  material,
  materials,
  onMaterialChange,
  sort,
  onSortChange,
}: CollectionFiltersProps) {
  return (
    <div className="bg-surface-container-low p-5 rounded-xl mb-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
      <div className="flex items-center gap-3 bg-surface-container-lowest rounded-lg px-4 py-2 border border-outline-variant/10">
        <span className="material-symbols-outlined text-outline text-xl">search</span>
        <input
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search within this collection..."
          className="w-full bg-transparent border-none focus:ring-0 text-base font-body placeholder:text-outline/60 p-0"
          type="search"
        />
      </div>

      <label className="space-y-2">
        <span className="metadata-label">Materiality</span>
        <select
          value={material}
          onChange={(event: ChangeEvent<HTMLSelectElement>) => onMaterialChange(event.target.value)}
          className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary/20"
        >
          <option value="">All materials</option>
          {materials.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-2">
        <span className="metadata-label">Sort by</span>
        <select
          value={sort}
          onChange={(event: ChangeEvent<HTMLSelectElement>) => onSortChange(event.target.value as ItemSort)}
          className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary/20"
        >
          <option value="featured">Catalog order</option>
          <option value="title">Title A-Z</option>
          <option value="recent">Recently imported</option>
        </select>
      </label>
    </div>
  );
}
