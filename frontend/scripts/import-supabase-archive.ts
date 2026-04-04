import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { buildCanonicalTags, canonicalizeAuthority, canonicalizeMint, canonicalizeRulerOrIssuer, slugifyTag } from '../src/shared/lib/catalogNormalization';
import { parseGsUrl } from '../src/shared/lib/storage';
import { deriveYearRange } from '../src/backend-support/mappers/normalizeItem';

const TARGET_DOMAIN = {
  canonicalId: 'ahg:domain:coins',
  slug: 'coins',
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');
const defaultSnapshotDir = path.resolve(projectRoot, 'backend-support', 'snapshots', 'firebase-archive');
const defaultPayloadDir = path.resolve(projectRoot, 'backend-support', 'snapshots', 'supabase-import');

type SnapshotMedia = {
  gsUrl?: string;
  storagePath?: string;
  downloadUrl?: string;
  alt?: string;
  caption?: string;
  width?: number | null;
  height?: number | null;
};

type SnapshotItem = {
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
  primaryMedia?: SnapshotMedia | null;
  gallery?: SnapshotMedia[];
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

type FirebaseArchiveSnapshot = {
  exportedAt: string;
  source: 'firebase-firestore';
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
  items: SnapshotItem[];
};

type CollectionRow = {
  canonical_id: string;
  domain_id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string;
  long_description: string | null;
  era_label: string | null;
  country_code: string;
  cover_image_path: string | null;
  status: string;
  sort_order: number;
};

type ConceptualItemRow = {
  canonical_id: string;
  domain_id: string;
  collection_id: string;
  concept_type: string;
  slug: string;
  title: string;
  subtitle: string | null;
  summary: string | null;
  era_label: string | null;
  date_start: number | null;
  date_end: number | null;
  display_date: string | null;
  country_code: string;
  authority_status: string;
  attributes: Record<string, unknown>;
  review_status: string;
  visibility: string;
};

type ItemRow = {
  canonical_id: string;
  domain_id: string;
  collection_id: string;
  conceptual_item_id: string;
  item_type: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  short_description: string | null;
  era_label: string | null;
  date_start: number | null;
  date_end: number | null;
  display_date: string | null;
  country_code: string;
  primary_image_path: string | null;
  primary_image_alt: string | null;
  attributes: Record<string, unknown>;
  sort_title: string;
  sort_year_start: number | null;
  sort_year_end: number | null;
  review_status: string;
  visibility: string;
  source_page_number: number | null;
  source_page_label: string | null;
  source_batch: string | null;
  source_reference: string | null;
};

type MediaAssetRow = {
  target_kind: string;
  target_id: string;
  storage_provider: string;
  storage_path: string;
  public_url: string | null;
  asset_role: string;
  alt_text: string | null;
  caption: string | null;
  sort_order: number;
  width: number | null;
  height: number | null;
  metadata: Record<string, unknown>;
};

type TagRow = {
  canonical_id: string;
  tag_type: string;
  slug: string;
  label: string;
  normalized_label: string;
  source_kind: string;
  source_id: string | null;
  is_public: boolean;
};

type RecordTagRow = {
  record_kind: string;
  record_id: string;
  tag_id: string;
  is_primary: boolean;
};

type EntityRow = {
  canonical_id: string;
  entity_type: string;
  slug: string;
  preferred_label: string;
  sort_label: string;
  summary: string | null;
  country_code: string;
  era_label: string | null;
  attributes: Record<string, unknown>;
  is_public: boolean;
};

type RecordEntityRow = {
  record_kind: string;
  record_id: string;
  entity_id: string;
  relation_type: string;
  is_primary: boolean;
  confidence: number | null;
  source: string;
};

type RecordReferenceRow = {
  record_kind: string;
  record_id: string;
  reference_type: string;
  reference_system: string | null;
  reference_code: string | null;
  citation_text: string | null;
  url: string | null;
  is_primary: boolean;
  metadata: Record<string, unknown>;
};

type NumismaticTypeProfileRow = {
  conceptual_item_id: string;
  object_type: string | null;
  denomination: string | null;
  manufacture: string | null;
  material: string | null;
  mint_entity_id: string | null;
  authority_entity_id: string | null;
  issuer_entity_id: string | null;
  dynasty_entity_id: string | null;
  region_entity_id: string | null;
  date_on_object: string | null;
  date_standardized_start: number | null;
  date_standardized_end: number | null;
  type_series: string | null;
  catalogue_primary: string | null;
  obverse_summary: string | null;
  reverse_summary: string | null;
  edge_summary: string | null;
  attributes: Record<string, unknown>;
};

type NumismaticItemProfileRow = {
  item_id: string;
  material: string | null;
  denomination: string | null;
  weight_grams: number | null;
  diameter_mm: number | null;
  axis_hours: number | null;
  condition_label: string | null;
  authenticity_status: string | null;
  mint_entity_id: string | null;
  issuer_entity_id: string | null;
  authority_entity_id: string | null;
  type_series: string | null;
  catalogue_primary: string | null;
  estimated_public_price_min: number | null;
  estimated_public_price_max: number | null;
  attributes: Record<string, unknown>;
};

type PrivateProfileRow = {
  item_id: string;
  owner_user_id: string;
  year_bought: number | null;
  purchase_price: number | null;
  purchase_currency: string | null;
  estimated_value_min: number | null;
  estimated_value_max: number | null;
  estimated_value_avg: number | null;
  acquisition_source: string | null;
  acquisition_date: string | null;
  internal_notes: string | null;
  private_tags: string[];
  private_attributes: Record<string, unknown>;
};

type MigrationPayloadBundle = {
  collection: CollectionRow;
  conceptual_items: ConceptualItemRow[];
  items: ItemRow[];
  media_assets: MediaAssetRow[];
  tags: TagRow[];
  record_tags: RecordTagRow[];
  entities: EntityRow[];
  record_entities: RecordEntityRow[];
  record_references: RecordReferenceRow[];
  numismatic_type_profiles: NumismaticTypeProfileRow[];
  numismatic_item_profiles: NumismaticItemProfileRow[];
  item_private_profiles: PrivateProfileRow[];
  warnings: string[];
};

function loadLocalEnvFile() {
  const envPath = path.resolve(projectRoot, 'frontend', '.env');
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

function asString(value: unknown, fallback = '') {
  return value == null ? fallback : String(value);
}

function asNullableNumber(value: unknown) {
  if (value == null || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => asString(value).trim()).filter(Boolean)));
}

function toArrayOfStrings(value: unknown) {
  return Array.isArray(value) ? value.map((entry) => asString(entry).trim()).filter(Boolean) : [];
}

function parseSnapshotMedia(value: unknown): SnapshotMedia | null {
  if (!value || typeof value !== 'object') return null;
  const media = value as Record<string, unknown>;
  return {
    gsUrl: asString(media.gsUrl || media.gs_url || media.url || ''),
    storagePath: asString(media.storagePath || media.storage_path || ''),
    downloadUrl: asString(media.downloadUrl || media.download_url || ''),
    alt: asString(media.alt || media.alt_text || ''),
    caption: media.caption == null ? undefined : asString(media.caption),
    width: media.width == null ? null : asNullableNumber(media.width),
    height: media.height == null ? null : asNullableNumber(media.height),
  };
}

function parseSnapshotItem(value: unknown): SnapshotItem {
  const item = value as Record<string, unknown>;
  return {
    id: asString(item.id),
    title: asString(item.title),
    subtitle: asString(item.subtitle),
    period: asString(item.period),
    dateText: asString(item.dateText),
    culture: asString(item.culture),
    location: asString(item.location),
    description: asString(item.description),
    shortDescription: asString(item.shortDescription),
    imageUrl: asString(item.imageUrl),
    imageAlt: asString(item.imageAlt),
    primaryMedia: parseSnapshotMedia(item.primaryMedia) ?? null,
    gallery: Array.isArray(item.gallery) ? item.gallery.map(parseSnapshotMedia).filter(Boolean) as SnapshotMedia[] : [],
    materials: toArrayOfStrings(item.materials),
    tags: toArrayOfStrings(item.tags),
    publicTags: toArrayOfStrings(item.publicTags),
    entityBadges: toArrayOfStrings(item.entityBadges),
    relatedReasons: toArrayOfStrings(item.relatedReasons),
    notes: toArrayOfStrings(item.notes),
    pageNumber: asNullableNumber(item.pageNumber) ?? undefined,
    sortYearStart: asNullableNumber(item.sortYearStart) ?? undefined,
    sortYearEnd: asNullableNumber(item.sortYearEnd) ?? undefined,
    weightGrams: asNullableNumber(item.weightGrams) ?? undefined,
    importedAt: asString(item.importedAt),
    updatedAt: asString(item.updatedAt),
    metadata: item.metadata && typeof item.metadata === 'object' ? item.metadata as SnapshotItem['metadata'] : undefined,
    sourceUrl: asString(item.sourceUrl),
    sourceRawRef: asString(item.sourceRawRef),
    sourcePageLabel: item.sourcePageLabel == null ? undefined : asString(item.sourcePageLabel),
    sourceBatch: item.sourceBatch == null ? undefined : asString(item.sourceBatch),
    privateProfile: item.privateProfile && typeof item.privateProfile === 'object'
      ? item.privateProfile as SnapshotItem['privateProfile']
      : null,
  };
}

function readSnapshotFile(filePath: string): FirebaseArchiveSnapshot {
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as FirebaseArchiveSnapshot;
  return {
    ...parsed,
    items: Array.isArray(parsed.items) ? parsed.items.map(parseSnapshotItem) : [],
  };
}

function resolveSnapshotInputs(target?: string) {
  if (!target) {
    return fs.existsSync(defaultSnapshotDir)
      ? fs.readdirSync(defaultSnapshotDir).filter((entry) => entry.endsWith('.json')).map((entry) => path.join(defaultSnapshotDir, entry)).sort()
      : [];
  }

  const resolved = path.resolve(process.cwd(), target);
  if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) return [resolved];
  if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
    return fs.readdirSync(resolved).filter((entry) => entry.endsWith('.json')).map((entry) => path.join(resolved, entry)).sort();
  }

  const fallback = path.join(defaultSnapshotDir, `${target}.json`);
  return fs.existsSync(fallback) ? [fallback] : [];
}

