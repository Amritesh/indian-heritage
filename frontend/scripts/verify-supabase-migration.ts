import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { loadWorkspaceEnv } from './lib/loadEnv';
import { normalizePairedOutputCatalogue } from './lib/archiveSnapshot';
import { buildCanonicalTags, canonicalizeAuthority, canonicalizeMint, canonicalizeRulerOrIssuer, slugifyTag } from '../src/shared/lib/catalogNormalization';
import { deriveYearRange } from '../src/backend-support/mappers/normalizeItem';
import { materializeCanonicalArchiveSnapshots, resolveArchiveSnapshotPaths } from './lib/archiveSnapshotSources';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');
const defaultSnapshotDir = path.resolve(projectRoot, 'backend-support', 'snapshots', 'firebase-archive');

type CountSnapshot = Record<string, number>;
type CountMap = Record<string, CountSnapshot>;

type FirebaseArchiveSnapshot = {
  collection: {
    slug: string;
    culture?: string;
  };
  items: Array<{
    id: string;
    period?: string;
    dateText?: string;
    culture?: string;
    location?: string;
    materials?: string[];
    tags?: string[];
    publicTags?: string[];
    primaryMedia?: { storagePath?: string; gsUrl?: string } | null;
    gallery?: Array<{ storagePath?: string; gsUrl?: string }>;
    metadata?: {
      denomination?: string;
      rulerOrIssuer?: string;
      mintOrPlace?: string;
      type?: string;
      seriesOrCatalog?: string;
    };
    privateProfile?: {
      ownerUserId?: string;
      owner_user_id?: string;
    } | null;
  }>;
};

type CountMismatch = {
  collectionSlug: string;
  metric: string;
  firebase: number;
  supabase: number;
};

const STRICT_MATCH_METRICS = new Set([
  'collections',
  'items',
  'media_assets',
  'numismatic_item_profiles',
  'item_private_profiles',
]);

function isFirebaseArchiveSnapshot(value: unknown): value is FirebaseArchiveSnapshot {
  return value !== null
    && typeof value === 'object'
    && !Array.isArray(value)
    && 'collection' in value
    && typeof (value as { collection?: { slug?: unknown } }).collection?.slug === 'string'
    && Array.isArray((value as { items?: unknown[] }).items);
}

function parseSnapshotFile(filePath: string) {
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
  if (isFirebaseArchiveSnapshot(parsed)) {
    return parsed;
  }

  return normalizePairedOutputCatalogue(parsed, {
    collectionSlug: path.basename(filePath, path.extname(filePath)),
    sourcePath: filePath,
  }) as FirebaseArchiveSnapshot;
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean)));
}

