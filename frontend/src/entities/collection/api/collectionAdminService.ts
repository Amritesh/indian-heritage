import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { CollectionRecord } from '@/entities/collection/model/types';
import { getFirestoreOrThrow } from '@/shared/services/firestore';

function mapCollectionSnapshot(data: Record<string, unknown>): CollectionRecord {
  return {
    id: String(data.id ?? ''),
    slug: String(data.slug ?? ''),
    name: String(data.name ?? ''),
    displayName: String(data.displayName ?? data.name ?? ''),
    description: String(data.description ?? ''),
    longDescription: String(data.longDescription ?? data.description ?? ''),
    heroEyebrow: String(data.heroEyebrow ?? ''),
    culture: String(data.culture ?? ''),
    periodLabel: String(data.periodLabel ?? ''),
    sourceUrl: String(data.sourceUrl ?? ''),
    heroImage: String(data.heroImage ?? ''),
    thumbnailImage: String(data.thumbnailImage ?? data.heroImage ?? ''),
    itemCount: Number(data.itemCount ?? 0),
    filterableMaterials: Array.isArray(data.filterableMaterials) ? (data.filterableMaterials as string[]) : [],
    estimatedWorth: Number(data.estimatedWorth ?? 0),
    sortOrder: Number(data.sortOrder ?? 0),
    status: String(data.status ?? 'active'),
    enabled: Boolean(data.enabled ?? true),
    lastSyncedAt: data.lastSyncedAt ? String(data.lastSyncedAt) : null,
  };
}

export async function getAllCollectionsAdmin(): Promise<CollectionRecord[]> {
  const db = getFirestoreOrThrow();
  const snapshot = await getDocs(query(collection(db, 'collections'), orderBy('sortOrder', 'asc')));
  return snapshot.docs.map((d) => mapCollectionSnapshot(d.data()));
}

export type CollectionFormData = {
  name: string;
  displayName: string;
  slug: string;
  description: string;
  longDescription: string;
  heroEyebrow: string;
  culture: string;
  periodLabel: string;
  sourceUrl: string;
  heroImage: string;
  thumbnailImage: string;
  sortOrder: number;
  enabled: boolean;
};

export async function createCollection(data: CollectionFormData): Promise<string> {
  const db = getFirestoreOrThrow();
  const docRef = doc(collection(db, 'collections'));
  await setDoc(docRef, {
    ...data,
    id: docRef.id,
    itemCount: 0,
    filterableMaterials: [],
    status: 'active',
    lastSyncedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateCollection(id: string, data: Partial<CollectionFormData>): Promise<void> {
  const db = getFirestoreOrThrow();
  await updateDoc(doc(db, 'collections', id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function toggleCollectionEnabled(id: string, enabled: boolean): Promise<void> {
  const db = getFirestoreOrThrow();
  await updateDoc(doc(db, 'collections', id), { enabled, updatedAt: serverTimestamp() });
}