function resolveStoragePath(media: SnapshotMedia | null | undefined) {
  const direct = asString(media?.storagePath);
  if (direct) return direct;
  const gsUrl = asString(media?.gsUrl);
  if (!gsUrl) return '';
  return parseGsUrl(gsUrl)?.path ?? gsUrl;
}

function normalizeCollection(snapshot: FirebaseArchiveSnapshot) {
  return {
    slug: snapshot.collection.slug,
    title: asString(snapshot.collection.displayName || snapshot.collection.name || snapshot.collection.slug),
    description: asString(snapshot.collection.description, 'Imported archive collection'),
    longDescription: asString(snapshot.collection.longDescription || snapshot.collection.description),
    eraLabel: asString(snapshot.collection.periodLabel),
    culture: asString(snapshot.collection.culture),
    coverImagePath: resolveStoragePath(parseSnapshotMedia({ storagePath: snapshot.collection.heroImage })),
    sortOrder: asNullableNumber(snapshot.collection.sortOrder) ?? 0,
  };
}

function buildCollectionCanonicalId(slug: string) {
  return `ahg:collection:${TARGET_DOMAIN.slug}:${slug}`;
}

function buildCollectionRow(snapshot: FirebaseArchiveSnapshot): CollectionRow {
  const normalized = normalizeCollection(snapshot);
  return {
    canonical_id: buildCollectionCanonicalId(normalized.slug),
    domain_id: '',
    slug: normalized.slug,
    title: normalized.title,
    subtitle: normalized.culture || null,
    description: normalized.description,
    long_description: normalized.longDescription || null,
    era_label: normalized.eraLabel || null,
    country_code: 'IN',
    cover_image_path: normalized.coverImagePath || null,
    status: 'published',
    sort_order: normalized.sortOrder,
  };
}

