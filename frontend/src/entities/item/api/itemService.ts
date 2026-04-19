import { CollectionItemQuery, ItemRecord, ItemSort } from '@/entities/item/model/types';
import { scoreSearchResults } from '@/shared/lib/search';
import { hasSupabaseEnv } from '@/shared/config/supabase';
import {
  getCollectionItemsBySlugFromSupabase,
  getItemByIdFromSupabase,
  getRelatedItemsFromSupabase,
  searchItemsFromSupabase,
} from './itemService.supabase';

const RELATED_ITEMS_LIMIT = 4;
export const DEFAULT_PAGE_SIZE = 24;

function assertSupabaseArchiveConfigured() {
  if (!hasSupabaseEnv) {
    throw new Error('Supabase archive configuration is required for public metadata reads.');
  }
}

export async function getItemById(itemId: string, options?: { includePrivate?: boolean }) {
  assertSupabaseArchiveConfigured();
  return getItemByIdFromSupabase(itemId, options);
}

export type ItemPage = {
  items: ItemRecord[];
  cursor: number | null;
  hasMore: boolean;
  total: number;
};

export function sortItems(items: ItemRecord[], sort: ItemSort) {
  const list = [...items];
  const compareNumericWithUnknownLast = (aValue: number | null | undefined, bValue: number | null | undefined, direction: 'asc' | 'desc') => {
    const aKnown = Number.isFinite(aValue) && Number(aValue) !== 0;
    const bKnown = Number.isFinite(bValue) && Number(bValue) !== 0;
    if (aKnown && !bKnown) return -1;
    if (!aKnown && bKnown) return 1;
    if (!aKnown && !bKnown) return 0;
    return direction === 'asc' ? Number(aValue) - Number(bValue) : Number(bValue) - Number(aValue);
  };

  if (sort === 'denomination_asc') {
    return list.sort((a, b) =>
      a.denominationRank - b.denominationRank
      || (a.denominationBaseValue ?? 0) - (b.denominationBaseValue ?? 0)
      || a.title.localeCompare(b.title),
    );
  }
  if (sort === 'price_asc') {
    return list.sort((a, b) =>
      compareNumericWithUnknownLast(a.estimatedPriceAvg, b.estimatedPriceAvg, 'asc')
      || a.title.localeCompare(b.title),
    );
  }
  if (sort === 'price_desc') {
    return list.sort((a, b) =>
      compareNumericWithUnknownLast(a.estimatedPriceAvg, b.estimatedPriceAvg, 'desc')
      || a.title.localeCompare(b.title),
    );
  }
  if (sort === 'year_asc') {
    return list.sort((a, b) =>
      compareNumericWithUnknownLast(a.sortYearStart, b.sortYearStart, 'asc')
      || a.title.localeCompare(b.title),
    );
  }
  if (sort === 'year_desc') {
    return list.sort((a, b) =>
      compareNumericWithUnknownLast(a.sortYearStart, b.sortYearStart, 'desc')
      || a.title.localeCompare(b.title),
    );
  }
  if (sort === 'recent') {
    return list.sort((a, b) => String(b.updatedAt ?? b.importedAt ?? '').localeCompare(String(a.updatedAt ?? a.importedAt ?? '')));
  }
  if (sort === 'title') return list.sort((a, b) => a.title.localeCompare(b.title));
  return list.sort((a, b) => a.pageNumber - b.pageNumber);
}

function normalizeTag(value: string) {
  return value.trim().toLowerCase();
}

function matchesTag(item: ItemRecord, tag: string) {
  const normalized = normalizeTag(tag);
  if (!normalized) return true;
  return [...item.tags, ...(item.publicTags ?? []), ...(item.entityBadges ?? [])]
    .some((t) => normalizeTag(t) === normalized);
}

export async function getCollectionItemsPage(
  params: CollectionItemQuery,
  cursor?: number | null,
): Promise<ItemPage> {
  assertSupabaseArchiveConfigured();

  const pageSize = params.limit ?? DEFAULT_PAGE_SIZE;
  const pageIndex = cursor ?? 0;
  const normalizedSearch = params.search?.trim().toLowerCase() ?? '';

  let allItems = await getCollectionItemsBySlugFromSupabase(params.collectionSlug);
  if (params.tag) {
    allItems = allItems.filter((i) => matchesTag(i, params.tag!));
  }
  if (normalizedSearch) {
    const scored = scoreSearchResults(allItems, normalizedSearch);
    allItems = params.sort && params.sort !== 'featured' ? sortItems(scored, params.sort) : scored;
  } else {
    allItems = sortItems(allItems, params.sort ?? 'featured');
  }
  const start = pageIndex * pageSize;
  const items = allItems.slice(start, start + pageSize);
  const hasMore = start + pageSize < allItems.length;
  return { items, cursor: hasMore ? pageIndex + 1 : null, hasMore, total: allItems.length };
}

export async function getCollectionItems(params: CollectionItemQuery): Promise<ItemRecord[]> {
  const page = await getCollectionItemsPage(params);
  return page.items;
}

export async function getRelatedItems(item: ItemRecord) {
  assertSupabaseArchiveConfigured();
  const relatedItems = await getRelatedItemsFromSupabase(item.id);
  return relatedItems.slice(0, RELATED_ITEMS_LIMIT - 1);
}

export async function searchItems(term: string, collectionSlug?: string, tag?: string, sort: ItemSort = 'featured') {
  assertSupabaseArchiveConfigured();

  const normalizedTerm = term.trim().toLowerCase();
  const hasTag = Boolean(tag && tag.trim());
  if (normalizedTerm.length < 2 && !hasTag) return [];

  let allItems = await searchItemsFromSupabase(normalizedTerm, collectionSlug);
  if (hasTag) {
    allItems = allItems.filter((i) => matchesTag(i, tag!));
  }
  return sort === 'featured' ? allItems : sortItems(allItems, sort);
}
