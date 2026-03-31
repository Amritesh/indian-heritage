import { ItemRecord } from '@/entities/item/model/types';

export type SearchResult = ItemRecord & { score: number };

export function scoreSearchResults(items: ItemRecord[], term: string) {
  const normalized = term.trim().toLowerCase();
  if (!normalized) return items.map((item) => ({ ...item, score: 0 }));

  const tokens = normalized.split(/\s+/).filter(Boolean);

  return items
    .map((item) => {
      const title = item.title.toLowerCase();
      const ruler = item.metadata.rulerOrIssuer?.toLowerCase() || '';
      const keywords = item.searchKeywords.map((k) => k.toLowerCase());
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

      // Exact match for the whole term gets highest priority
      if (title.includes(normalized)) score += 10;
      if (ruler.includes(normalized)) score += 8;

      // Token-based matching
      tokens.forEach((token) => {
        if (title.includes(token)) score += 5;
        if (ruler.includes(token)) score += 4;
        if (keywords.some((keyword) => keyword.startsWith(token))) score += 3;
        if (haystack.includes(token)) score += 1;
      });

      return { ...item, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
}
