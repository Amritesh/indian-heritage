import { archiveDomainSchema, type ArchiveDomainRow } from '@/backend-support/schemas/archive';
import { DomainRecord } from '@/entities/domain/model/types';
import { supabaseSelect } from '@/shared/services/supabase';

function normalizeDomain(row: ArchiveDomainRow): DomainRecord {
  const parsed = archiveDomainSchema.parse(row);
  return {
    id: parsed.id,
    canonicalId: parsed.canonical_id,
    slug: parsed.slug,
    name: parsed.name,
    description: parsed.description,
    heroImagePath: parsed.hero_image_path ?? null,
    sortOrder: parsed.sort_order,
  };
}

export async function getDomains(): Promise<DomainRecord[]> {
  const rows = await supabaseSelect<ArchiveDomainRow>('domains', {
    select: 'id,canonical_id,slug,name,description,sort_order,hero_image_path',
    order: 'sort_order.asc',
  });
  return rows.map(normalizeDomain);
}

export async function getDomainBySlug(slug: string): Promise<DomainRecord | null> {
  const rows = await supabaseSelect<ArchiveDomainRow>('domains', {
    select: 'id,canonical_id,slug,name,description,sort_order,hero_image_path',
    slug: `eq.${slug}`,
    limit: 1,
  });
  return rows[0] ? normalizeDomain(rows[0]) : null;
}
