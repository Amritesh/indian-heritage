import path from 'node:path';

export type ArchiveSnapshotMedia = {
  gsUrl?: string;
  storagePath?: string;
  downloadUrl?: string;
  alt?: string;
  caption?: string;
  width?: number | null;
  height?: number | null;
};

export type ArchiveSnapshotItem = {
  id: string;
  title?: string;
  subtitle?: string;
  period?: string;
  dateText?: string;
  culture?: string;
  location?: string;
  description?: string;
  shortDescription?: string;
  imageUrl?: string;
  imageAlt?: string;
  primaryMedia?: ArchiveSnapshotMedia | null;
  gallery?: ArchiveSnapshotMedia[];
  materials?: string[];
  tags?: string[];
  publicTags?: string[];
  entityBadges?: string[];
  relatedReasons?: string[];
  notes?: string[];
  pageNumber?: number;
  sortYearStart?: number;
  sortYearEnd?: number | null;
  weightGrams?: number | null;
  importedAt?: string;
  updatedAt?: string;
  metadata?: {
    type?: string;
    denomination?: string;
    rulerOrIssuer?: string;
    mintOrPlace?: string;
    seriesOrCatalog?: string;
    weightEstimate?: string;
    condition?: string;
    confidence?: string;
  };
  sourceUrl?: string;
  sourceRawRef?: string;
  sourcePageLabel?: string | null;
  sourceBatch?: string | null;
  privateProfile?: {
    ownerUserId?: string;
    owner_user_id?: string;
    yearBought?: number | null;
    purchasePrice?: number | null;
    purchaseCurrency?: string | null;
    estimatedValueMin?: number | null;
    estimatedValueMax?: number | null;
    estimatedValueAvg?: number | null;
    acquisitionSource?: string | null;
    acquisitionDate?: string | null;
    internalNotes?: string | null;
    privateTags?: string[];
    privateAttributes?: Record<string, unknown>;
  } | null;
};

export type ArchiveSnapshot = {
  exportedAt: string;
  source: 'firebase-firestore' | 'paired-output';
  collection: {
    id?: string;
    slug: string;
    name?: string;
    displayName?: string;
    description?: string;
    longDescription?: string;
    culture?: string;
    periodLabel?: string;
    heroImage?: string;
    sortOrder?: number;
  };
  items: ArchiveSnapshotItem[];
};

