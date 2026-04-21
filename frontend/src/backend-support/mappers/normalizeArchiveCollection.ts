import { ArchiveCollectionRow, archiveCollectionSchema } from '../schemas/archive';
import { CollectionRecord } from '@/entities/collection/model/types';
import { buildFirebaseMediaUrl } from '@/shared/lib/storage';

export function normalizeArchiveCollection(input: ArchiveCollectionRow): CollectionRecord {
  const row = archiveCollectionSchema.parse(input);
  const imageUrl = row.cover_image_path?.startsWith('gs://')
    ? buildFirebaseMediaUrl(row.cover_image_path)
    : row.cover_image_path ?? '';

  return {
    id: row.id,
    canonicalId: row.canonical_id,
    slug: row.slug,
    name: row.title,
    displayName: row.title,
    description: row.description,
    longDescription: row.long_description ?? row.description,
    heroEyebrow: row.era_label ?? '',
    culture: row.country_code ?? 'IN',
    periodLabel: row.era_label ?? '',
    sourceUrl: '',
    heroImage: imageUrl,
    thumbnailImage: imageUrl,
    itemCount: 0,
    filterableMaterials: [],
    estimatedWorth: 0,
    sortOrder: row.sort_order,
    status: row.status,
    enabled: row.status !== 'archived',
    lastSyncedAt: null,
    domainId: row.domain_id ?? '',
    domainSlug: '',
    domainName: '',
  };
}