function buildConceptIdentity(snapshot: FirebaseArchiveSnapshot, item: SnapshotItem) {
  const authority = canonicalizeAuthority(snapshot.collection.culture || item.culture || '') || 'unknown-authority';
  const issuer = canonicalizeRulerOrIssuer(item.metadata?.rulerOrIssuer || '') || 'unknown-issuer';
  const mint = canonicalizeMint(item.metadata?.mintOrPlace || item.location || '') || 'unknown-mint';
  const denomination = asString(item.metadata?.denomination || 'unknown-denomination');
  const { sortYearStart, sortYearEnd } = deriveYearRange(item.dateText || item.period || '');

  const conceptSlug = slugifyTag([authority, issuer, denomination, mint, sortYearStart || '', sortYearEnd || ''].filter(Boolean).join(' '));
  return {
    authority,
    issuer,
    mint,
    denomination,
    sortYearStart,
    sortYearEnd,
    conceptSlug,
    canonicalId: `ahg:type:coin:${snapshot.collection.slug}:${conceptSlug}`,
  };
}

function buildConceptualRow(snapshot: FirebaseArchiveSnapshot, item: SnapshotItem, collectionCanonicalId: string): ConceptualItemRow {
  const concept = buildConceptIdentity(snapshot, item);
  return {
    canonical_id: concept.canonicalId,
    domain_id: '',
    collection_id: collectionCanonicalId,
    concept_type: 'coin_type',
    slug: concept.conceptSlug,
    title: [concept.issuer, concept.denomination, concept.mint].filter(Boolean).join(' '),
    subtitle: concept.authority,
    summary: item.description || item.shortDescription || null,
    era_label: item.period || null,
    date_start: concept.sortYearStart,
    date_end: concept.sortYearEnd,
    display_date: item.dateText || null,
    country_code: 'IN',
    authority_status: 'canonicalized',
    attributes: {
      source: 'firebase-archive',
      sourceItemId: item.id,
      authority: concept.authority,
      issuer: concept.issuer,
      mint: concept.mint,
      denomination: concept.denomination,
    },
    review_status: 'published',
    visibility: 'public',
  };
}

