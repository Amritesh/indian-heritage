import { archiveCategorySchema, type ArchiveCategoryRow } from '@/backend-support/schemas/archive';
import { CategoryRecord } from '@/entities/category/model/types';
import { supabaseSelect } from '@/shared/services/supabase';

function normalizeCategory(row: ArchiveCategoryRow): CategoryRecord {
  const parsed = archiveCategorySchema.parse(row);
  return {
    id: parsed.id,
    canonicalId: parsed.canonical_id,
    slug: parsed.slug,
    title: parsed.title,
    summary: parsed.summary ?? '',
    heroImagePath: parsed.hero_image_path ?? null,
    itemCount: parsed.item_count,
    status: parsed.status,
    pageType: parsed.page_type,
    sourceKind: parsed.source_kind,
  };
}

export async function getCategories(): Promise<CategoryRecord[]> {
  const rows = await supabaseSelect<ArchiveCategoryRow>('category_pages', {
    select: 'id,canonical_id,slug,title,summary,hero_image_path,item_count,status,page_type,source_kind',
    status: 'eq.published',
    order: 'item_count.desc',
  });
  return rows.map(normalizeCategory);
}

export async function getCategoryBySlug(slug: string): Promise<CategoryRecord | null> {
  const rows = await supabaseSelect<ArchiveCategoryRow>('category_pages', {
    select: 'id,canonical_id,slug,title,summary,hero_image_path,item_count,status,page_type,source_kind',
    slug: `eq.${slug}`,
    limit: 1,
  });
  return rows[0] ? normalizeCategory(rows[0]) : null;
}
