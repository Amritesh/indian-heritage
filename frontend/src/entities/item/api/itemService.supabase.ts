import { normalizeArchiveItem, normalizeArchivePrivateItemProfile } from '@/backend-support/mappers/normalizeArchiveItem';
import { type ArchiveCollectionRow, type ArchiveItemRow, type ArchivePrivateItemProfileRow } from '@/backend-support/schemas/archive';
import { ItemRecord } from '@/entities/item/model/types';
import { supabaseMaybeSingle, supabaseSelect } from '@/shared/services/supabase';

const ITEM_SELECT =
  'id,canonical_id,collection_id,domain_id,conceptual_item_id,item_type,title,subtitle,description,short_description,era_label,date_start,date_end,display_date,country_code,primary_image_path,primary_image_alt,attributes,sort_title,sort_year_start,sort_year_end,review_status,visibility,source_page_number,source_page_label,source_batch,source_reference';

const COLLECTION_SELECT = 'id,slug,title';

type ArchiveCollectionLite = Pick<ArchiveCollectionRow, 'id' | 'slug' | 'title'>;

async function getCollectionLiteById(collectionId: string): Promise<ArchiveCollectionLite | null> {
  return supabaseMaybeSingle<ArchiveCollectionLite>('collections', {
    select: COLLECTION_SELECT,
    id: `eq.${collectionId}`,
    status: 'eq.published',
    limit: 1,
  });
}

async function getCollectionLiteBySlug(collectionSlug: string): Promise<ArchiveCollectionLite | null> {
  return supabaseMaybeSingle<ArchiveCollectionLite>('collections', {
    select: COLLECTION_SELECT,
    slug: `eq.${collectionSlug}`,
    status: 'eq.published',
    limit: 1,
  });
}

async function getCollectionLiteMap(collectionIds: string[]) {
  if (collectionIds.length === 0) return new Map<string, ArchiveCollectionLite>();
  const ids = Array.from(new Set(collectionIds.filter(Boolean)));
  if (ids.length === 0) return new Map<string, ArchiveCollectionLite>();

  const rows = await supabaseSelect<ArchiveCollectionLite>('collections', {
    select: COLLECTION_SELECT,
    id: `in.(${ids.join(',')})`,
    status: 'eq.published',
  });
  return new Map(rows.map((row) => [row.id, row]));
}

function normalizeItems(rows: ArchiveItemRow[], collectionMap: Map<string, ArchiveCollectionLite>) {
  return rows.map((row) =>
    normalizeArchiveItem(row, {
      collectionSlug: collectionMap.get(row.collection_id)?.slug ?? '',
      collectionName: collectionMap.get(row.collection_id)?.title ?? '',
    }),
  );
}

export async function getCollectionItemsFromSupabase(collectionId: string): Promise<ItemRecord[]> {
  const [rows, collectionLite] = await Promise.all([
    supabaseSelect<ArchiveItemRow>('items', {
      select: ITEM_SELECT,
      collection_id: `eq.${collectionId}`,
      review_status: 'eq.published',
      visibility: 'eq.public',
      order: 'sort_title.asc',
    }),
    getCollectionLiteById(collectionId),
  ]);

  const collectionMap = new Map<string, ArchiveCollectionLite>();
  if (collectionLite) {
    collectionMap.set(collectionLite.id, collectionLite);
  }

  return normalizeItems(rows, collectionMap);
}

export async function getCollectionItemsBySlugFromSupabase(collectionSlug: string): Promise<ItemRecord[]> {
  const collectionLite = await getCollectionLiteBySlug(collectionSlug);
  if (!collectionLite) return [];
  return getCollectionItemsFromSupabase(collectionLite.id);
}

export async function getItemByIdFromSupabase(
  itemId: string,
  options?: { includePrivate?: boolean },
): Promise<ItemRecord | null> {
  const row = await supabaseMaybeSingle<ArchiveItemRow>('items', {
    select: ITEM_SELECT,
    id: `eq.${itemId}`,
    limit: 1,
  });

  if (!row) return null;

  const [collectionLite, privateProfile] = await Promise.all([
    getCollectionLiteById(row.collection_id),
    options?.includePrivate
      ? supabaseMaybeSingle<ArchivePrivateItemProfileRow>('item_private_profiles', {
          select:
            'id,item_id,owner_user_id,year_bought,purchase_price,purchase_currency,estimated_value_min,estimated_value_max,estimated_value_avg,acquisition_source,acquisition_date,internal_notes,private_tags,private_attributes',
          item_id: `eq.${row.id}`,
          limit: 1,
        })
      : Promise.resolve(null),
  ]);

  const normalized = normalizeArchiveItem(row, {
    collectionSlug: collectionLite?.slug ?? '',
    collectionName: collectionLite?.title ?? '',
  });

  if (!options?.includePrivate || !privateProfile) {
    return normalized;
  }

  return {
    ...normalized,
    privateProfile: normalizeArchivePrivateItemProfile(privateProfile),
  };
}

export async function getRelatedItemsFromSupabase(itemId: string): Promise<ItemRecord[]> {
  const relationRows = await supabaseSelect<{
    related_id: string;
    reason: string;
    score: number;
  }>('record_relations', {
    select: 'related_id,reason,score',
    source_kind: 'eq.item',
    source_id: `eq.${itemId}`,
    related_kind: 'eq.item',
    order: 'score.desc',
    limit: 6,
  });

  const relatedIds = relationRows.map((row) => row.related_id).filter(Boolean);
  if (relatedIds.length === 0) return [];

  const rows = await supabaseSelect<ArchiveItemRow>('items', {
    select: ITEM_SELECT,
    id: `in.(${Array.from(new Set(relatedIds)).join(',')})`,
    review_status: 'eq.published',
    visibility: 'eq.public',
  });

  const collectionMap = await getCollectionLiteMap(rows.map((row) => row.collection_id));
  const itemsById = new Map(normalizeItems(rows, collectionMap).map((item) => [item.id, item]));

  return relationRows
    .map((relation) => {
      const item = itemsById.get(relation.related_id);
      if (!item) return null;
      return {
        ...item,
        relatedReasons: [relation.reason],
      };
    })
    .filter((item): item is ItemRecord => item != null);
}

export async function searchItemsFromSupabase(collectionSlug?: string): Promise<ItemRecord[]> {
  const collectionLite = collectionSlug ? await getCollectionLiteBySlug(collectionSlug) : null;
  const rows = await supabaseSelect<ArchiveItemRow>('items', {
    select: ITEM_SELECT,
    ...(collectionLite ? { collection_id: `eq.${collectionLite.id}` } : {}),
    review_status: 'eq.published',
    visibility: 'eq.public',
    order: 'sort_title.asc',
  });

  const collectionMap = collectionLite
    ? new Map<string, ArchiveCollectionLite>([[collectionLite.id, collectionLite]])
    : await getCollectionLiteMap(rows.map((row) => row.collection_id));

  return normalizeItems(rows, collectionMap);
}