function buildPublicTags(snapshot: FirebaseArchiveSnapshot, item: SnapshotItem) {
  return uniqueStrings([
    ...(item.tags ?? []),
    ...(item.publicTags ?? []),
    ...buildCanonicalTags({
      authority: snapshot.collection.culture ?? item.culture,
      culture: snapshot.collection.culture ?? item.culture,
      rulerOrIssuer: item.metadata?.rulerOrIssuer,
      denomination: item.metadata?.denomination,
      mintOrPlace: item.metadata?.mintOrPlace ?? item.location,
      materials: item.materials,
    }),
  ]);
}

function buildItemRow(snapshot: FirebaseArchiveSnapshot, item: SnapshotItem, collectionCanonicalId: string): ItemRow {
  const concept = buildConceptIdentity(snapshot, item);
  const storagePath = resolveStoragePath(item.primaryMedia) || asString(item.imageUrl);
  const publicTags = buildPublicTags(snapshot, item);
  const { sortYearStart, sortYearEnd } = deriveYearRange(item.dateText || item.period || '');
  const canonicalId = `ahg:item:coin:${snapshot.collection.slug}:${slugifyTag(item.id)}`;

  return {
    canonical_id: canonicalId,
    domain_id: '',
    collection_id: collectionCanonicalId,
    conceptual_item_id: concept.canonicalId,
    item_type: item.metadata?.type || 'coin',
    slug: slugifyTag(`${snapshot.collection.slug} ${item.id}`),
    title: asString(item.title || concept.issuer || item.id),
    subtitle: asString(item.subtitle) || null,
    description: asString(item.description) || null,
    short_description: asString(item.shortDescription || item.description) || null,
    era_label: asString(item.period) || null,
    date_start: item.sortYearStart ?? sortYearStart,
    date_end: item.sortYearEnd ?? sortYearEnd,
    display_date: asString(item.dateText) || null,
    country_code: 'IN',
    primary_image_path: storagePath || null,
    primary_image_alt: asString(item.imageAlt || item.title || concept.issuer) || null,
    attributes: {
      source: 'firebase-archive',
      sourceItemId: item.id,
      materials: item.materials ?? [],
      tags: item.tags ?? [],
      publicTags,
      entityBadges: item.entityBadges ?? [],
      relatedReasons: item.relatedReasons ?? [],
      notes: item.notes ?? [],
      culture: snapshot.collection.culture ?? item.culture ?? '',
      location: item.location ?? '',
      denomination: item.metadata?.denomination ?? '',
      rulerOrIssuer: item.metadata?.rulerOrIssuer ?? '',
      mintOrPlace: item.metadata?.mintOrPlace ?? '',
      seriesOrCatalog: item.metadata?.seriesOrCatalog ?? '',
      weightEstimate: item.metadata?.weightEstimate ?? '',
      condition: item.metadata?.condition ?? '',
      confidence: item.metadata?.confidence ?? '',
      weightGrams: item.weightGrams ?? null,
    },
    sort_title: asString(item.title || concept.issuer || item.id),
    sort_year_start: item.sortYearStart ?? sortYearStart,
    sort_year_end: item.sortYearEnd ?? sortYearEnd,
    review_status: 'published',
    visibility: 'public',
    source_page_number: item.pageNumber ?? null,
    source_page_label: item.sourcePageLabel ?? null,
    source_batch: item.sourceBatch ?? null,
    source_reference: item.sourceRawRef || item.sourceUrl || null,
  };
}

function buildMediaRows(snapshot: SnapshotItem, itemCanonicalId: string): MediaAssetRow[] {
  const mediaList = [snapshot.primaryMedia, ...(snapshot.gallery ?? [])].filter(Boolean) as SnapshotMedia[];
  const seen = new Set<string>();

  return mediaList
    .map((media, index) => {
      const storagePath = resolveStoragePath(media);
      if (!storagePath || seen.has(storagePath)) return null;
      seen.add(storagePath);
      return {
        target_kind: 'item',
        target_id: itemCanonicalId,
        storage_provider: 'firebase-storage',
        storage_path: storagePath,
        public_url: media.downloadUrl ?? null,
        asset_role: index === 0 ? 'primary' : 'gallery',
        alt_text: media.alt ?? null,
        caption: media.caption ?? null,
        sort_order: index,
        width: media.width ?? null,
        height: media.height ?? null,
        metadata: {
          source: 'firebase-archive',
        },
      } satisfies MediaAssetRow;
    })
    .filter((row): row is MediaAssetRow => row != null);
}

