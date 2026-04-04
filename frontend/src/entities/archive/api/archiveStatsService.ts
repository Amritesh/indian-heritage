import { hasSupabaseEnv } from '@/shared/config/supabase';
import { formatCurrency } from '@/shared/lib/formatters';
import { supabaseCount, supabaseSelect } from '@/shared/services/supabase';

type ArchiveItemLiteRow = {
  id: string;
  collection_id: string;
  title: string;
  display_date: string | null;
};

type ArchiveCollectionLiteRow = {
  id: string;
  title: string;
};

type ArchiveMaterialRow = {
  attributes: Record<string, unknown>;
};

type ArchiveNumismaticProfileRow = {
  item_id: string;
  estimated_public_price_min: number | null;
  estimated_public_price_max: number | null;
};

type ArchiveRecentItem = {
  id: string;
  title: string;
  collectionName: string;
  period: string;
};

export type ArchivePublicStats = {
  items: number;
  collections: number;
  materials: number;
  totalWorth: number;
};

export type ArchiveAdminStats = {
  totalItems: number;
  publishedItems: number;
  totalCollections: number;
  totalWorth: number;
  recentItems: ArchiveRecentItem[];
};

function chunkValues<T>(values: T[], size = 150) {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function extractMaterial(attributes: Record<string, unknown>) {
  const direct = attributes.material;
  if (typeof direct === 'string' && direct.trim()) return direct.trim();

  const materials = attributes.materials;
  if (Array.isArray(materials)) {
    const first = materials.find((entry) => typeof entry === 'string' && entry.trim());
    if (typeof first === 'string') return first.trim();
  }

  return '';
}

function averageEstimate(row: ArchiveNumismaticProfileRow) {
  const min = row.estimated_public_price_min ?? null;
  const max = row.estimated_public_price_max ?? null;
  if (min != null && max != null) return (min + max) / 2;
  return min ?? max ?? 0;
}

async function getPublishedItemIds() {
  const rows = await supabaseSelect<Pick<ArchiveItemLiteRow, 'id'>>('items', {
    select: 'id',
    review_status: 'eq.published',
    visibility: 'eq.public',
  });
  return rows.map((row) => row.id);
}

async function getPublishedWorth(itemIds: string[]) {
  if (itemIds.length === 0) return 0;

  const profiles: ArchiveNumismaticProfileRow[] = [];
  for (const chunk of chunkValues(itemIds)) {
    const rows = await supabaseSelect<ArchiveNumismaticProfileRow>('numismatic_item_profiles', {
      select: 'item_id,estimated_public_price_min,estimated_public_price_max',
      item_id: `in.(${chunk.join(',')})`,
    });
    profiles.push(...rows);
  }

  return profiles.reduce((sum, row) => sum + averageEstimate(row), 0);
}

export async function getArchivePublicStatsFromSupabase(): Promise<ArchivePublicStats | null> {
  if (!hasSupabaseEnv) return null;

  const [items, collections, materialRows, publishedItemIds] = await Promise.all([
    supabaseCount('items', {
      select: 'id',
      review_status: 'eq.published',
      visibility: 'eq.public',
    }),
    supabaseCount('collections', { select: 'id' }),
    supabaseSelect<ArchiveMaterialRow>('items', {
      select: 'attributes',
      review_status: 'eq.published',
      visibility: 'eq.public',
    }),
    getPublishedItemIds(),
  ]);

  const materials = new Set(
    materialRows
      .map((row) => extractMaterial(row.attributes))
      .filter(Boolean),
  );

  return {
    items,
    collections,
    materials: materials.size,
    totalWorth: await getPublishedWorth(publishedItemIds),
  };
}

export async function getArchiveAdminStatsFromSupabase(): Promise<ArchiveAdminStats | null> {
  if (!hasSupabaseEnv) return null;

  const [totalItems, publishedItems, totalCollections, recentRows, collections] = await Promise.all([
    supabaseCount('items', { select: 'id' }),
    supabaseCount('items', {
      select: 'id',
      review_status: 'eq.published',
      visibility: 'eq.public',
    }),
    supabaseCount('collections', { select: 'id' }),
    supabaseSelect<ArchiveItemLiteRow>('items', {
      select: 'id,title,display_date,collection_id',
      order: 'id.desc',
      limit: 5,
    }),
    supabaseSelect<ArchiveCollectionLiteRow>('collections', {
      select: 'id,title',
    }),
  ]);

  const collectionMap = new Map(collections.map((row) => [row.id, row.title]));
  const publishedItemIds = await getPublishedItemIds();
  const totalWorth = await getPublishedWorth(publishedItemIds);

  return {
    totalItems,
    publishedItems,
    totalCollections,
    totalWorth,
    recentItems: recentRows.map((row) => ({
      id: row.id,
      title: row.title,
      collectionName: collectionMap.get(row.collection_id) ?? 'Unknown collection',
      period: row.display_date ?? '',
    })),
  };
}

export function formatArchiveWorth(value: number | null | undefined) {
  return value ? formatCurrency(value) : '—';
}
