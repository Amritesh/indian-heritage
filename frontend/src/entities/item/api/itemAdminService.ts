import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  QueryConstraint,
} from 'firebase/firestore';
import { ItemRecord } from '@/entities/item/model/types';
import { getFirestoreOrThrow } from '@/shared/services/firestore';

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
    denominationSystem: String(data.denominationSystem ?? ''),
    denominationKey: String(data.denominationKey ?? ''),
    denominationRank: Number(data.denominationRank ?? 0),
    denominationBaseValue: Number(data.denominationBaseValue ?? 0),
    sortYearStart: Number(data.sortYearStart ?? 0),
    sortYearEnd: Number(data.sortYearEnd ?? 0),
    estimatedPriceMin: Number(data.estimatedPriceMin ?? 0),
    estimatedPriceMax: Number(data.estimatedPriceMax ?? 0),
    estimatedPriceAvg: Number(data.estimatedPriceAvg ?? 0),
    weightGrams: Number(data.weightGrams ?? 0),
    sortYear: Number(data.sortYear ?? 0),
    searchText: String(data.searchText ?? ''),
    searchKeywords: Array.isArray(data.searchKeywords) ? (data.searchKeywords as string[]) : [],
    metadata:
      typeof data.metadata === 'object' && data.metadata !== null
        ? (data.metadata as ItemRecord['metadata'])
        : {},
  };
}

export type AdminItemQuery = {
  collectionSlug?: string;
  status?: 'published' | 'unpublished' | 'all';
  search?: string;
  pageSize?: number;
};

export async function getAdminItems({
  collectionSlug,
  status = 'all',
  search = '',
  pageSize = 100,
}: AdminItemQuery): Promise<ItemRecord[]> {
  const db = getFirestoreOrThrow();
  const constraints: QueryConstraint[] = [];

  if (collectionSlug) constraints.push(where('collectionSlug', '==', collectionSlug));
  if (status === 'published') constraints.push(where('published', '==', true));
  if (status === 'unpublished') constraints.push(where('published', '==', false));

  constraints.push(orderBy('pageNumber', 'asc'), limit(pageSize));

  const snapshot = await getDocs(query(collection(db, 'items'), ...constraints));
  const items = snapshot.docs.map((d) => mapItemSnapshot(d.data()));
  const normalizedSearch = search.trim().toLowerCase();

  if (!normalizedSearch) return items;

  return items.filter((item) =>
    [item.title, item.period, item.collectionName, item.description, item.searchText, item.notes.join(' ')]
      .concat([
        String(item.metadata?.rulerOrIssuer ?? ''),
        String(item.metadata?.mintOrPlace ?? ''),
        String(item.metadata?.denomination ?? ''),
      ])
      .join(' ')
      .toLowerCase()
      .includes(normalizedSearch),
  );
}

export type ItemFormData = {
  title: string;
  subtitle: string;
  description: string;
  shortDescription: string;
  period: string;
  dateText: string;
  culture: string;
  location: string;
  imageUrl: string;
  imageAlt: string;
  materials: string[];
  tags: string[];
  notes: string[];
  collectionId: string;
  collectionSlug: string;
  collectionName: string;
  metadata: ItemRecord['metadata'];
};

export async function createItem(data: ItemFormData): Promise<string> {
  const db = getFirestoreOrThrow();
  const docRef = doc(collection(db, 'items'));
  const searchText = [data.title, data.subtitle, data.description, data.culture, data.period, ...data.materials, ...data.tags]
    .join(' ')
    .toLowerCase();

  await setDoc(docRef, {
    ...data,
    id: docRef.id,
    published: false,
    pageNumber: 0,
    searchText,
    searchKeywords: data.tags,
    primaryMedia: null,
    gallery: [],
    importedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateItem(id: string, data: Partial<ItemFormData>): Promise<void> {
  const db = getFirestoreOrThrow();
  const updates: Record<string, unknown> = { ...data, updatedAt: serverTimestamp() };

  if (data.title || data.description) {
    // Caller should pass full text fields if they want searchText updated
  }

  await updateDoc(doc(db, 'items', id), updates);
}

export async function publishItem(id: string): Promise<void> {
  const db = getFirestoreOrThrow();
  await updateDoc(doc(db, 'items', id), { published: true, updatedAt: serverTimestamp() });
}

export async function unpublishItem(id: string): Promise<void> {
  const db = getFirestoreOrThrow();
  await updateDoc(doc(db, 'items', id), { published: false, updatedAt: serverTimestamp() });
}

export async function archiveItem(id: string): Promise<void> {
  const db = getFirestoreOrThrow();
  await updateDoc(doc(db, 'items', id), { published: false, archived: true, updatedAt: serverTimestamp() });
}
