import {
  collection,
  getDocs,
  query,
  where,
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
    filterableMaterials: Array.isArray(data.filterableMaterials)
      ? (data.filterableMaterials as string[])
      : [],
    sortOrder: Number(data.sortOrder ?? 0),
    status: String(data.status ?? 'active'),
    enabled: Boolean(data.enabled ?? true),
    lastSyncedAt: data.lastSyncedAt ? String(data.lastSyncedAt) : null,
  };
}

export async function getCollections() {
  const db = getFirestoreOrThrow();
  const collectionRef = collection(db, 'collections');
  const snapshot = await getDocs(query(collectionRef, where('enabled', '==', true)));

  return snapshot.docs
    .map((docSnapshot) => mapCollectionSnapshot(docSnapshot.data()))
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

export async function getCollectionBySlug(slug: string) {
  const db = getFirestoreOrThrow();
  const snapshot = await getDocs(
    query(collection(db, 'collections'), where('slug', '==', slug), where('enabled', '==', true)),
  );

  const first = snapshot.docs[0];
  return first ? mapCollectionSnapshot(first.data()) : null;
}
