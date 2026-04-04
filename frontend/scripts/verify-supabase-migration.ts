import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { buildCanonicalTags, canonicalizeAuthority, canonicalizeMint, canonicalizeRulerOrIssuer, slugifyTag } from '../src/shared/lib/catalogNormalization';

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

function resolveSnapshotFiles(target?: string) {
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

function parseSnapshotFile(filePath: string) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as FirebaseArchiveSnapshot;
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

function buildEntityKeys(snapshot: FirebaseArchiveSnapshot, item: FirebaseArchiveSnapshot['items'][number]) {
  return uniqueStrings([
    canonicalizeAuthority(snapshot.collection.culture ?? item.culture),
    canonicalizeRulerOrIssuer(item.metadata?.rulerOrIssuer),
    canonicalizeMint(item.metadata?.mintOrPlace ?? item.location),
  ]);
}

function countFirebaseSnapshot(snapshot: FirebaseArchiveSnapshot): CountSnapshot {
  const conceptuals = new Set<string>();
  const tags = new Set<string>();
  const entities = new Set<string>();
  let mediaAssets = 0;
  let recordTags = 0;
  let recordEntities = 0;
  let references = 0;
  let privateProfiles = 0;

  snapshot.items.forEach((item) => {
    conceptuals.add(
      slugifyTag([
        canonicalizeAuthority(snapshot.collection.culture ?? item.culture ?? '') || 'unknown-authority',
        canonicalizeRulerOrIssuer(item.metadata?.rulerOrIssuer ?? '') || 'unknown-issuer',
        item.metadata?.denomination ?? 'unknown-denomination',
        canonicalizeMint(item.metadata?.mintOrPlace ?? item.location ?? '') || 'unknown-mint',
      ].join(' ')),
    );

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
    publicTags.forEach((tag) => tags.add(`ahg:tag:${slugifyTag(tag)}`));
    recordTags += publicTags.length;

    const entityKeys = buildEntityKeys(snapshot, item);
    entityKeys.forEach((key) => entities.add(key));
    recordEntities += entityKeys.length;

    if (item.metadata?.seriesOrCatalog) {
      references += 1;
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
    record_tags: recordTags,
    entities: entities.size,
    record_entities: recordEntities,
    record_references: references,
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
  const conceptualIn = conceptualIds.length ? `in.(${conceptualIds.join(',')})` : null;

  const items = await supabaseRequest<{ id: string }>('items', {
    select: 'id',
    collection_id: `eq.${collectionId}`,
  });
  const itemIds = items.map((row) => row.id);
  const itemIn = itemIds.length ? `in.(${itemIds.join(',')})` : null;

  const [
    mediaAssets,
    recordTags,
    recordEntitiesForConcepts,
    recordReferences,
    numismaticTypeProfiles,
    numismaticItemProfiles,
    privateProfiles,
  ] = await Promise.all([
    itemIn ? supabaseRequest<{ id: string }>('media_assets', { select: 'id', target_kind: 'eq.item', target_id: itemIn }) : Promise.resolve([]),
    itemIn ? supabaseRequest<{ id: string }>('record_tags', { select: 'id', record_kind: 'eq.item', record_id: itemIn }) : Promise.resolve([]),
    conceptualIn ? supabaseRequest<{ id: string }>('record_entities', { select: 'id', record_kind: 'eq.conceptual_item', record_id: conceptualIn }) : Promise.resolve([]),
    conceptualIn ? supabaseRequest<{ id: string }>('record_references', { select: 'id', record_kind: 'eq.conceptual_item', record_id: conceptualIn }) : Promise.resolve([]),
    conceptualIn ? supabaseRequest<{ conceptual_item_id: string }>('numismatic_type_profiles', { select: 'conceptual_item_id', conceptual_item_id: conceptualIn }) : Promise.resolve([]),
    itemIn ? supabaseRequest<{ item_id: string }>('numismatic_item_profiles', { select: 'item_id', item_id: itemIn }) : Promise.resolve([]),
    itemIn ? supabaseRequest<{ id: string }>('item_private_profiles', { select: 'id', item_id: itemIn }) : Promise.resolve([]),
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
      buildEntityKeys(snapshot, item).forEach((key) => globalEntities.add(key));
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

async function main() {
  loadLocalEnvFile();
  const snapshotFiles = resolveSnapshotFiles(process.argv[2]);
  if (snapshotFiles.length === 0) {
    throw new Error(`No Firebase archive snapshots found under ${defaultSnapshotDir}.`);
  }

  const firebaseCounts = await buildFirebaseCounts(snapshotFiles);
  const supabaseCounts = await buildSupabaseCounts(snapshotFiles);
  const mismatches = hasSupabaseEnv() ? compareCollectionCounts(firebaseCounts, supabaseCounts) : [];

  console.log(JSON.stringify({
    checkedAt: new Date().toISOString(),
    hasSupabaseEnv: hasSupabaseEnv(),
    snapshotFiles,
    firebaseCounts,
    supabaseCounts,
    mismatches,
  }, null, 2));

  if (hasSupabaseEnv() && mismatches.length > 0) {
    process.exitCode = 1;
  }
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
