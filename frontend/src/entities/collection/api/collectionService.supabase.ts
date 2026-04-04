import { normalizeArchiveCollection } from '@/backend-support/mappers/normalizeArchiveCollection';
import { type ArchiveCollectionRow, type ArchiveItemRow } from '@/backend-support/schemas/archive';
import { CollectionRecord } from '@/entities/collection/model/types';
import { supabaseCount, supabaseMaybeSingle, supabaseSelect } from '@/shared/services/supabase';

const COLLECTION_SELECT =
  'id,canonical_id,slug,title,subtitle,description,long_description,era_label,country_code,cover_image_path,status,sort_order,domain_id';

const ITEM_AGGREGATE_SELECT = 'collection_id,attributes';

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.map((entry) => String(entry).trim()).filter(Boolean) : [];
}

function applyCollectionAggregates(
  collections: CollectionRecord[],
  itemCounts: Map<string, number>,
  itemRows: Pick<ArchiveItemRow, 'collection_id' | 'attributes'>[],
) {
  const materials = new Map<string, Set<string>>();

  itemRows.forEach((row) => {
    const bucket = materials.get(row.collection_id) ?? new Set<string>();
    asStringArray(row.attributes?.materials).forEach((material) => bucket.add(material));
    const material = row.attributes?.material;
    if (material != null) {
      bucket.add(String(material));
    }
    materials.set(row.collection_id, bucket);
  });

  return collections.map((collection) => ({
    ...collection,
    itemCount: itemCounts.get(collection.id) ?? 0,
    filterableMaterials: Array.from(materials.get(collection.id) ?? []).sort((a, b) => a.localeCompare(b)),
  }));
}

async function buildCollectionItemCounts(collectionIds: string[]) {
  const counts = await Promise.all(
    collectionIds.map(async (collectionId) => [
      collectionId,
      await supabaseCount('items', {
        select: 'id',
        collection_id: `eq.${collectionId}`,
        review_status: 'eq.published',
        visibility: 'eq.public',
      }),
    ] as const),
  );

  return new Map<string, number>(counts);
}

export async function getCollectionsFromSupabase(): Promise<CollectionRecord[]> {
  const collectionRows = await supabaseSelect<ArchiveCollectionRow>('collections', {
    select: COLLECTION_SELECT,
    status: 'eq.published',
    order: 'sort_order.asc',
  });
  const normalizedCollections = collectionRows.map(normalizeArchiveCollection);
  const collectionIds = normalizedCollections.map((collection) => collection.id);

  const [itemCounts, itemRows] = await Promise.all([
    buildCollectionItemCounts(collectionIds),
    supabaseSelect<Pick<ArchiveItemRow, 'collection_id' | 'attributes'>>('items', {
      select: ITEM_AGGREGATE_SELECT,
      ...(collectionIds.length ? { collection_id: `in.(${collectionIds.join(',')})` } : {}),
      review_status: 'eq.published',
      visibility: 'eq.public',
    }),
  ]);

  return applyCollectionAggregates(normalizedCollections, itemCounts, itemRows);
}

export async function getCollectionBySlugFromSupabase(slug: string): Promise<CollectionRecord | null> {
  const row = await supabaseMaybeSingle<ArchiveCollectionRow>('collections', {
    select: COLLECTION_SELECT,
    slug: `eq.${slug}`,
    status: 'eq.published',
    limit: 1,
  });

  if (!row) return null;

  const [itemCount, itemRows] = await Promise.all([
    supabaseCount('items', {
      select: 'id',
      collection_id: `eq.${row.id}`,
      review_status: 'eq.published',
      visibility: 'eq.public',
    }),
    supabaseSelect<Pick<ArchiveItemRow, 'collection_id' | 'attributes'>>('items', {
      select: ITEM_AGGREGATE_SELECT,
      collection_id: `eq.${row.id}`,
      review_status: 'eq.published',
      visibility: 'eq.public',
    }),
  ]);

  return applyCollectionAggregates([normalizeArchiveCollection(row)], new Map([[row.id, itemCount]]), itemRows)[0] ?? null;
}