function buildTagRows(tags: string[]) {
  return tags.map((tag) => ({
    canonical_id: `ahg:tag:${slugifyTag(tag)}`,
    tag_type: 'public',
    slug: slugifyTag(tag),
    label: tag,
    normalized_label: slugifyTag(tag),
    source_kind: 'firebase-archive',
    source_id: null,
    is_public: true,
  } satisfies TagRow));
}

function buildEntityRow(entityType: string, label: string): EntityRow {
  const slug = slugifyTag(label);
  return {
    canonical_id: `ahg:entity:${entityType}:${slug}`,
    entity_type: entityType,
    slug,
    preferred_label: label,
    sort_label: label,
    summary: null,
    country_code: 'IN',
    era_label: null,
    attributes: {
      source: 'firebase-archive',
    },
    is_public: true,
  };
}

function buildEntityCandidates(snapshot: FirebaseArchiveSnapshot, item: SnapshotItem) {
  const authority = canonicalizeAuthority(snapshot.collection.culture ?? item.culture ?? '');
  const issuer = canonicalizeRulerOrIssuer(item.metadata?.rulerOrIssuer ?? '');
  const mint = canonicalizeMint(item.metadata?.mintOrPlace ?? item.location ?? '');

  return [
    authority ? { entityType: 'authority', label: authority, relationType: 'issued_under' } : null,
    issuer ? { entityType: 'person', label: issuer, relationType: 'issued_by' } : null,
    mint ? { entityType: 'mint', label: mint, relationType: 'minted_at' } : null,
  ].filter((entry): entry is { entityType: string; label: string; relationType: string } => entry != null);
}

function buildPrivateProfileRow(snapshot: SnapshotItem, itemCanonicalId: string) {
  const privateProfile = snapshot.privateProfile;
  if (!privateProfile) return null;
  const ownerUserId = asString(privateProfile.owner_user_id ?? privateProfile.ownerUserId);
  if (!ownerUserId) return null;

  return {
    item_id: itemCanonicalId,
    owner_user_id: ownerUserId,
    year_bought: asNullableNumber(privateProfile.yearBought),
    purchase_price: asNullableNumber(privateProfile.purchasePrice),
    purchase_currency: privateProfile.purchaseCurrency ?? null,
    estimated_value_min: asNullableNumber(privateProfile.estimatedValueMin),
    estimated_value_max: asNullableNumber(privateProfile.estimatedValueMax),
    estimated_value_avg: asNullableNumber(privateProfile.estimatedValueAvg),
    acquisition_source: privateProfile.acquisitionSource ?? null,
    acquisition_date: privateProfile.acquisitionDate ?? null,
    internal_notes: privateProfile.internalNotes ?? null,
    private_tags: toArrayOfStrings(privateProfile.privateTags),
    private_attributes: {
      ...(privateProfile.privateAttributes ?? {}),
      source: 'firebase-archive',
    },
  } satisfies PrivateProfileRow;
}