type NormalizePairedOutputOptions = {
  collectionSlug?: string;
  sourcePath?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asString(value: unknown, fallback = '') {
  return value == null ? fallback : String(value).trim() || fallback;
}

function asNullableNumber(value: unknown) {
  if (value == null || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((entry) => asString(entry)).filter(Boolean)
    : [];
}

function titleize(value: string) {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function sourcePageLabelFrom(rawPages: unknown) {
  const pages = Array.isArray(rawPages)
    ? rawPages.map((page) => asNullableNumber(page)).filter((page): page is number => typeof page === 'number')
    : [];

  if (pages.length === 0) return undefined;
  return `page-${pages.join('-')}`;
}

function parseSnapshotMedia(value: unknown): ArchiveSnapshotMedia | null {
  if (!isRecord(value)) return null;
  return {
    gsUrl: asString(value.gsUrl ?? value.gs_url ?? value.url ?? ''),
    storagePath: asString(value.storagePath ?? value.storage_path ?? ''),
    downloadUrl: asString(value.downloadUrl ?? value.download_url ?? ''),
    alt: asString(value.alt ?? value.alt_text ?? ''),
    caption: value.caption == null ? undefined : asString(value.caption),
    width: value.width == null ? null : asNullableNumber(value.width),
    height: value.height == null ? null : asNullableNumber(value.height),
  };
}

function toMedia(value: unknown, fallbackAlt: string): ArchiveSnapshotMedia | null {
  const parsed = parseSnapshotMedia(value);
  if (parsed) return parsed;
  const storagePath = asString(value);
  if (!storagePath) return null;
  return {
    storagePath,
    alt: fallbackAlt,
  };
}

function deriveItemId(item: Record<string, unknown>, index: number) {
  const explicitId = asString(item.id);
  if (explicitId) return explicitId;

  const sourceImage = asString(item.image_path ?? item.imagePath ?? item.imageUrl ?? item.image ?? '');
  if (sourceImage) {
    const baseName = path.basename(sourceImage).replace(/\.[^.]+$/, '');
    if (baseName) return baseName;
  }

  const sourceRef = asString(item.sourceRawRef ?? item.source_raw_ref ?? '');
  if (sourceRef) return sourceRef;

  const pages = sourcePageLabelFrom(item.source_pages ?? item.sourcePages);
  if (pages) return pages;

  return `item-${String(index + 1).padStart(4, '0')}`;
}

function normalizePairedOutputItem(value: unknown, index: number): ArchiveSnapshotItem {
  const item: Record<string, unknown> = isRecord(value) ? value : {};
  const metadata: Record<string, unknown> = isRecord(item.metadata) ? item.metadata : {};
  const sourceImages: Record<string, unknown> = isRecord(item.source_images) ? item.source_images : isRecord(item.sourceImages) ? item.sourceImages : {};
  const titleCandidate = asString(item.title);
  const ruler = asString(metadata.rulerOrIssuer ?? metadata.ruler_or_issuer ?? item.rulerOrIssuer ?? item.ruler_or_issuer);
  const denomination = asString(metadata.denomination ?? item.denomination);
  const title = titleCandidate || (denomination && ruler ? `${denomination} - ${ruler}` : denomination || ruler || `Archive item ${index + 1}`);
  const imageUrl = asString(item.imageUrl ?? item.image_url ?? item.image_path ?? item.imagePath ?? item.image ?? '');
  const pageLabel = asString(item.sourcePageLabel ?? item.source_page_label ?? sourcePageLabelFrom(item.source_pages ?? item.sourcePages));
  const sourceRawRef = asString(
    item.sourceRawRef
      ?? item.source_raw_ref
      ?? item.image_path
      ?? item.imagePath
      ?? imageUrl
      ?? sourceImages.obverse_crop
      ?? sourceImages.reverse_crop
      ?? '',
  );
  const sourceBatch = asString(item.sourceBatch ?? item.source_batch ?? '');
  const period = asString(item.period ?? item.year_or_period ?? item.yearOrPeriod ?? '');
  const dateText = asString(item.dateText ?? item.date_text ?? item.year_or_period ?? item.yearOrPeriod ?? period);
  const location = asString(item.location ?? item.mint_or_place ?? item.mintOrPlace ?? '');
  const material = asString(metadata.material ?? item.material);
  const materials = [
    ...asStringArray(item.materials),
    ...(material ? [material] : []),
  ];
  const notes = asStringArray(item.notes);
  const sourcePages = Array.isArray(item.source_pages)
    ? item.source_pages
    : Array.isArray(item.sourcePages)
      ? item.sourcePages
      : [];
  const gallery = Array.isArray(item.gallery)
    ? item.gallery.map((entry) => parseSnapshotMedia(entry)).filter((entry): entry is ArchiveSnapshotMedia => entry != null)
    : [];

  return {
    id: deriveItemId(item, index),
    title,
    subtitle: asString(item.subtitle) || undefined,
    period: period || undefined,
    dateText: dateText || undefined,
    culture: asString(item.culture) || undefined,
    location: location || undefined,
    description: asString(item.description) || undefined,
    shortDescription: asString(item.shortDescription ?? item.short_description) || undefined,
    imageUrl: imageUrl || undefined,
    imageAlt: asString(item.imageAlt ?? item.image_alt) || undefined,
    primaryMedia: toMedia(item.primaryMedia ?? item.primary_media ?? imageUrl, asString(item.imageAlt ?? title)),
    gallery,
    materials: materials.length > 0 ? materials : undefined,
    tags: asStringArray(item.tags),
    publicTags: asStringArray(item.publicTags),
    entityBadges: asStringArray(item.entityBadges),
    relatedReasons: asStringArray(item.relatedReasons),
    notes: notes.length > 0 ? notes : undefined,
    pageNumber: asNullableNumber(item.pageNumber ?? item.page_number)
      ?? asNullableNumber(sourcePages[0])
      ?? index + 1,
    sortYearStart: asNullableNumber(item.sortYearStart ?? item.sort_year_start) ?? undefined,
    sortYearEnd: asNullableNumber(item.sortYearEnd ?? item.sort_year_end),
    weightGrams: asNullableNumber(item.weightGrams ?? item.weight_grams),
    importedAt: asString(item.importedAt ?? item.imported_at) || undefined,
    updatedAt: asString(item.updatedAt ?? item.updated_at) || undefined,
    metadata: {
      type: asString(metadata.type ?? item.type, 'coin'),
      denomination: denomination || undefined,
      rulerOrIssuer: ruler || undefined,
      mintOrPlace: asString(metadata.mintOrPlace ?? metadata.mint_or_place ?? item.mintOrPlace ?? item.mint_or_place ?? location) || undefined,
      seriesOrCatalog: asString(metadata.seriesOrCatalog ?? metadata.series_or_catalog ?? item.seriesOrCatalog ?? item.series_or_catalog) || undefined,
      weightEstimate: asString(metadata.weightEstimate ?? metadata.weight_estimate ?? item.weightEstimate ?? item.weight_estimate) || undefined,
      condition: asString(metadata.condition ?? item.condition) || undefined,
      confidence: asString(metadata.confidence ?? item.confidence) || undefined,
    },
    sourceUrl: asString(item.sourceUrl ?? item.source_url) || undefined,
    sourceRawRef: sourceRawRef || undefined,
    sourcePageLabel: pageLabel || undefined,
    sourceBatch: sourceBatch || undefined,
    privateProfile: isRecord(item.privateProfile)
      ? item.privateProfile as ArchiveSnapshotItem['privateProfile']
      : null,
  };
}

function deriveCollectionName(raw: Record<string, unknown>, collectionSlug: string) {
  const collection: Record<string, unknown> = isRecord(raw.collection) ? raw.collection : {};
  const fallback = titleize(collectionSlug);
  const fromRoot = asString(raw.collectionName ?? raw.collection_name ?? raw.album_title, '');
  const fromCollection = asString(collection.displayName ?? collection.name ?? collection.title, '');
  return asString(fromRoot || fromCollection, fallback);
}

function deriveCollectionDescription(raw: Record<string, unknown>, collectionName: string) {
  const collection: Record<string, unknown> = isRecord(raw.collection) ? raw.collection : {};
  const fallback = `Imported paired catalogue for ${collectionName}`;
  const fromRoot = asString(raw.description ?? raw.longDescription ?? raw.long_description, '');
  const fromCollection = asString(collection.description ?? collection.longDescription ?? collection.long_description, '');
  return asString(fromRoot || fromCollection, fallback);
}

function extractPairedItems(raw: unknown) {
  if (Array.isArray(raw)) return raw;
  if (!isRecord(raw)) return null;
  if (Array.isArray(raw.catalogue)) return raw.catalogue;
  if (Array.isArray(raw.items)) return raw.items;
  return null;
}

export function normalizePairedOutputCatalogue(raw: unknown, options: NormalizePairedOutputOptions = {}): ArchiveSnapshot {
  const root: Record<string, unknown> = isRecord(raw) ? raw : {};
  const rootCollection: Record<string, unknown> = isRecord(root.collection) ? root.collection : {};
  const items = extractPairedItems(raw);
  if (!items) {
    throw new Error('Paired-output catalogue input must be an array or contain a catalogue/items array.');
  }

  const collectionSlug = asString(options.collectionSlug ?? rootCollection.slug, '');
  if (!collectionSlug) {
    throw new Error('Paired-output catalogue input requires --collection <slug>.');
  }

  const collectionName = deriveCollectionName(root, collectionSlug);
  const description = deriveCollectionDescription(root, collectionName);
  const firstItem = items.length > 0 && isRecord(items[0]) ? items[0] : null;
  const heroImage = asString(
    root.heroImage
      ?? root.hero_image
      ?? root.imageUrl
      ?? root.image_url
      ?? root.image
      ?? (firstItem ? asString(firstItem.image_path ?? firstItem.imagePath ?? firstItem.imageUrl ?? firstItem.image ?? '') : ''),
    '',
  );

  return {
    exportedAt: asString(root.exportedAt ?? root.exported_at, new Date().toISOString()),
    source: 'paired-output',
    collection: {
      id: asString(root.collectionId ?? root.collection_id ?? collectionSlug, collectionSlug),
      slug: collectionSlug,
      name: collectionName,
      displayName: asString(root.displayName ?? root.display_name ?? collectionName, collectionName),
      description,
      longDescription: asString(root.longDescription ?? root.long_description ?? description, description),
      culture: asString(root.culture ?? rootCollection.culture, ''),
      periodLabel: asString(root.periodLabel ?? root.period_label ?? rootCollection.periodLabel ?? rootCollection.period_label, ''),
      heroImage: heroImage || undefined,
      sortOrder: asNullableNumber(root.sortOrder ?? root.sort_order) ?? undefined,
    },
    items: items.map((item, index) => normalizePairedOutputItem(item, index)),
  };
}

export function titleizeSlug(slug: string) {
  return titleize(asString(slug));
}
