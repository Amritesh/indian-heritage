import { FirestoreItemInput, firestoreItemSchema } from '../schemas/firestore';
import { RawItem } from '../schemas/source';
import { getCollectionRegistryEntry } from '../../shared/config/collections';
import { buildFirebaseMediaUrl, parseGsUrl } from '../../shared/lib/storage';

function normalizeText(value?: string | null) {
  return String(value ?? '').trim();
}

function uniqueStrings(values: Array<string | undefined | null>) {
  return Array.from(
    new Set(values.map((value) => normalizeText(value)).filter(Boolean)),
  );
}

function buildKeywords(values: string[]) {
  const tokens = values
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .split(/\s+/)
    .filter((value) => value.length >= 2);

  return Array.from(new Set(tokens)).sort();
}

export function normalizeItem(rawItem: RawItem, collectionSlug: string, timestamp: string): FirestoreItemInput {
  const registryEntry = getCollectionRegistryEntry(collectionSlug);
  if (!registryEntry) {
    throw new Error(`Unknown collection slug "${collectionSlug}".`);
  }

  const storage = parseGsUrl(rawItem.image);
  const imageUrl = buildFirebaseMediaUrl(rawItem.image);
  const materials = uniqueStrings(rawItem.materials);
  const notes = uniqueStrings(rawItem.notes);
  const searchFields = [
    normalizeText(rawItem.title),
    normalizeText(rawItem.description),
    normalizeText(rawItem.period),
    normalizeText(rawItem.region),
    normalizeText(rawItem.metadata.ruler_or_issuer),
    normalizeText(rawItem.metadata.denomination),
    normalizeText(rawItem.metadata.series_or_catalog),
    normalizeText(rawItem.metadata.mint_or_place),
    ...materials,
    ...uniqueStrings(rawItem.display_labels),
    ...notes,
  ];

  const subtitle = normalizeText(rawItem.metadata.ruler_or_issuer)
    || normalizeText(rawItem.metadata.denomination)
    || registryEntry.culture;
  const shortDescription =
    normalizeText(rawItem.description).split('. ').slice(0, 2).join('. ').trim()
    || normalizeText(rawItem.description);
  const tags = uniqueStrings([
    rawItem.metadata.material,
    rawItem.metadata.denomination,
    rawItem.metadata.ruler_or_issuer,
    rawItem.metadata.mint_or_place,
    registryEntry.culture,
  ]);

  const primaryMedia = storage
    ? {
        gsUrl: rawItem.image,
        storagePath: storage.path,
        downloadUrl: imageUrl,
        alt: rawItem.title,
        caption: rawItem.description,
      }
    : null;

  return firestoreItemSchema.parse({
    id: `${collectionSlug}-${rawItem.id}`,
    collectionId: registryEntry.id,
    collectionSlug,
    collectionName: registryEntry.name,
    title: rawItem.title,
    subtitle,
    period: rawItem.period || rawItem.metadata.year_or_period || '',
    dateText: rawItem.metadata.year_or_period || rawItem.period || '',
    culture: registryEntry.culture,
    location: rawItem.region || rawItem.metadata.mint_or_place || '',
    description: rawItem.description,
    shortDescription,
    imageUrl,
    imageAlt: rawItem.title,
    primaryMedia,
    gallery: primaryMedia ? [primaryMedia] : [],
    materials,
    tags,
    notes,
    searchText: searchFields.join(' ').toLowerCase(),
    searchKeywords: buildKeywords(searchFields),
    metadata: {
      type: rawItem.metadata.type,
      denomination: rawItem.metadata.denomination,
      rulerOrIssuer: rawItem.metadata.ruler_or_issuer,
      mintOrPlace: rawItem.metadata.mint_or_place,
      seriesOrCatalog: rawItem.metadata.series_or_catalog,
      weightEstimate: rawItem.metadata.weight_estimate,
      condition: rawItem.metadata.condition,
      estimatedPriceInr: rawItem.metadata.estimated_price_inr,
      confidence: rawItem.metadata.confidence,
    },
    pageNumber: rawItem.page,
    sortTitle: rawItem.title.toLowerCase(),
    published: true,
    sourceUrl: registryEntry.sourceUrl,
    sourceRawRef: `${collectionSlug}:${rawItem.id}`,
    importedAt: timestamp,
    updatedAt: timestamp,
  });
}
