import { CollectionRecord } from '@/entities/collection/model/types';
import { hasSupabaseEnv } from '@/shared/config/supabase';
import { getCollectionBySlugFromSupabase, getCollectionsFromSupabase } from './collectionService.supabase';

function assertSupabaseArchiveConfigured() {
  if (!hasSupabaseEnv) {
    throw new Error('Supabase archive configuration is required for public metadata reads.');
  }
}

export async function getCollections(): Promise<CollectionRecord[]> {
  assertSupabaseArchiveConfigured();
  return getCollectionsFromSupabase();
}

export async function getCollectionBySlug(slug: string): Promise<CollectionRecord | null> {
  assertSupabaseArchiveConfigured();
  return getCollectionBySlugFromSupabase(slug);
}
