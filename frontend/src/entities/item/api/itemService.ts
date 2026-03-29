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
import { CollectionItemQuery, ItemRecord } from '@/entities/item/model/types';
import { scoreSearchResults } from '@/shared/lib/search';
import { getFirestoreOrThrow } from '@/shared/services/firestore';

const COLLECTION_SCAN_LIMIT = 250;
const RELATED_ITEMS_LIMIT = 4;
const GLOBAL_SEARCH_SCAN_LIMIT = 250;

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
    imageUrl: String(data.imageUrl ?? ''),
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
  const db = getFirestoreOrThrow();
  const snapshot = await getDoc(doc(db, 'items', itemId));
  if (!snapshot.exists()) return null;
  return mapItemSnapshot(snapshot.data());
}

export async function getCollectionItems({
  collectionSlug,
  limit = 24,
  sort = 'featured',
  material,
  search,
}: CollectionItemQuery) {
  const db = getFirestoreOrThrow();
  const itemsRef = collection(db, 'items');
  const normalizedSearch = search?.trim().toLowerCase() ?? '';

  if (normalizedSearch) {
    const filteredItems = await getCollectionItemsForFiltering(collectionSlug, material);
    return scoreSearchResults(
      filteredItems.filter((item) => item.searchText.includes(normalizedSearch)),
      normalizedSearch,
    );
  }

  const constraints: QueryConstraint[] = [
    where('collectionSlug', '==', collectionSlug),
    where('published', '==', true),
  ];

  if (material) {
    constraints.push(where('materials', 'array-contains', material));
  }

  if (sort === 'title') {
    constraints.push(orderBy('sortTitle', 'asc'));
  } else if (sort === 'recent') {
    constraints.push(orderBy('importedAt', 'desc'));
  } else {
    constraints.push(orderBy('pageNumber', 'asc'));
  }

  constraints.push(limitQuery(limit));

  const snapshot = await getDocs(query(itemsRef, ...constraints));
  return snapshot.docs.map((docSnapshot) => mapItemSnapshot(docSnapshot.data()));
}

export async function getCollectionItemsForFiltering(collectionSlug: string, material?: string) {
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

  return snapshot.docs.map((docSnapshot) => mapItemSnapshot(docSnapshot.data()));
}

export async function getRelatedItems(item: ItemRecord) {
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
    .map((docSnapshot) => mapItemSnapshot(docSnapshot.data()))
    .filter((related) => related.id !== item.id)
    .slice(0, 3);
}

export async function searchItems(term: string, collectionSlug?: string) {
  const db = getFirestoreOrThrow();
  const normalizedTerm = term.trim().toLowerCase();
  if (normalizedTerm.length < 2) return [];

  const constraints: QueryConstraint[] = [where('published', '==', true), orderBy('pageNumber', 'asc')];

  if (collectionSlug) {
    constraints.unshift(where('collectionSlug', '==', collectionSlug));
  }

  const snapshot = await getDocs(
    query(collection(db, 'items'), ...constraints, limitQuery(GLOBAL_SEARCH_SCAN_LIMIT)),
  );
  const items = snapshot.docs.map((docSnapshot) => mapItemSnapshot(docSnapshot.data()));
  return scoreSearchResults(items, normalizedTerm);
}
