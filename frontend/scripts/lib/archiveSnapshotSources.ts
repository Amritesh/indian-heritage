import fs from 'node:fs';
import path from 'node:path';
import { collectionRegistry } from '../../src/shared/config/collections';
import { normalizePairedOutputCatalogue } from './archiveSnapshot';
import { shouldSkipLegacyPlaceholderSnapshot } from './snapshotFiltering';

type SnapshotWithCollection = {
  collection?: {
    slug?: string;
  };
  items?: Array<Record<string, unknown> & {
    title?: string;
  }>;
};

export type ResolvedArchiveSnapshot = {
  collectionSlug: string;
  filePath: string;
};

type ResolveArchiveSnapshotPathsOptions = {
  projectRoot?: string;
  candidateDirs?: string[];
  collectionSlugs?: string[];
  target?: string;
};

function isFirebaseArchiveSnapshot(value: unknown): value is SnapshotWithCollection {
  return value !== null
    && typeof value === 'object'
    && !Array.isArray(value)
    && typeof (value as SnapshotWithCollection).collection?.slug === 'string'
    && Array.isArray((value as SnapshotWithCollection).items);
}

function readJson(filePath: string) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
}

function shouldIncludeSnapshot(filePath: string, filePaths: string[]) {
  const parsed = readJson(filePath);
  if (!isFirebaseArchiveSnapshot(parsed)) return true;
  return !shouldSkipLegacyPlaceholderSnapshot(filePath, parsed, filePaths);
}

function filterSnapshotFilePaths(filePaths: string[]) {
  return filePaths.filter((filePath) => shouldIncludeSnapshot(filePath, filePaths));
}

function resolveCandidateDirs(projectRoot = process.cwd()) {
  return [
    path.resolve(projectRoot, 'backend-support', 'snapshots', 'firebase-archive'),
    path.resolve(projectRoot, 'temp', 'data'),
  ];
}

function getCanonicalSnapshotDir(projectRoot = process.cwd()) {
  return path.resolve(projectRoot, 'backend-support', 'snapshots', 'firebase-archive');
}

function inferCollectionSlugFromFile(filePath: string) {
  try {
    const parsed = readJson(filePath);
    if (isFirebaseArchiveSnapshot(parsed) && parsed.collection?.slug) {
      return parsed.collection.slug;
    }
  } catch {
    // fall back to filename-based inference
  }

  return path.basename(filePath, path.extname(filePath));
}

function resolveSnapshotForSlug(collectionSlug: string, candidateDirs: string[]) {
  for (const candidateDir of candidateDirs) {
    const filePath = path.join(candidateDir, `${collectionSlug}.json`);
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) continue;
    if (!shouldIncludeSnapshot(filePath, [filePath])) continue;
    return filePath;
  }

  return null;
}

function resolveFreshOutputForSlug(collectionSlug: string, projectRoot = process.cwd()) {
  const candidates = [
    path.resolve(projectRoot, 'temp', 'data', `${collectionSlug}.json`),
    path.resolve(projectRoot, 'temp', 'images', collectionSlug, 'paired_output', 'catalogue_all.json'),
  ];

  return candidates.find((filePath) => fs.existsSync(filePath) && fs.statSync(filePath).isFile()) ?? null;
}

function resolveTargetInput(target: string, candidateDirs: string[]) {
  const resolved = path.resolve(process.cwd(), target);
  if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
    return [{
      collectionSlug: inferCollectionSlugFromFile(resolved),
      filePath: resolved,
    }];
  }

  if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
    const filePaths = filterSnapshotFilePaths(
      fs.readdirSync(resolved)
        .filter((entry) => entry.endsWith('.json'))
        .sort()
        .map((entry) => path.join(resolved, entry)),
    );
    return filePaths.map((filePath) => ({
      collectionSlug: inferCollectionSlugFromFile(filePath),
      filePath,
    }));
  }

  const projectRoot = path.resolve(candidateDirs[0] ?? process.cwd(), '../../..');
  const filePath = resolveFreshOutputForSlug(target, projectRoot) ?? resolveSnapshotForSlug(target, candidateDirs);
  return filePath
    ? [{ collectionSlug: target, filePath }]
    : [];
}

export function resolveArchiveSnapshotPaths(options: ResolveArchiveSnapshotPathsOptions = {}) {
  const candidateDirs = options.candidateDirs ?? resolveCandidateDirs(options.projectRoot);

  if (options.target) {
    return resolveTargetInput(options.target, candidateDirs);
  }

  const collectionSlugs = options.collectionSlugs?.length
    ? options.collectionSlugs
    : collectionRegistry.filter((entry) => entry.enabled).map((entry) => entry.slug);

  const resolved = collectionSlugs.map((collectionSlug) => {
    const filePath = resolveSnapshotForSlug(collectionSlug, candidateDirs);
    if (!filePath) {
      throw new Error(`No archive snapshot found for collection "${collectionSlug}".`);
    }

    return { collectionSlug, filePath };
  });

  return resolved;
}

export function materializeCanonicalArchiveSnapshots(
  snapshots: ResolvedArchiveSnapshot[],
  options: { projectRoot?: string; collectionSlugOverride?: string } = {},
) {
  const canonicalSnapshotDir = getCanonicalSnapshotDir(options.projectRoot);
  fs.mkdirSync(canonicalSnapshotDir, { recursive: true });

  return snapshots.map((snapshot) => {
    const collectionSlug = options.collectionSlugOverride ?? snapshot.collectionSlug;
    if (path.dirname(snapshot.filePath) === canonicalSnapshotDir && collectionSlug === snapshot.collectionSlug) {
      return snapshot;
    }

    const parsed = readJson(snapshot.filePath);
    const normalized = isFirebaseArchiveSnapshot(parsed)
      ? {
          ...parsed,
          collection: {
            ...parsed.collection,
            slug: collectionSlug,
          },
        }
      : normalizePairedOutputCatalogue(parsed, {
          collectionSlug,
          sourcePath: snapshot.filePath,
        });

    const canonicalPath = path.join(canonicalSnapshotDir, `${collectionSlug}.json`);
    fs.writeFileSync(canonicalPath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');

    return {
      collectionSlug,
      filePath: canonicalPath,
    };
  });
}