function buildMigrationPayload(snapshot: FirebaseArchiveSnapshot): MigrationPayloadBundle {
  const collectionRow = buildCollectionRow(snapshot);
  const concepts = new Map<string, ConceptualItemRow>();
  const entities = new Map<string, EntityRow>();
  const tags = new Map<string, TagRow>();
  const items: ItemRow[] = [];
  const mediaAssets: MediaAssetRow[] = [];
  const recordTags: RecordTagRow[] = [];
  const recordEntities: RecordEntityRow[] = [];
  const recordReferences: RecordReferenceRow[] = [];
  const numismaticTypeProfiles = new Map<string, NumismaticTypeProfileRow>();
  const numismaticItemProfiles: NumismaticItemProfileRow[] = [];
  const privateProfiles: PrivateProfileRow[] = [];
  const warnings: string[] = [];

  snapshot.items.forEach((item) => {
    const concept = buildConceptualRow(snapshot, item, collectionRow.canonical_id);
    const itemRow = buildItemRow(snapshot, item, collectionRow.canonical_id);
    const conceptIdentity = buildConceptIdentity(snapshot, item);

    concepts.set(concept.canonical_id, concept);
    items.push(itemRow);
    mediaAssets.push(...buildMediaRows(item, itemRow.canonical_id));

    buildPublicTags(snapshot, item).forEach((tag, index) => {
      const tagRow = buildTagRows([tag])[0];
      tags.set(tagRow.canonical_id, tagRow);
      recordTags.push({
        record_kind: 'item',
        record_id: itemRow.canonical_id,
        tag_id: tagRow.canonical_id,
        is_primary: index === 0,
      });
    });

    buildEntityCandidates(snapshot, item).forEach((candidate, index) => {
      const entityRow = buildEntityRow(candidate.entityType, candidate.label);
      entities.set(entityRow.canonical_id, entityRow);
      recordEntities.push({
        record_kind: 'conceptual_item',
        record_id: concept.canonical_id,
        entity_id: entityRow.canonical_id,
        relation_type: candidate.relationType,
        is_primary: index === 0,
        confidence: null,
        source: 'firebase-archive',
      });
    });

    if (item.metadata?.seriesOrCatalog) {
      recordReferences.push({
        record_kind: 'conceptual_item',
        record_id: concept.canonical_id,
        reference_type: 'catalogue',
        reference_system: 'legacy',
        reference_code: item.metadata.seriesOrCatalog,
        citation_text: item.metadata.seriesOrCatalog,
        url: null,
        is_primary: true,
        metadata: {
          source: 'firebase-archive',
        },
      });
    }

    const entityIdFor = (entityType: string, label: string | undefined) =>
      label ? buildEntityRow(entityType, label).canonical_id : null;

    numismaticTypeProfiles.set(concept.canonical_id, {
      conceptual_item_id: concept.canonical_id,
      object_type: item.metadata?.type ?? 'coin',
      denomination: item.metadata?.denomination ?? null,
      manufacture: null,
      material: item.materials?.[0] ?? null,
      mint_entity_id: entityIdFor('mint', conceptIdentity.mint),
      authority_entity_id: entityIdFor('authority', conceptIdentity.authority),
      issuer_entity_id: entityIdFor('person', conceptIdentity.issuer),
      dynasty_entity_id: null,
      region_entity_id: null,
      date_on_object: item.dateText ?? null,
      date_standardized_start: conceptIdentity.sortYearStart,
      date_standardized_end: conceptIdentity.sortYearEnd,
      type_series: item.metadata?.seriesOrCatalog ?? null,
      catalogue_primary: item.metadata?.seriesOrCatalog ?? null,
      obverse_summary: null,
      reverse_summary: null,
      edge_summary: null,
      attributes: {
        source: 'firebase-archive',
      },
    });

    numismaticItemProfiles.push({
      item_id: itemRow.canonical_id,
      material: item.materials?.[0] ?? null,
      denomination: item.metadata?.denomination ?? null,
      weight_grams: item.weightGrams ?? null,
      diameter_mm: null,
      axis_hours: null,
      condition_label: item.metadata?.condition ?? null,
      authenticity_status: null,
      mint_entity_id: entityIdFor('mint', conceptIdentity.mint),
      issuer_entity_id: entityIdFor('person', conceptIdentity.issuer),
      authority_entity_id: entityIdFor('authority', conceptIdentity.authority),
      type_series: item.metadata?.seriesOrCatalog ?? null,
      catalogue_primary: item.metadata?.seriesOrCatalog ?? null,
      estimated_public_price_min: null,
      estimated_public_price_max: null,
      attributes: {
        source: 'firebase-archive',
        confidence: item.metadata?.confidence ?? null,
      },
    });

    const privateProfile = buildPrivateProfileRow(item, itemRow.canonical_id);
    if (privateProfile) {
      privateProfiles.push(privateProfile);
    } else if (item.privateProfile) {
      warnings.push(`Skipped private profile for ${item.id} because owner_user_id is missing.`);
    }
  });

  return {
    collection: collectionRow,
    conceptual_items: Array.from(concepts.values()),
    items,
    media_assets: mediaAssets,
    tags: Array.from(tags.values()),
    record_tags: recordTags,
    entities: Array.from(entities.values()),
    record_entities: recordEntities,
    record_references: recordReferences,
    numismatic_type_profiles: Array.from(numismaticTypeProfiles.values()),
    numismatic_item_profiles: numismaticItemProfiles,
    item_private_profiles: privateProfiles,
    warnings,
  };
}

function writePayloadFile(slug: string, payload: MigrationPayloadBundle, sourceSnapshotPath: string) {
  fs.mkdirSync(defaultPayloadDir, { recursive: true });
  const filePath = path.join(defaultPayloadDir, `${slug}.json`);
  fs.writeFileSync(filePath, `${JSON.stringify({ exportedAt: new Date().toISOString(), sourceSnapshotPath, targetDomain: TARGET_DOMAIN, payload }, null, 2)}\n`, 'utf8');
  return filePath;
}

function hasSupabaseWriteEnv() {
  return Boolean((process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE));
}

function getSupabaseCredentials() {
  return {
    url: process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '',
    key: process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE ?? '',
  };
}

