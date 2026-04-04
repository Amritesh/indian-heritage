import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { collectionRegistry, getCollectionRegistryEntry } from '../src/shared/config/collections';
import { buildFirebaseMediaUrl, parseGsUrl } from '../src/shared/lib/storage';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');
const tempDataDir = path.resolve(projectRoot, 'temp', 'data');
const snapshotDir = path.resolve(projectRoot, 'backend-support', 'snapshots', 'firebase-archive');

type LegacyItem = {
  id?: string;
  page?: number;
  title?: string;
  period?: string | null;
  region?: string | null;
  materials?: string[];
  image?: string;
  notes?: string[];
  display_labels?: string[];
  description?: string;
  metadata?: Record<string, unknown>;
};

type LegacyCollectionDetail = {
  album_title?: string;
  items?: LegacyItem[];
};

type LegacyCollectionMeta = {
  id: string;
  title?: string;
  description?: string | null;
  image?: string;
  itemCount?: number;
};

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((entry) => asString(entry)).filter(Boolean)
    : [];
}

function resolveCollectionMeta(sourceId: string) {
  const collectionsPath = path.join(tempDataDir, 'collections.json');
  const payload = readJson<{ collections?: LegacyCollectionMeta[] }>(collectionsPath);
  const entry = payload.collections?.find((candidate) => candidate.id === sourceId);
  return entry ?? null;
}

function normalizeItem(collectionSlug: string, collectionName: string, item: LegacyItem) {
  const metadata = item.metadata ?? {};
  const gsUrl = asString(item.image);
  const parsedGs = parseGsUrl(gsUrl);
  const storagePath = parsedGs?.path ?? '';
  const publicUrl = gsUrl ? buildFirebaseMediaUrl(gsUrl) : '';
  const ruler = asString(metadata.ruler_or_issuer ?? metadata.rulerOrIssuer);
  const mint = asString(metadata.mint_or_place ?? metadata.mintOrPlace);
  const denomination = asString(metadata.denomination);
  const material = asString(metadata.material);
  const tags = [
    ...new Set([
      ...asStringArray(item.materials),
      ...asStringArray(item.display_labels),
      ruler,
      mint,
      denomination,
      material,
      collectionName,
    ].filter(Boolean)),
  ];

  return {
    id: asString(item.id),
    title: asString(item.title, 'Untitled Item'),
    period: asString(item.period),
    location: asString(item.region),
    description: asString(item.description),
    notes: asStringArray(item.notes),
    materials: asStringArray(item.materials),
    pageNumber: typeof item.page === 'number' ? item.page : null,
    imageUrl: publicUrl || undefined,
    primaryMedia: gsUrl
      ? {
        gsUrl,
        storagePath,
        downloadUrl: publicUrl || undefined,
        alt: asString(item.title, 'Archive item'),
        caption: asString(item.description),
      }
      : null,
    gallery: gsUrl
      ? [{
        gsUrl,
        storagePath,
        downloadUrl: publicUrl || undefined,
        alt: asString(item.title, 'Archive item'),
        caption: asString(item.description),
      }]
      : [],
    metadata: {
      type: asString(metadata.type, 'coin'),
      rulerOrIssuer: ruler,
      yearOrPeriod: asString(metadata.year_or_period ?? metadata.yearOrPeriod ?? item.period),
      mintOrPlace: mint,
      denomination,
      seriesOrCatalog: asString(metadata.series_or_catalog ?? metadata.seriesOrCatalog),
      material: material || asStringArray(item.materials)[0] || '',
      condition: asString(metadata.condition),
      weightEstimate: asString(metadata.weight_estimate ?? metadata.weightEstimate),
      estimatedPriceInr: asString(metadata.estimated_price_inr ?? metadata.estimatedPriceInr),
      confidence: asString(metadata.confidence),
    },
    tags,
    publicTags: tags,
    sourceRawRef: `${collectionSlug}:${asString(item.id)}`,
    collectionSlug,
    collectionName,
    importedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    published: true,
    sortTitle: asString(item.title, 'Untitled Item').toLowerCase(),
    shortDescription: asString(item.description).slice(0, 180),
    subtitle: ruler || null,
  };
}

function buildSnapshot(sourceId: string, slugOverride?: string) {
  const detailPath = path.join(tempDataDir, `${sourceId}.json`);
  if (!fs.existsSync(detailPath)) {
    throw new Error(`Local collection detail not found: ${detailPath}`);
  }

  const detail = readJson<LegacyCollectionDetail>(detailPath);
  const registryEntry = (slugOverride ? getCollectionRegistryEntry(slugOverride) : null)
    ?? getCollectionRegistryEntry(sourceId)
    ?? collectionRegistry.find((entry) => entry.id === sourceId);
  const meta = resolveCollectionMeta(sourceId);
  const slug = slugOverride || registryEntry?.slug || sourceId;
  const name = registryEntry?.name || meta?.title || detail.album_title || sourceId;
  const items = (detail.items ?? []).map((item) => normalizeItem(slug, name, item));

  return {
    exportedAt: new Date().toISOString(),
    source: 'firebase-firestore' as const,
    collection: {
      id: slug,
      slug,
      name,
      displayName: name,
      description: registryEntry?.description || asString(meta?.description, `Imported ${name} collection`),
      longDescription: registryEntry?.longDescription || registryEntry?.description || asString(meta?.description),
      culture: registryEntry?.culture || 'Colonial and European India',
      periodLabel: registryEntry?.periodLabel || 'Pre-Independence India',
      heroImage: asString(meta?.image),
      sortOrder: registryEntry?.order ?? 0,
      enabled: true,
    },
    items,
    counts: {
      items: items.length,
      publishedItems: items.length,
    },
  };
}

function main() {
  const sourceId = process.argv[2];
  const slugOverride = process.argv[3];
  if (!sourceId) {
    throw new Error('Usage: tsx scripts/build-local-archive-snapshot.ts <source-collection-id> [archive-slug]');
  }

  const snapshot = buildSnapshot(sourceId, slugOverride);
  fs.mkdirSync(snapshotDir, { recursive: true });
  const targetPath = path.join(snapshotDir, `${snapshot.collection.slug}.json`);
  fs.writeFileSync(targetPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    builtAt: new Date().toISOString(),
    sourceId,
    slug: snapshot.collection.slug,
    targetPath,
    items: snapshot.counts.items,
  }, null, 2));
}

if (import.meta.url === `file://${__filename}`) {
  try {
    main();
  } catch (error) {
    if (error instanceof Error) {
      console.error(JSON.stringify({ name: error.name, message: error.message, stack: error.stack }, null, 2));
    } else {
      console.error(String(error));
    }
    process.exitCode = 1;
  }
}
