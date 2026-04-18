import { normalizeArchiveCollection } from '@/backend-support/mappers/normalizeArchiveCollection';
import { type ArchiveCollectionRow, type ArchiveItemRow } from '@/backend-support/schemas/archive';
import { CollectionRecord } from '@/entities/collection/model/types';
import { supabaseMaybeSingle, supabaseSelect } from '@/shared/services/supabase';

const COLLECTION_SELECT =
  'id,canonical_id,slug,title,subtitle,description,long_description,era_label,country_code,cover_image_path,status,sort_order,domain_id';

const ITEM_AGGREGATE_SELECT = 'id,collection_id,attributes';

type CollectionAggregateItemRow = Pick<ArchiveItemRow, 'id' | 'collection_id' | 'attributes'>;
type ArchiveNumismaticItemProfileRow = {
  item_id: string;
  estimated_public_price_min: number | null;
  estimated_public_price_max: number | null;
};

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.map((entry) => String(entry).trim()).filter(Boolean) : [];
}

function averageEstimate(row: ArchiveNumismaticItemProfileRow | undefined) {
  if (!row) return 0;
  const min = row.estimated_public_price_min ?? null;
  const max = row.estimated_public_price_max ?? null;
  if (min != null && max != null) return (min + max) / 2;
  return min ?? max ?? 0;
}

function chunkValues<T>(values: T[], size = 150) {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
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

function applyCollectionAggregates(
  collections: CollectionRecord[],
  itemRows: CollectionAggregateItemRow[],
  numismaticProfileMap: Map<string, ArchiveNumismaticItemProfileRow>,
) {
  const materials = new Map<string, Set<string>>();
  const itemCounts = new Map<string, number>();
  const estimatedWorths = new Map<string, number>();

  itemRows.forEach((row) => {
    const bucket = materials.get(row.collection_id) ?? new Set<string>();
    asStringArray(row.attributes?.materials).forEach((material) => bucket.add(material));
    const material = row.attributes?.material;
    if (material != null) {
      bucket.add(String(material));
    }
    materials.set(row.collection_id, bucket);
    itemCounts.set(row.collection_id, (itemCounts.get(row.collection_id) ?? 0) + 1);
    estimatedWorths.set(
      row.collection_id,
      (estimatedWorths.get(row.collection_id) ?? 0) + averageEstimate(numismaticProfileMap.get(row.id)),
    );
  });

  return collections.map((collection) => ({
    ...collection,
    itemCount: itemCounts.get(collection.id) ?? 0,
    filterableMaterials: Array.from(materials.get(collection.id) ?? []).sort((a, b) => a.localeCompare(b)),
    estimatedWorth: Math.round(estimatedWorths.get(collection.id) ?? 0),
  }));
}

export async function getCollectionsFromSupabase(): Promise<CollectionRecord[]> {
  const collectionRows = await supabaseSelect<ArchiveCollectionRow>('collections', {
    select: COLLECTION_SELECT,
    status: 'eq.published',
    order: 'sort_order.asc',
  });
  const normalizedCollections = collectionRows.map(normalizeArchiveCollection);
  const collectionIds = normalizedCollections.map((collection) => collection.id);

  const itemRows = await supabaseSelect<CollectionAggregateItemRow>('items', {
      select: ITEM_AGGREGATE_SELECT,
      ...(collectionIds.length ? { collection_id: `in.(${collectionIds.join(',')})` } : {}),
      review_status: 'eq.published',
      visibility: 'eq.public',
    });
  const numismaticProfileMap = await getNumismaticProfileMap(itemRows.map((row) => row.id));

  return applyCollectionAggregates(normalizedCollections, itemRows, numismaticProfileMap);
}

export async function getCollectionBySlugFromSupabase(slug: string): Promise<CollectionRecord | null> {
  const row = await supabaseMaybeSingle<ArchiveCollectionRow>('collections', {
    select: COLLECTION_SELECT,
    slug: `eq.${slug}`,
    status: 'eq.published',
    limit: 1,
  });

  if (!row) return null;

  const itemRows = await supabaseSelect<CollectionAggregateItemRow>('items', {
      select: ITEM_AGGREGATE_SELECT,
      collection_id: `eq.${row.id}`,
      review_status: 'eq.published',
      visibility: 'eq.public',
    });
  const numismaticProfileMap = await getNumismaticProfileMap(itemRows.map((item) => item.id));

  return applyCollectionAggregates([normalizeArchiveCollection(row)], itemRows, numismaticProfileMap)[0] ?? null;
}
