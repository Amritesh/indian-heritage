import { normalizeArchiveItem, normalizeArchivePrivateItemProfile } from '@/backend-support/mappers/normalizeArchiveItem';
import { type ArchiveCollectionRow, type ArchiveItemRow, type ArchivePrivateItemProfileRow } from '@/backend-support/schemas/archive';
import { MediaRecord } from '@/entities/media/model/types';
import { ItemRecord } from '@/entities/item/model/types';
import { scoreSearchResults } from '@/shared/lib/search';
import { supabaseMaybeSingle, supabaseSelect } from '@/shared/services/supabase';

const ITEM_SELECT =
  'id,canonical_id,collection_id,domain_id,conceptual_item_id,item_type,title,subtitle,description,short_description,era_label,date_start,date_end,display_date,country_code,primary_image_path,primary_image_alt,attributes,sort_title,sort_year_start,sort_year_end,review_status,visibility,source_page_number,source_page_label,source_batch,source_reference';

const COLLECTION_SELECT = 'id,slug,title';

type ArchiveCollectionLite = Pick<ArchiveCollectionRow, 'id' | 'slug' | 'title'>;
type ArchiveMediaAssetRow = {
  target_id: string;
  storage_path: string;
  public_url: string | null;
  asset_role: string;
  alt_text: string | null;
  caption: string | null;
  sort_order: number;
};
type ArchiveNumismaticItemProfileRow = {
  item_id: string;
  estimated_public_price_min: number | null;
  estimated_public_price_max: number | null;
};
type ArchiveEntityAliasRow = {
  entity_id: string;
  normalized_alias: string;
};
type ArchiveEntityRow = {
  id: string;
  preferred_label: string;
};
type ArchiveRecordEntityRow = {
  record_id: string;
  record_kind: string;
};
type ArchiveTagRow = {
  id: string;
  label: string;
  normalized_label: string;
};
type ArchiveRecordTagRow = {
  record_id: string;
};

