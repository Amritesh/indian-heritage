import {
  collection,
  getDoc,
  getDocs,
  query,
  limit as limitQuery,
  orderBy,
  where,
  doc,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  QueryConstraint,
} from 'firebase/firestore';
import { CollectionItemQuery, ItemRecord } from '@/entities/item/model/types';
import { scoreSearchResults } from '@/shared/lib/search';
import { getFirestoreOrThrow } from '@/shared/services/firestore';
import { gsUrlToHttps } from '@/shared/lib/formatters';
import { firestore } from '@/shared/config/firebase';
import { getCollectionRegistryEntry, collectionRegistry } from '@/shared/config/collections';

const COLLECTION_SCAN_LIMIT = 500;
const RELATED_ITEMS_LIMIT = 4;
const GLOBAL_SEARCH_SCAN_LIMIT = 500;
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
    searchText: String(data.searchText ?? ''),
    searchKeywords: Array.isArray(data.searchKeywords) ? (data.searchKeywords as string[]) : [],
    metadata:
      typeof data.metadata === 'object' && data.metadata !== null
        ? (data.metadata as ItemRecord['metadata'])
        : {},
  };
}

export async function getItemById(itemId: string) {
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
  cursor: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
};

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
  cursor?: QueryDocumentSnapshot<DocumentData> | null,
): Promise<ItemPage> {
  if (!firestore) {
    const allItems = await fetchItemsFromApi(params.collectionSlug);
    let items = allItems;

    if (params.material) {
      items = items.filter((i) => i.materials.includes(params.material!));
    }

    if (params.search) {
      items = scoreSearchResults(items, params.search);
    }

    // Basic pagination for fallback
    const pageSize = params.limit ?? DEFAULT_PAGE_SIZE;
    // Note: We don't have a real cursor for the API fallback
    return {
      items: items.slice(0, pageSize),
      cursor: null,
      hasMore: items.length > pageSize,
    };
  }

  const db = getFirestoreOrThrow();
  const pageSize = params.limit ?? DEFAULT_PAGE_SIZE;
  const normalizedSearch = params.search?.trim().toLowerCase() ?? '';

  // For search, scan the full collection and score/filter in memory
  if (normalizedSearch) {
    const allItems = await getAllCollectionItemsForSearch(params.collectionSlug, params.material);
    const scored = scoreSearchResults(allItems, normalizedSearch);
    return { items: scored, cursor: null, hasMore: false };
  }

  const constraints: QueryConstraint[] = [
    where('collectionSlug', '==', params.collectionSlug),
    where('published', '==', true),
  ];

  if (params.material) {
    constraints.push(where('materials', 'array-contains', params.material));
  }

  if (params.sort === 'title') {
    constraints.push(orderBy('title', 'asc'));
  } else if (params.sort === 'recent') {
    constraints.push(orderBy('importedAt', 'desc'));
  } else {
    constraints.push(orderBy('pageNumber', 'asc'));
  }

  if (cursor) {
    constraints.push(startAfter(cursor));
  }

  // Fetch one extra to know if there's a next page
  constraints.push(limitQuery(pageSize + 1));

  const snapshot = await getDocs(query(collection(db, 'items'), ...constraints));
  const docs = snapshot.docs;
  const hasMore = docs.length > pageSize;
  const pageDocs = hasMore ? docs.slice(0, pageSize) : docs;

  return {
    items: pageDocs.map((d) => mapItemSnapshot(d.data())),
    cursor: pageDocs.length > 0 ? pageDocs[pageDocs.length - 1] : null,
    hasMore,
  };
}

// Legacy single-call version (kept for backward compatibility with hooks)
export async function getCollectionItems(params: CollectionItemQuery): Promise<ItemRecord[]> {
  const page = await getCollectionItemsPage(params);
  return page.items;
}

async function getAllCollectionItemsForSearch(collectionSlug: string, material?: string) {
  const db = getFirestoreOrThrow();
  const constraints: QueryConstraint[] = [
    where('collectionSlug', '==', collectionSlug),
    where('published', '==', true),
  ];
  if (material) {
    constraints.push(where('materials', 'array-contains', material));
  }
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

export async function searchItems(term: string, collectionSlug?: string) {
  const normalizedTerm = term.trim().toLowerCase();
  if (normalizedTerm.length < 2) return [];

  if (!firestore) {
    // Basic search across all fallback-eligible collections
    const collectionsToSearch = collectionSlug 
      ? [collectionSlug] 
      : collectionRegistry.filter(c => c.enabled).map(c => c.slug);
    
    const results = await Promise.all(collectionsToSearch.map(fetchItemsFromApi));
    const allItems = results.flat();
    return scoreSearchResults(allItems, normalizedTerm);
  }

  const db = getFirestoreOrThrow();

  const constraints: QueryConstraint[] = [where('published', '==', true), orderBy('pageNumber', 'asc')];

  if (collectionSlug) {
    constraints.unshift(where('collectionSlug', '==', collectionSlug));
  }

  const snapshot = await getDocs(
    query(collection(db, 'items'), ...constraints, limitQuery(GLOBAL_SEARCH_SCAN_LIMIT)),
  );
  const items = snapshot.docs.map((d) => mapItemSnapshot(d.data()));
  return scoreSearchResults(items, normalizedTerm);
}
