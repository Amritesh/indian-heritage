import { normalizeArchiveCollection } from '@/backend-support/mappers/normalizeArchiveCollection';
import { type ArchiveCollectionRow, type ArchiveItemRow } from '@/backend-support/schemas/archive';
import { CollectionRecord } from '@/entities/collection/model/types';
import { supabaseMaybeSingle, supabaseSelect } from '@/shared/services/supabase';

const COLLECTION_SELECT =
  'id,canonical_id,slug,title,subtitle,description,long_description,era_label,country_code,cover_image_path,status,sort_order,domain_id';

const ITEM_AGGREGATE_SELECT = 'collection_id,attributes';

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.map((entry) => String(entry).trim()).filter(Boolean) : [];
}

function applyCollectionAggregates(
  collections: CollectionRecord[],
  itemRows: Pick<ArchiveItemRow, 'collection_id' | 'attributes'>[],
) {
  const counts = new Map<string, number>();
  const materials = new Map<string, Set<string>>();

  itemRows.forEach((row) => {
    counts.set(row.collection_id, (counts.get(row.collection_id) ?? 0) + 1);
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
    itemCount: counts.get(collection.id) ?? 0,
    filterableMaterials: Array.from(materials.get(collection.id) ?? []).sort((a, b) => a.localeCompare(b)),
  }));
}

export async function getCollectionsFromSupabase(): Promise<CollectionRecord[]> {
  const [collectionRows, itemRows] = await Promise.all([
    supabaseSelect<ArchiveCollectionRow>('collections', {
      select: COLLECTION_SELECT,
      status: 'eq.published',
      order: 'sort_order.asc',
    }),
    supabaseSelect<Pick<ArchiveItemRow, 'collection_id' | 'attributes'>>('items', {
      select: ITEM_AGGREGATE_SELECT,
      review_status: 'eq.published',
      visibility: 'eq.public',
    }),
  ]);

  return applyCollectionAggregates(collectionRows.map(normalizeArchiveCollection), itemRows);
}

export async function getCollectionBySlugFromSupabase(slug: string): Promise<CollectionRecord | null> {
  const row = await supabaseMaybeSingle<ArchiveCollectionRow>('collections', {
    select: COLLECTION_SELECT,
    slug: `eq.${slug}`,
    status: 'eq.published',
    limit: 1,
  });

  if (!row) return null;

  const itemRows = await supabaseSelect<Pick<ArchiveItemRow, 'collection_id' | 'attributes'>>('items', {
    select: ITEM_AGGREGATE_SELECT,
    collection_id: `eq.${row.id}`,
    review_status: 'eq.published',
    visibility: 'eq.public',
  });

  return applyCollectionAggregates([normalizeArchiveCollection(row)], itemRows)[0] ?? null;
}