function normalizeTerm(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

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

function chunkValues<T>(values: T[], size = 150) {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

async function getMediaMap(itemIds: string[]) {
  const ids = Array.from(new Set(itemIds.filter(Boolean)));
  const rows: ArchiveMediaAssetRow[] = [];

  for (const chunk of chunkValues(ids)) {
    const chunkRows = await supabaseSelect<ArchiveMediaAssetRow>('media_assets', {
      select: 'target_id,storage_path,public_url,asset_role,alt_text,caption,sort_order',
      target_kind: 'eq.item',
      target_id: `in.(${chunk.join(',')})`,
      order: 'sort_order.asc',
    });
    rows.push(...chunkRows);
  }

  const mediaMap = new Map<string, MediaRecord[]>();
  rows.forEach((row) => {
    const media: MediaRecord = {
      gsUrl: row.storage_path.startsWith('gs://') ? row.storage_path : '',
      storagePath: row.storage_path,
      downloadUrl: row.public_url ?? row.storage_path,
      alt: row.alt_text ?? '',
      caption: row.caption ?? undefined,
    };
    const existing = mediaMap.get(row.target_id) ?? [];
    existing.push(media);
    mediaMap.set(row.target_id, existing);
  });

  return mediaMap;
}

async function getNumismaticProfileMap(itemIds: string[]) {
  const ids = Array.from(new Set(itemIds.filter(Boolean)));
  const rows: ArchiveNumismaticItemProfileRow[] = [];

  for (const chunk of chunkValues(ids)) {
    const chunkRows = await supabaseSelect<ArchiveNumismaticItemProfileRow>('numismatic_item_profiles', {
      select: 'item_id,estimated_public_price_min,estimated_public_price_max',
      item_id: `in.(${chunk.join(',')})`,
    });
    rows.push(...chunkRows);
  }

  return new Map(rows.map((row) => [row.item_id, row]));
}

function normalizeItems(
  rows: ArchiveItemRow[],
  collectionMap: Map<string, ArchiveCollectionLite>,
  mediaMap: Map<string, MediaRecord[]>,
  numismaticProfileMap: Map<string, ArchiveNumismaticItemProfileRow>,
) {
  return rows.map((row) =>
    normalizeArchiveItem(row, {
      collectionSlug: collectionMap.get(row.collection_id)?.slug ?? '',
      collectionName: collectionMap.get(row.collection_id)?.title ?? '',
      media: mediaMap.get(row.id) ?? [],
      numismaticProfile: numismaticProfileMap.get(row.id) ?? null,
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
      order: 'sort_year_start.asc.nullslast,sort_title.asc',
    }),
    getCollectionLiteById(collectionId),
  ]);

  const collectionMap = new Map<string, ArchiveCollectionLite>();
  if (collectionLite) {
    collectionMap.set(collectionLite.id, collectionLite);
  }

  const [mediaMap, numismaticProfileMap] = await Promise.all([
    getMediaMap(rows.map((row) => row.id)),
    getNumismaticProfileMap(rows.map((row) => row.id)),
  ]);
  return normalizeItems(rows, collectionMap, mediaMap, numismaticProfileMap);
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
    media: await getMediaMap([row.id]).then((mediaMap) => mediaMap.get(row.id) ?? []),
    numismaticProfile: await getNumismaticProfileMap([row.id]).then((profileMap) => profileMap.get(row.id) ?? null),
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

  let relatedIds = relationRows.map((row) => row.related_id).filter(Boolean);
  let reasonsById = new Map(relationRows.map((row) => [row.related_id, row.reason]));

  if (relatedIds.length === 0) {
    const sourceItem = await supabaseMaybeSingle<ArchiveItemRow>('items', {
      select: ITEM_SELECT,
      id: `eq.${itemId}`,
      limit: 1,
    });

    if (!sourceItem) return [];

    const fallbackRows = await supabaseSelect<ArchiveItemRow>('items', {
      select: ITEM_SELECT,
      ...(sourceItem.conceptual_item_id
        ? { conceptual_item_id: `eq.${sourceItem.conceptual_item_id}` }
        : { collection_id: `eq.${sourceItem.collection_id}` }),
      id: `neq.${itemId}`,
      review_status: 'eq.published',
      visibility: 'eq.public',
      order: 'sort_year_start.asc.nullslast,sort_title.asc',
      limit: 6,
    });

    relatedIds = fallbackRows.map((row) => row.id);
    reasonsById = new Map(
      fallbackRows.map((row) => [
        row.id,
        sourceItem.conceptual_item_id && row.conceptual_item_id === sourceItem.conceptual_item_id
          ? 'Same issue/type'
          : 'Same collection',
      ]),
    );
  }

  if (relatedIds.length === 0) return [];

  const rows = await supabaseSelect<ArchiveItemRow>('items', {
    select: ITEM_SELECT,
    id: `in.(${Array.from(new Set(relatedIds)).join(',')})`,
    review_status: 'eq.published',
    visibility: 'eq.public',
  });

  const collectionMap = await getCollectionLiteMap(rows.map((row) => row.collection_id));
  const [mediaMap, numismaticProfileMap] = await Promise.all([
    getMediaMap(rows.map((row) => row.id)),
    getNumismaticProfileMap(rows.map((row) => row.id)),
  ]);
  const itemsById = new Map(normalizeItems(rows, collectionMap, mediaMap, numismaticProfileMap).map((item) => [item.id, item]));

  return relatedIds
    .flatMap((relatedId) => {
      const item = itemsById.get(relatedId);
      if (!item) return [];
      return [{
        ...item,
        relatedReasons: [reasonsById.get(relatedId) ?? 'Related item'],
      }];
    })
}

async function getItemsByIds(itemIds: string[], collectionId?: string | null) {
  const ids = Array.from(new Set(itemIds.filter(Boolean)));
  const rows: ArchiveItemRow[] = [];

  for (const chunk of chunkValues(ids)) {
    const chunkRows = await supabaseSelect<ArchiveItemRow>('items', {
      select: ITEM_SELECT,
      id: `in.(${chunk.join(',')})`,
      ...(collectionId ? { collection_id: `eq.${collectionId}` } : {}),
      review_status: 'eq.published',
      visibility: 'eq.public',
    });
    rows.push(...chunkRows);
  }

  return rows;
}

async function resolveAliasMatchedItemIds(term: string, collectionId?: string | null) {
  const normalizedTerm = normalizeTerm(term);
  if (!normalizedTerm) return new Set<string>();

  const aliasRows = await supabaseSelect<ArchiveEntityAliasRow>('entity_aliases', {
    select: 'entity_id,normalized_alias',
    normalized_alias: `ilike.*${normalizedTerm.replace(/\s+/g, '*')}*`,
  });
  const entityRows = await supabaseSelect<ArchiveEntityRow>('entities', {
    select: 'id,preferred_label',
    preferred_label: `ilike.*${term.trim()}*`,
  });

  const entityIds = Array.from(new Set([
    ...aliasRows.map((row) => row.entity_id),
    ...entityRows.map((row) => row.id),
  ]));
  if (entityIds.length === 0) return new Set<string>();

  const conceptualIds = new Set<string>();
  const directItemIds = new Set<string>();
  for (const chunk of chunkValues(entityIds)) {
    const rows = await supabaseSelect<ArchiveRecordEntityRow>('record_entities', {
      select: 'record_id,record_kind',
      entity_id: `in.(${chunk.join(',')})`,
    });
    rows.forEach((row) => {
      if (row.record_kind === 'conceptual_item') conceptualIds.add(row.record_id);
      if (row.record_kind === 'item') directItemIds.add(row.record_id);
    });
  }

  const matchedItemIds = new Set(directItemIds);
  if (conceptualIds.size > 0) {
    const items = await supabaseSelect<Pick<ArchiveItemRow, 'id'>>('items', {
      select: 'id',
      conceptual_item_id: `in.(${Array.from(conceptualIds).join(',')})`,
      ...(collectionId ? { collection_id: `eq.${collectionId}` } : {}),
      review_status: 'eq.published',
      visibility: 'eq.public',
    });
    items.forEach((row) => matchedItemIds.add(row.id));
  }

  if (!collectionId || matchedItemIds.size === 0) return matchedItemIds;
  const filteredItems = await getItemsByIds(Array.from(matchedItemIds), collectionId);
  return new Set(filteredItems.map((row) => row.id));
}

async function resolveTagMatchedItemIds(term: string, collectionId?: string | null) {
  const normalizedTerm = normalizeTerm(term);
  if (!normalizedTerm) return new Set<string>();

  const tagRows = await supabaseSelect<ArchiveTagRow>('tags', {
    select: 'id,label,normalized_label',
    normalized_label: `ilike.*${normalizedTerm.replace(/\s+/g, '*')}*`,
    is_public: 'eq.true',
  });
  if (tagRows.length === 0) return new Set<string>();

  const itemIds = new Set<string>();
  for (const chunk of chunkValues(tagRows.map((row) => row.id))) {
    const rows = await supabaseSelect<ArchiveRecordTagRow>('record_tags', {
      select: 'record_id',
      record_kind: 'eq.item',
      tag_id: `in.(${chunk.join(',')})`,
    });
    rows.forEach((row) => itemIds.add(row.record_id));
  }

  if (!collectionId || itemIds.size === 0) return itemIds;
  const filteredItems = await getItemsByIds(Array.from(itemIds), collectionId);
  return new Set(filteredItems.map((row) => row.id));
}

export async function searchItemsFromSupabase(term: string, collectionSlug?: string): Promise<ItemRecord[]> {
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
  const [mediaMap, numismaticProfileMap, aliasMatchedIds, tagMatchedIds] = await Promise.all([
    getMediaMap(rows.map((row) => row.id)),
    getNumismaticProfileMap(rows.map((row) => row.id)),
    resolveAliasMatchedItemIds(term, collectionLite?.id ?? null),
    resolveTagMatchedItemIds(term, collectionLite?.id ?? null),
  ]);
  const normalizedItems = normalizeItems(rows, collectionMap, mediaMap, numismaticProfileMap);
  const baseResults = scoreSearchResults(normalizedItems, term);
  const scoreMap = new Map(baseResults.map((item) => [item.id, item.score]));

  const matchedIds = new Set<string>([
    ...baseResults.map((item) => item.id),
    ...aliasMatchedIds,
    ...tagMatchedIds,
  ]);

  return normalizedItems
    .filter((item) => matchedIds.has(item.id))
    .map((item) => {
      const baseScore = scoreMap.get(item.id) ?? 0;
      const aliasBoost = aliasMatchedIds.has(item.id) ? 12 : 0;
      const tagBoost = tagMatchedIds.has(item.id) ? 6 : 0;
      return {
        ...item,
        searchText: item.searchText,
        searchKeywords: item.searchKeywords,
        __score: baseScore + aliasBoost + tagBoost,
      };
    })
    .sort((left, right) => Number(right.__score) - Number(left.__score) || left.title.localeCompare(right.title))
    .map(({ __score, ...item }) => item);
}