function buildPublicTags(snapshot: FirebaseArchiveSnapshot, item: FirebaseArchiveSnapshot['items'][number]) {
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

function buildConceptCanonicalId(snapshot: FirebaseArchiveSnapshot, item: FirebaseArchiveSnapshot['items'][number]) {
  const authority = canonicalizeAuthority(snapshot.collection.culture || item.culture || '') || 'unknown-authority';
  const issuer = canonicalizeRulerOrIssuer(item.metadata?.rulerOrIssuer || '') || 'unknown-issuer';
  const mint = canonicalizeMint(item.metadata?.mintOrPlace || item.location || '') || 'unknown-mint';
  const denomination = String(item.metadata?.denomination || 'unknown-denomination');
  const { sortYearStart, sortYearEnd } = deriveYearRange(item.dateText || item.period || '');
  const conceptSlug = slugifyTag([authority, issuer, denomination, mint, sortYearStart || '', sortYearEnd || ''].filter(Boolean).join(' '));
  return `ahg:type:coin:${snapshot.collection.slug}:${conceptSlug}`;
}

function isPlaceholderEntityLabel(label: string | null | undefined) {
  const normalized = slugifyTag(label ?? '');
  return !normalized || ['unknown', 'n-a', 'na', 'unclear', 'unreadable', 'none'].includes(normalized);
}

function buildEntityCandidates(snapshot: FirebaseArchiveSnapshot, item: FirebaseArchiveSnapshot['items'][number]) {
  const authority = canonicalizeAuthority(snapshot.collection.culture ?? item.culture ?? '');
  const issuer = canonicalizeRulerOrIssuer(item.metadata?.rulerOrIssuer ?? '');
  const mint = canonicalizeMint(item.metadata?.mintOrPlace ?? item.location ?? '');

  return [
    authority ? { entityType: 'authority', label: authority, relationType: 'issued_under' } : null,
    issuer ? { entityType: 'person', label: issuer, relationType: 'issued_by' } : null,
    mint ? { entityType: 'mint', label: mint, relationType: 'minted_at' } : null,
  ]
    .filter((entry): entry is { entityType: string; label: string; relationType: string } => entry != null)
    .filter((entry) => !isPlaceholderEntityLabel(entry.label));
}

function countFirebaseSnapshot(snapshot: FirebaseArchiveSnapshot): CountSnapshot {
  const conceptuals = new Set<string>();
  const tags = new Set<string>();
  const entities = new Set<string>();
  const recordTags = new Set<string>();
  const recordEntities = new Set<string>();
  const references = new Set<string>();
  let mediaAssets = 0;
  let privateProfiles = 0;

  snapshot.items.forEach((item) => {
    const conceptCanonicalId = buildConceptCanonicalId(snapshot, item);
    conceptuals.add(conceptCanonicalId);

    const mediaSet = new Set<string>();
    if (item.primaryMedia?.storagePath || item.primaryMedia?.gsUrl) {
      mediaSet.add(item.primaryMedia.storagePath ?? item.primaryMedia.gsUrl ?? '');
    }
    (item.gallery ?? []).forEach((media) => {
      if (media.storagePath || media.gsUrl) {
        mediaSet.add(media.storagePath ?? media.gsUrl ?? '');
      }
    });
    mediaAssets += mediaSet.size;

    const publicTags = buildPublicTags(snapshot, item);
    publicTags.forEach((tag) => {
      const tagCanonicalId = `ahg:tag:${slugifyTag(tag)}`;
      tags.add(tagCanonicalId);
      recordTags.add(`item:${item.id}:${tagCanonicalId}`);
    });

    buildEntityCandidates(snapshot, item).forEach((entity) => {
      const entityCanonicalId = `ahg:entity:${entity.entityType}:${slugifyTag(entity.label)}`;
      entities.add(entityCanonicalId);
      recordEntities.add(`conceptual_item:${conceptCanonicalId}:${entityCanonicalId}:${entity.relationType}`);
    });

    if (item.metadata?.seriesOrCatalog) {
      references.add(`conceptual_item:${conceptCanonicalId}:catalogue:legacy:${item.metadata.seriesOrCatalog}`);
    }

    if (item.privateProfile && (item.privateProfile.ownerUserId || item.privateProfile.owner_user_id)) {
      privateProfiles += 1;
    }
  });

  return {
    collections: 1,
    conceptual_items: conceptuals.size,
    items: snapshot.items.length,
    media_assets: mediaAssets,
    tags: tags.size,
    record_tags: recordTags.size,
    entities: entities.size,
    record_entities: recordEntities.size,
    record_references: references.size,
    numismatic_type_profiles: conceptuals.size,
    numismatic_item_profiles: snapshot.items.length,
    item_private_profiles: privateProfiles,
  };
}

export function compareCollectionCounts(firebaseCounts: CountMap, supabaseCounts: CountMap) {
  const mismatches: CountMismatch[] = [];
  const keys = new Set([...Object.keys(firebaseCounts), ...Object.keys(supabaseCounts)]);

  for (const collectionSlug of keys) {
    const firebase = firebaseCounts[collectionSlug] ?? {};
    const supabase = supabaseCounts[collectionSlug] ?? {};
    const metrics = new Set([...Object.keys(firebase), ...Object.keys(supabase)]);

    for (const metric of metrics) {
      if (!STRICT_MATCH_METRICS.has(metric)) {
        continue;
      }
      const firebaseValue = Number(firebase[metric] ?? 0);
      const supabaseValue = Number(supabase[metric] ?? 0);
      if (firebaseValue !== supabaseValue) {
        mismatches.push({ collectionSlug, metric, firebase: firebaseValue, supabase: supabaseValue });
      }
    }
  }

  return mismatches.sort((left, right) => left.collectionSlug.localeCompare(right.collectionSlug) || left.metric.localeCompare(right.metric));
}

function getSupabaseCredentials() {
  return {
    url: process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '',
    key: process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE ?? '',
  };
}

function hasSupabaseEnv() {
  const { url, key } = getSupabaseCredentials();
  return Boolean(url && key);
}

async function supabaseRequest<T>(table: string, query?: Record<string, string | number | boolean | null | undefined>) {
  const { url, key } = getSupabaseCredentials();
  if (!url || !key) return [] as T[];

  const requestUrl = new URL(`${url}/rest/v1/${table}`);
  Object.entries(query ?? {}).forEach(([queryKey, queryValue]) => {
    if (queryValue != null) requestUrl.searchParams.set(queryKey, String(queryValue));
  });

  const response = await fetch(requestUrl.toString(), {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase select failed for ${table}: ${response.status} ${response.statusText}`);
  }

  return await response.json() as T[];
}

function chunkValues<T>(values: T[], size = 150) {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

async function supabaseRequestByIds<T>(
  table: string,
  idColumn: string,
  ids: string[],
  query?: Record<string, string | number | boolean | null | undefined>,
) {
  if (ids.length === 0) return [] as T[];

  const results: T[] = [];
  for (const chunk of chunkValues(ids)) {
    const rows = await supabaseRequest<T>(table, {
      ...(query ?? {}),
      [idColumn]: `in.(${chunk.join(',')})`,
    });
    results.push(...rows);
  }
  return results;
}

async function countSupabaseCollection(slug: string): Promise<CountSnapshot> {
  const collectionRows = await supabaseRequest<{ id: string }>('collections', {
    select: 'id',
    slug: `eq.${slug}`,
    limit: 1,
  });
  const collectionId = collectionRows[0]?.id;
  if (!collectionId) {
    return {
      collections: 0,
      conceptual_items: 0,
      items: 0,
      media_assets: 0,
      tags: 0,
      record_tags: 0,
      entities: 0,
      record_entities: 0,
      record_references: 0,
      numismatic_type_profiles: 0,
      numismatic_item_profiles: 0,
      item_private_profiles: 0,
    };
  }

  const conceptualItems = await supabaseRequest<{ id: string }>('conceptual_items', {
    select: 'id',
    collection_id: `eq.${collectionId}`,
  });
  const conceptualIds = conceptualItems.map((row) => row.id);

  const items = await supabaseRequest<{ id: string }>('items', {
    select: 'id',
    collection_id: `eq.${collectionId}`,
  });
  const itemIds = items.map((row) => row.id);

  const [
    mediaAssets,
    recordTags,
    recordEntitiesForConcepts,
    recordReferences,
    numismaticTypeProfiles,
    numismaticItemProfiles,
    privateProfiles,
  ] = await Promise.all([
    supabaseRequestByIds<{ id: string }>('media_assets', 'target_id', itemIds, { select: 'id', target_kind: 'eq.item' }),
    supabaseRequestByIds<{ id: string }>('record_tags', 'record_id', itemIds, { select: 'id', record_kind: 'eq.item' }),
    supabaseRequestByIds<{ id: string }>('record_entities', 'record_id', conceptualIds, { select: 'id', record_kind: 'eq.conceptual_item' }),
    supabaseRequestByIds<{ id: string }>('record_references', 'record_id', conceptualIds, { select: 'id', record_kind: 'eq.conceptual_item' }),
    supabaseRequestByIds<{ conceptual_item_id: string }>('numismatic_type_profiles', 'conceptual_item_id', conceptualIds, { select: 'conceptual_item_id' }),
    supabaseRequestByIds<{ item_id: string }>('numismatic_item_profiles', 'item_id', itemIds, { select: 'item_id' }),
    supabaseRequestByIds<{ id: string }>('item_private_profiles', 'item_id', itemIds, { select: 'id' }),
  ]);

  return {
    collections: 1,
    conceptual_items: conceptualItems.length,
    items: items.length,
    media_assets: mediaAssets.length,
    tags: 0,
    record_tags: recordTags.length,
    entities: 0,
    record_entities: recordEntitiesForConcepts.length,
    record_references: recordReferences.length,
    numismatic_type_profiles: numismaticTypeProfiles.length,
    numismatic_item_profiles: numismaticItemProfiles.length,
    item_private_profiles: privateProfiles.length,
  };
}

async function buildFirebaseCounts(snapshotFiles: string[]) {
  const counts: CountMap = {
    __all__: {
      collections: 0,
      conceptual_items: 0,
      items: 0,
      media_assets: 0,
      tags: 0,
      record_tags: 0,
      entities: 0,
      record_entities: 0,
      record_references: 0,
      numismatic_type_profiles: 0,
      numismatic_item_profiles: 0,
      item_private_profiles: 0,
    },
  };
  const globalTags = new Set<string>();
  const globalEntities = new Set<string>();

  for (const filePath of snapshotFiles) {
    const snapshot = parseSnapshotFile(filePath);
    const collectionCounts = countFirebaseSnapshot(snapshot);
    counts[snapshot.collection.slug] = collectionCounts;
    Object.entries(collectionCounts).forEach(([metric, value]) => {
      counts.__all__[metric] = Number(counts.__all__[metric] ?? 0) + value;
    });

    snapshot.items.forEach((item) => {
      buildPublicTags(snapshot, item).forEach((tag) => globalTags.add(`ahg:tag:${slugifyTag(tag)}`));
      buildEntityCandidates(snapshot, item).forEach((entity) => globalEntities.add(`ahg:entity:${entity.entityType}:${slugifyTag(entity.label)}`));
    });
  }

  counts.__all__.tags = globalTags.size;
  counts.__all__.entities = globalEntities.size;
  return counts;
}

async function buildSupabaseCounts(snapshotFiles: string[]) {
  const counts: CountMap = {
    __all__: {
      collections: 0,
      conceptual_items: 0,
      items: 0,
      media_assets: 0,
      tags: 0,
      record_tags: 0,
      entities: 0,
      record_entities: 0,
      record_references: 0,
      numismatic_type_profiles: 0,
      numismatic_item_profiles: 0,
      item_private_profiles: 0,
    },
  };

  if (!hasSupabaseEnv()) {
    for (const filePath of snapshotFiles) {
      const snapshot = parseSnapshotFile(filePath);
      counts[snapshot.collection.slug] = { ...counts.__all__ };
    }
    return counts;
  }

  for (const filePath of snapshotFiles) {
    const snapshot = parseSnapshotFile(filePath);
    const slugCounts = await countSupabaseCollection(snapshot.collection.slug);
    counts[snapshot.collection.slug] = slugCounts;
    Object.entries(slugCounts).forEach(([metric, value]) => {
      counts.__all__[metric] = Number(counts.__all__[metric] ?? 0) + value;
    });
  }

  const [tags, entities] = await Promise.all([
    supabaseRequest<{ id: string }>('tags', { select: 'id', source_kind: 'eq.firebase-archive' }),
    supabaseRequest<{ id: string }>('entities', { select: 'id', 'attributes->>source': 'eq.firebase-archive' }),
  ]);

  counts.__all__.tags = tags.length;
  counts.__all__.entities = entities.length;
  return counts;
}

export async function runArchiveVerification({
  target,
  snapshotFiles,
}: {
  target?: string;
  snapshotFiles?: string[];
} = {}) {
  loadWorkspaceEnv(projectRoot);
  const files = snapshotFiles ?? materializeCanonicalArchiveSnapshots(
    resolveArchiveSnapshotPaths({ target, projectRoot }),
    { projectRoot },
  ).map((entry) => entry.filePath);
  if (files.length === 0) {
    throw new Error(`No Firebase archive snapshots found under ${defaultSnapshotDir}.`);
  }

  const firebaseCounts = await buildFirebaseCounts(files);
  const supabaseCounts = await buildSupabaseCounts(files);
  const mismatches = hasSupabaseEnv() ? compareCollectionCounts(firebaseCounts, supabaseCounts) : [];

  return {
    checkedAt: new Date().toISOString(),
    hasSupabaseEnv: hasSupabaseEnv(),
    snapshotFiles: files,
    firebaseCounts,
    supabaseCounts,
    mismatches,
  };
}

async function main() {
  const result = await runArchiveVerification({ target: process.argv[2] });
  console.log(JSON.stringify(result, null, 2));
  if (result.hasSupabaseEnv && result.mismatches.length > 0) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    if (error instanceof Error) {
      console.error(JSON.stringify({ name: error.name, message: error.message, stack: error.stack }, null, 2));
    } else {
      console.error(String(error));
    }
    process.exitCode = 1;
  });
}
