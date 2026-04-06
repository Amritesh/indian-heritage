import {
  collection,
  getDoc,
  getDocs,
  query,
  limit as limitQuery,
  orderBy,
  where,
  doc,
  QueryConstraint,
} from 'firebase/firestore';
import { CollectionItemQuery, ItemRecord, ItemSort } from '@/entities/item/model/types';
import { scoreSearchResults } from '@/shared/lib/search';
import { getFirestoreOrThrow } from '@/shared/services/firestore';
import { gsUrlToHttps } from '@/shared/lib/formatters';
import { firestore } from '@/shared/config/firebase';
import { getCollectionRegistryEntry, collectionRegistry } from '@/shared/config/collections';
import { hasSupabaseEnv } from '@/shared/config/supabase';
import {
  getCollectionItemsBySlugFromSupabase,
  getItemByIdFromSupabase,
  getRelatedItemsFromSupabase,
  searchItemsFromSupabase,
} from './itemService.supabase';

const COLLECTION_SCAN_LIMIT = 2000;
const RELATED_ITEMS_LIMIT = 4;
const GLOBAL_SEARCH_SCAN_LIMIT = 2000;
export const DEFAULT_PAGE_SIZE = 24;

function mapItemSnapshot(data: Record<string, unknown>): ItemRecord {
  return {
    id: String(data.id ?? ''),
    collectionId: String(data.collectionId ?? ''),
    collectionSlug: String(data.collectionSlug ?? ''),
    collectionName: String(data.collectionName ?? ''),
    title: String(data.title ?? ''),
    subtitle: String(data.subtitle ?? ''),
    period: String(data.period ?? ''),
    dateText: String(data.dateText ?? ''),
    culture: String(data.culture ?? ''),
    location: String(data.location ?? ''),
    description: String(data.description ?? ''),
    shortDescription: String(data.shortDescription ?? ''),
    imageUrl: gsUrlToHttps(String(data.imageUrl ?? '')),
    imageAlt: String(data.imageAlt ?? data.title ?? ''),
    primaryMedia: (data.primaryMedia as ItemRecord['primaryMedia']) ?? null,
    gallery: Array.isArray(data.gallery) ? (data.gallery as ItemRecord['gallery']) : [],
    materials: Array.isArray(data.materials) ? (data.materials as string[]) : [],
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
    notes: Array.isArray(data.notes) ? (data.notes as string[]) : [],
    pageNumber: Number(data.pageNumber ?? 0),
    denominationSystem: String(data.denominationSystem ?? ''),
    denominationKey: data.denominationKey == null ? null : String(data.denominationKey),
    denominationRank: Number(data.denominationRank ?? 0),
    denominationBaseValue: data.denominationBaseValue == null ? null : Number(data.denominationBaseValue),
    sortYearStart: Number(data.sortYearStart ?? 0),
    sortYearEnd: data.sortYearEnd == null ? null : Number(data.sortYearEnd),
    estimatedPriceMin: Number(data.estimatedPriceMin ?? 0),
    estimatedPriceMax: Number(data.estimatedPriceMax ?? 0),
    estimatedPriceAvg: Number(data.estimatedPriceAvg ?? 0),
    weightGrams: data.weightGrams == null ? null : Number(data.weightGrams),
    sortYear: Number(data.sortYear ?? 0),
    importedAt: normalizeTimestamp(data.importedAt),
    updatedAt: normalizeTimestamp(data.updatedAt),
    searchText: String(data.searchText ?? ''),
    searchKeywords: Array.isArray(data.searchKeywords) ? (data.searchKeywords as string[]) : [],
    metadata:
      typeof data.metadata === 'object' && data.metadata !== null
        ? (data.metadata as ItemRecord['metadata'])
        : {},
  };
}

