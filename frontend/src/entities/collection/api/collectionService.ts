import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from 'firebase/firestore';
import { CollectionRecord } from '@/entities/collection/model/types';
import { getFirestoreOrThrow } from '@/shared/services/firestore';
import { gsUrlToHttps } from '@/shared/lib/formatters';
import { firestore } from '@/shared/config/firebase';
import { collectionRegistry } from '@/shared/config/collections';
import { hasSupabaseEnv } from '@/shared/config/supabase';
import { getCollectionBySlugFromSupabase, getCollectionsFromSupabase } from './collectionService.supabase';

function mapCollectionSnapshot(data: Record<string, unknown>): CollectionRecord {
  return {
    id: String(data.id ?? data.slug ?? ''),
    slug: String(data.slug ?? ''),
    name: String(data.name ?? ''),
    displayName: String(data.displayName ?? data.name ?? ''),
    description: String(data.description ?? ''),
    longDescription: String(data.longDescription ?? data.description ?? ''),
    heroEyebrow: String(data.heroEyebrow ?? ''),
    culture: String(data.culture ?? ''),
    periodLabel: String(data.periodLabel ?? ''),
    sourceUrl: String(data.sourceUrl ?? ''),
    heroImage: gsUrlToHttps(String(data.heroImage ?? '')),
    thumbnailImage: gsUrlToHttps(String(data.thumbnailImage ?? data.heroImage ?? '')),
    itemCount: Number(data.itemCount ?? 0),
    filterableMaterials: Array.isArray(data.filterableMaterials)
      ? (data.filterableMaterials as string[])
      : [],
    estimatedWorth: Number(data.estimatedWorth ?? 0),
    sortOrder: Number(data.sortOrder ?? 0),
    status: String(data.status ?? 'active'),
    enabled: Boolean(data.enabled ?? true),
    lastSyncedAt: data.lastSyncedAt ? String(data.lastSyncedAt) : null,
  };
}

export async function getCollections(): Promise<CollectionRecord[]> {
  if (hasSupabaseEnv) {
    const supabaseCollections = await getCollectionsFromSupabase();
    if (supabaseCollections.length > 0) {
      return supabaseCollections;
    }
  }

  if (!firestore) {
    // Fallback to registry if Firebase is not configured
    return collectionRegistry
      .filter((entry) => entry.enabled)
      .map((entry) => ({
        id: entry.id,
        slug: entry.slug,
        name: entry.name,
        displayName: entry.name,
        description: entry.description,
        longDescription: entry.longDescription,
        heroEyebrow: entry.heroEyebrow,
        culture: entry.culture,
        periodLabel: entry.periodLabel,
        sourceUrl: entry.sourceUrl,
        heroImage: '',
        thumbnailImage: '',
        itemCount: 0,
        filterableMaterials: [],
        estimatedWorth: 0,
        sortOrder: entry.order,
        status: 'active',
        enabled: entry.enabled,
        lastSyncedAt: null,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  const db = getFirestoreOrThrow();
  const collectionRef = collection(db, 'collections');
  const snapshot = await getDocs(query(collectionRef, where('enabled', '==', true)));

  return snapshot.docs
    .map((docSnapshot) => mapCollectionSnapshot(docSnapshot.data()))
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

export async function getCollectionBySlug(slug: string): Promise<CollectionRecord | null> {
  if (hasSupabaseEnv) {
    const supabaseCollection = await getCollectionBySlugFromSupabase(slug);
    if (supabaseCollection) {
      return supabaseCollection;
    }
  }

  if (!firestore) {
    const entry = collectionRegistry.find((e) => e.slug === slug);
    if (!entry || !entry.enabled) return null;
    return {
      id: entry.id,
      slug: entry.slug,
      name: entry.name,
      displayName: entry.name,
      description: entry.description,
      longDescription: entry.longDescription,
      heroEyebrow: entry.heroEyebrow,
      culture: entry.culture,
      periodLabel: entry.periodLabel,
      sourceUrl: entry.sourceUrl,
      heroImage: '',
      thumbnailImage: '',
      itemCount: 0,
      filterableMaterials: [],
      estimatedWorth: 0,
      sortOrder: entry.order,
      status: 'active',
      enabled: entry.enabled,
      lastSyncedAt: null,
    };
  }

  const db = getFirestoreOrThrow();

  // Try direct doc lookup first (slug is used as doc ID)
  const directDoc = await getDoc(doc(db, 'collections', slug));
  if (directDoc.exists() && directDoc.data().enabled) {
    return mapCollectionSnapshot(directDoc.data());
  }

  // Fallback: query by slug field
  const snapshot = await getDocs(
    query(collection(db, 'collections'), where('slug', '==', slug), where('enabled', '==', true)),
  );

  const first = snapshot.docs[0];
  return first ? mapCollectionSnapshot(first.data()) : null;
}
