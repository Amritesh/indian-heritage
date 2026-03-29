import { ItemRecord } from '@/entities/item/model/types';

export type SearchResult = ItemRecord & { score: number };

export function scoreSearchResults(items: ItemRecord[], term: string) {
  const normalized = term.trim().toLowerCase();
  if (!normalized) return items.map((item) => ({ ...item, score: 0 }));

  return items
    .map((item) => {
      const haystack = [
        item.title,
        item.subtitle,
        item.description,
        item.period,
        item.location,
        item.collectionName,
        item.metadata.rulerOrIssuer,
        item.metadata.seriesOrCatalog,
        item.searchText,
        item.tags.join(' '),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      let score = 0;
      if (item.title.toLowerCase().includes(normalized)) score += 7;
      if (item.metadata.rulerOrIssuer?.toLowerCase().includes(normalized)) score += 5;
      if (item.searchKeywords.some((keyword) => keyword.startsWith(normalized))) score += 4;
      if (haystack.includes(normalized)) score += 2;
      return { ...item, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
}