export async function getItemById(itemId: string, options?: { includePrivate?: boolean }) {
  if (hasSupabaseEnv) {
    return getItemByIdFromSupabase(itemId, options);
  }

  if (!firestore) {
    // When Firebase is missing, we check all collections' APIs for this item
    // This is slow but better than crashing on the detail page
    const results = await Promise.all(
      collectionRegistry.filter(c => c.enabled).map(c => fetchItemsFromApi(c.slug))
    );
    const allItems = results.flat();
    return allItems.find(i => i.id === itemId) || null;
  }
  const db = getFirestoreOrThrow();
  const snapshot = await getDoc(doc(db, 'items', itemId));
  if (!snapshot.exists()) return null;
  return mapItemSnapshot(snapshot.data());
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
    const aKnown = Number.isFinite(aValue) && Number(aValue) > 0;
    const bKnown = Number.isFinite(bValue) && Number(bValue) > 0;
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

function normalizeTimestamp(value: unknown) {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return new Date(value).toISOString();
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    const seconds = Number((value as { seconds?: number }).seconds ?? 0);
    const nanos = Number((value as { nanoseconds?: number }).nanoseconds ?? 0);
    return new Date(seconds * 1000 + Math.floor(nanos / 1e6)).toISOString();
  }
  return String(value);
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

async function fetchItemsFromApi(collectionSlug: string): Promise<ItemRecord[]> {
  const entry = getCollectionRegistryEntry(collectionSlug);
  if (!entry?.sourceUrl) return [];

  try {
    const response = await fetch(entry.sourceUrl);
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data.map(mapItemSnapshot) : [];
  } catch (error) {
    console.error('Failed to fetch items from API fallback:', error);
    return [];
  }
}

export async function getCollectionItemsPage(
  params: CollectionItemQuery,
  cursor?: number | null,
): Promise<ItemPage> {
  const pageSize = params.limit ?? DEFAULT_PAGE_SIZE;
  const pageIndex = cursor ?? 0;
  const normalizedSearch = params.search?.trim().toLowerCase() ?? '';

  if (hasSupabaseEnv) {
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

  if (!firestore) {
    let allItems = await fetchItemsFromApi(params.collectionSlug);
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

  const db = getFirestoreOrThrow();
  const constraints: QueryConstraint[] = [
    where('collectionSlug', '==', params.collectionSlug),
    where('published', '==', true),
  ];

  const snapshot = await getDocs(
    query(collection(db, 'items'), ...constraints, limitQuery(COLLECTION_SCAN_LIMIT)),
  );
  let allItems = snapshot.docs.map((d) => mapItemSnapshot(d.data()));

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

// Legacy single-call version (kept for backward compatibility with hooks)
export async function getCollectionItems(params: CollectionItemQuery): Promise<ItemRecord[]> {
  const page = await getCollectionItemsPage(params);
  return page.items;
}

async function getAllCollectionItemsForSearch(collectionSlug: string) {
  const db = getFirestoreOrThrow();
  const constraints: QueryConstraint[] = [
    where('collectionSlug', '==', collectionSlug),
    where('published', '==', true),
  ];
  const snapshot = await getDocs(
    query(
      collection(db, 'items'),
      ...constraints,
      orderBy('pageNumber', 'asc'),
      limitQuery(COLLECTION_SCAN_LIMIT),
    ),
  );
  return snapshot.docs.map((d) => mapItemSnapshot(d.data()));
}

export async function getRelatedItems(item: ItemRecord) {
  if (hasSupabaseEnv) {
    const relatedItems = await getRelatedItemsFromSupabase(item.id);
    return relatedItems.slice(0, 3);
  }

  if (!firestore) {
    const allItems = await fetchItemsFromApi(item.collectionSlug);
    return allItems
      .filter((related) => related.id !== item.id)
      .slice(0, 3);
  }
  const db = getFirestoreOrThrow();
  const snapshot = await getDocs(
    query(
      collection(db, 'items'),
      where('collectionSlug', '==', item.collectionSlug),
      where('published', '==', true),
      orderBy('pageNumber', 'asc'),
      limitQuery(RELATED_ITEMS_LIMIT),
    ),
  );

  return snapshot.docs
    .map((d) => mapItemSnapshot(d.data()))
    .filter((related) => related.id !== item.id)
    .slice(0, 3);
}

export async function searchItems(term: string, collectionSlug?: string, tag?: string, sort: ItemSort = 'featured') {
  const normalizedTerm = term.trim().toLowerCase();
  const hasTag = Boolean(tag && tag.trim());
  if (normalizedTerm.length < 2 && !hasTag) return [];

  if (hasSupabaseEnv) {
    let allItems = await searchItemsFromSupabase(normalizedTerm, collectionSlug);
    if (hasTag) {
      allItems = allItems.filter((i) => matchesTag(i, tag!));
    }
    return sort === 'featured' ? allItems : sortItems(allItems, sort);
  }

  if (!firestore) {
    // Basic search across all fallback-eligible collections
    const collectionsToSearch = collectionSlug 
      ? [collectionSlug] 
      : collectionRegistry.filter(c => c.enabled).map(c => c.slug);
    
    const results = await Promise.all(collectionsToSearch.map(fetchItemsFromApi));
    let allItems = results.flat();
    if (hasTag) {
      allItems = allItems.filter((i) => matchesTag(i, tag!));
    }
    const ranked = normalizedTerm ? scoreSearchResults(allItems, normalizedTerm) : allItems;
    return sort === 'featured' ? ranked : sortItems(ranked, sort);
  }

  const db = getFirestoreOrThrow();

  const constraints: QueryConstraint[] = [where('published', '==', true), orderBy('pageNumber', 'asc')];

  if (collectionSlug) {
    constraints.unshift(where('collectionSlug', '==', collectionSlug));
  }

  const snapshot = await getDocs(
    query(collection(db, 'items'), ...constraints, limitQuery(GLOBAL_SEARCH_SCAN_LIMIT)),
  );
  let items = snapshot.docs.map((d) => mapItemSnapshot(d.data()));
  if (hasTag) {
    items = items.filter((i) => matchesTag(i, tag!));
  }
  const ranked = normalizedTerm ? scoreSearchResults(items, normalizedTerm) : items;
  return sort === 'featured' ? ranked : sortItems(ranked, sort);
}
