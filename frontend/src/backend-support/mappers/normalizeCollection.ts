import { firestoreCollectionSchema, FirestoreCollectionInput } from '../schemas/firestore';
import { getCollectionRegistryEntry } from '../../shared/config/collections';

type NormalizeCollectionArgs = {
  slug: string;
  itemCount: number;
  heroImage: string;
  filterableMaterials: string[];
  timestamp: string;
};

export function normalizeCollection({
  slug,
  itemCount,
  heroImage,
  filterableMaterials,
  timestamp,
}: NormalizeCollectionArgs): FirestoreCollectionInput {
  const registryEntry = getCollectionRegistryEntry(slug);
  if (!registryEntry) {
    throw new Error(`No collection registry entry found for "${slug}".`);
  }

  return firestoreCollectionSchema.parse({
    id: registryEntry.id,
    slug: registryEntry.slug,
    name: registryEntry.name,
    displayName: registryEntry.name,
    description: registryEntry.description,
    longDescription: registryEntry.longDescription,
    sourceType: 'cloud-function',
    sourceUrl: registryEntry.sourceUrl,
    heroImage,
    thumbnailImage: heroImage,
    itemCount,
    filterableMaterials,
    status: 'active',
    sortOrder: registryEntry.order,
    heroEyebrow: registryEntry.heroEyebrow,
    periodLabel: registryEntry.periodLabel,
    culture: registryEntry.culture,
    enabled: registryEntry.enabled,
    createdAt: timestamp,
    updatedAt: timestamp,
    lastSyncedAt: timestamp,
  });
}