async function supabaseRequest<T>(pathName: string, options: { method?: string; query?: Record<string, string | number | boolean | null | undefined>; body?: unknown } = {}): Promise<T> {
  const { url, key } = getSupabaseCredentials();
  if (!url || !key) throw new Error('Supabase write environment is not configured.');

  const requestUrl = new URL(`${url}/rest/v1/${pathName}`);
  Object.entries(options.query ?? {}).forEach(([queryKey, queryValue]) => {
    if (queryValue != null) {
      requestUrl.searchParams.set(queryKey, String(queryValue));
    }
  });

  const response = await fetch(requestUrl.toString(), {
    method: options.method ?? 'GET',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: options.body == null ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) {
    throw new Error(`Supabase request failed for ${pathName}: ${response.status} ${response.statusText}`);
  }

  if (response.status === 204) return [] as T;
  return await response.json() as T;
}

async function supabaseUpsert<T extends Record<string, unknown>>(table: string, rows: T[], onConflict: string) {
  if (rows.length === 0) return [] as Array<T & { id?: string }>;
  return supabaseRequest<Array<T & { id?: string }>>(table, {
    method: 'POST',
    query: { on_conflict: onConflict },
    body: rows,
  });
}

async function resolveDomainId() {
  if (!hasSupabaseWriteEnv()) return null;
  const rows = await supabaseRequest<Array<{ id: string }>>('domains', {
    query: { select: 'id', slug: `eq.${TARGET_DOMAIN.slug}`, limit: 1 },
  });
  return rows[0]?.id ?? null;
}

async function importSnapshot(filePath: string) {
  const snapshot = readSnapshotFile(filePath);
  const payload = buildMigrationPayload(snapshot);
  const domainId = await resolveDomainId();

  payload.collection.domain_id = domainId ?? '';
  payload.conceptual_items = payload.conceptual_items.map((row) => ({ ...row, domain_id: domainId ?? '' }));
  payload.items = payload.items.map((row) => ({ ...row, domain_id: domainId ?? '' }));

  const payloadFile = writePayloadFile(snapshot.collection.slug, payload, filePath);
  if (!hasSupabaseWriteEnv() || !domainId) {
    return {
      slug: snapshot.collection.slug,
      payloadFile,
      writeStatus: 'skipped',
      counts: {
        conceptualItems: payload.conceptual_items.length,
        items: payload.items.length,
        mediaAssets: payload.media_assets.length,
        tags: payload.tags.length,
        recordTags: payload.record_tags.length,
        entities: payload.entities.length,
        recordEntities: payload.record_entities.length,
        recordReferences: payload.record_references.length,
        numismaticTypeProfiles: payload.numismatic_type_profiles.length,
        numismaticItemProfiles: payload.numismatic_item_profiles.length,
        itemPrivateProfiles: payload.item_private_profiles.length,
      },
      warnings: payload.warnings,
    };
  }

  const collectionRows = await supabaseUpsert('collections', [{ ...payload.collection, domain_id: domainId }], 'canonical_id');
  const collectionId = String(collectionRows[0]?.id ?? '');
  if (!collectionId) throw new Error(`Supabase did not return a collection id for ${snapshot.collection.slug}.`);

  const conceptualRows = await supabaseUpsert(
    'conceptual_items',
    payload.conceptual_items.map((row) => ({ ...row, domain_id: domainId, collection_id: collectionId })),
    'canonical_id',
  );
  const conceptualIdByCanonicalId = new Map(conceptualRows.map((row) => [String(row.canonical_id), String(row.id ?? '')]));

  const itemRows = await supabaseUpsert(
    'items',
    payload.items.map((row) => ({
      ...row,
      domain_id: domainId,
      collection_id: collectionId,
      conceptual_item_id: conceptualIdByCanonicalId.get(row.conceptual_item_id) ?? null,
    })),
    'canonical_id',
  );
  const itemIdByCanonicalId = new Map(itemRows.map((row) => [String(row.canonical_id), String(row.id ?? '')]));

  const tagRows = await supabaseUpsert('tags', payload.tags, 'canonical_id');
  const tagIdByCanonicalId = new Map(tagRows.map((row) => [String(row.canonical_id), String(row.id ?? '')]));

  const entityRows = await supabaseUpsert('entities', payload.entities, 'canonical_id');
  const entityIdByCanonicalId = new Map(entityRows.map((row) => [String(row.canonical_id), String(row.id ?? '')]));

  const mediaRows = await supabaseUpsert(
    'media_assets',
    payload.media_assets.map((row) => ({
      ...row,
      target_id: row.target_kind === 'item' ? itemIdByCanonicalId.get(row.target_id) ?? row.target_id : row.target_id,
    })),
    'target_kind,target_id,storage_path',
  );

  const recordTagRows = await supabaseUpsert(
    'record_tags',
    payload.record_tags.map((row) => ({
      ...row,
      record_id: itemIdByCanonicalId.get(row.record_id) ?? row.record_id,
      tag_id: tagIdByCanonicalId.get(row.tag_id) ?? row.tag_id,
    })),
    'record_kind,record_id,tag_id',
  );

  const recordEntityRows = await supabaseUpsert(
    'record_entities',
    payload.record_entities.map((row) => ({
      ...row,
      record_id: row.record_kind === 'conceptual_item'
        ? conceptualIdByCanonicalId.get(row.record_id) ?? row.record_id
        : itemIdByCanonicalId.get(row.record_id) ?? row.record_id,
      entity_id: entityIdByCanonicalId.get(row.entity_id) ?? row.entity_id,
    })),
    'record_kind,record_id,entity_id,relation_type',
  );

  const recordReferenceRows = await supabaseUpsert(
    'record_references',
    payload.record_references.map((row) => ({
      ...row,
      record_id: row.record_kind === 'conceptual_item'
        ? conceptualIdByCanonicalId.get(row.record_id) ?? row.record_id
        : itemIdByCanonicalId.get(row.record_id) ?? row.record_id,
    })),
    'record_kind,record_id,reference_type,reference_code',
  );

  const numismaticTypeProfileRows = await supabaseUpsert(
    'numismatic_type_profiles',
    payload.numismatic_type_profiles.map((row) => ({
      ...row,
      conceptual_item_id: conceptualIdByCanonicalId.get(row.conceptual_item_id) ?? row.conceptual_item_id,
      mint_entity_id: row.mint_entity_id ? entityIdByCanonicalId.get(row.mint_entity_id) ?? null : null,
      authority_entity_id: row.authority_entity_id ? entityIdByCanonicalId.get(row.authority_entity_id) ?? null : null,
      issuer_entity_id: row.issuer_entity_id ? entityIdByCanonicalId.get(row.issuer_entity_id) ?? null : null,
    })),
    'conceptual_item_id',
  );

  const numismaticItemProfileRows = await supabaseUpsert(
    'numismatic_item_profiles',
    payload.numismatic_item_profiles.map((row) => ({
      ...row,
      item_id: itemIdByCanonicalId.get(row.item_id) ?? row.item_id,
      mint_entity_id: row.mint_entity_id ? entityIdByCanonicalId.get(row.mint_entity_id) ?? null : null,
      authority_entity_id: row.authority_entity_id ? entityIdByCanonicalId.get(row.authority_entity_id) ?? null : null,
      issuer_entity_id: row.issuer_entity_id ? entityIdByCanonicalId.get(row.issuer_entity_id) ?? null : null,
    })),
    'item_id',
  );

  const privateProfileRows = await supabaseUpsert(
    'item_private_profiles',
    payload.item_private_profiles.map((row) => ({
      ...row,
      item_id: itemIdByCanonicalId.get(row.item_id) ?? row.item_id,
    })),
    'item_id,owner_user_id',
  );

  return {
    slug: snapshot.collection.slug,
    payloadFile,
    writeStatus: 'applied',
    counts: {
      collections: collectionRows.length,
      conceptualItems: conceptualRows.length,
      items: itemRows.length,
      mediaAssets: mediaRows.length,
      tags: tagRows.length,
      recordTags: recordTagRows.length,
      entities: entityRows.length,
      recordEntities: recordEntityRows.length,
      recordReferences: recordReferenceRows.length,
      numismaticTypeProfiles: numismaticTypeProfileRows.length,
      numismaticItemProfiles: numismaticItemProfileRows.length,
      itemPrivateProfiles: privateProfileRows.length,
    },
    warnings: payload.warnings,
  };
}

async function main() {
  loadLocalEnvFile();
  const files = resolveSnapshotInputs(process.argv[2]);
  if (files.length === 0) {
    throw new Error(`No Firebase archive snapshots found under ${defaultSnapshotDir}.`);
  }

  const summaries = [];
  for (const filePath of files) {
    summaries.push(await importSnapshot(filePath));
  }

  console.log(JSON.stringify({
    importedAt: new Date().toISOString(),
    payloadDir: defaultPayloadDir,
    hasSupabaseWriteEnv: hasSupabaseWriteEnv(),
    summaries,
  }, null, 2));
}

if (import.meta.url === `file://${__filename}`) {
  main().catch((error) => {
    if (error instanceof Error) {
      console.error(JSON.stringify({ name: error.name, message: error.message, stack: error.stack }, null, 2));
    } else {
      console.error(String(error));
    }
    process.exitCode = 1;
  });
}
