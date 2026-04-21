import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveArchiveSnapshotPaths } from './archiveSnapshotSources';

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

describe('resolveArchiveSnapshotPaths', () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    tempRoots.splice(0).forEach((root) => {
      fs.rmSync(root, { recursive: true, force: true });
    });
  });

  it('prefers exact snapshot files and falls back to temp data for missing archive snapshots', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ahg-snapshot-sources-'));
    tempRoots.push(root);

    const archiveDir = path.join(root, 'backend-support', 'snapshots', 'firebase-archive');
    const tempDataDir = path.join(root, 'temp', 'data');

    writeJson(path.join(archiveDir, 'mughals.json'), {
      exportedAt: '2026-04-19T00:00:00.000Z',
      source: 'firebase-firestore',
      collection: {
        slug: 'mughals',
      },
      items: [],
    });

    writeJson(path.join(tempDataDir, 'early-coinage.json'), {
      album_title: 'Early Coinage',
      items: [],
    });

    const resolved = resolveArchiveSnapshotPaths({
      collectionSlugs: ['mughals', 'early-coinage'],
      candidateDirs: [archiveDir, tempDataDir],
    });

    expect(resolved).toEqual([
      {
        collectionSlug: 'mughals',
        filePath: path.join(archiveDir, 'mughals.json'),
      },
      {
        collectionSlug: 'early-coinage',
        filePath: path.join(tempDataDir, 'early-coinage.json'),
      },
    ]);
  });

  it('resolves paired output catalogues by collection slug', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ahg-snapshot-sources-'));
    tempRoots.push(root);

    const pairedOutputDir = path.join(root, 'temp', 'images', 'regular-1-1', 'paired_output');
    writeJson(path.join(pairedOutputDir, 'catalogue_all.json'), []);

    const resolved = resolveArchiveSnapshotPaths({
      target: 'regular-1-1',
      projectRoot: root,
    });

    expect(resolved).toEqual([
      {
        collectionSlug: 'regular-1-1',
        filePath: path.join(pairedOutputDir, 'catalogue_all.json'),
      },
    ]);
  });

  it('can materialize a source batch under a different collection slug', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ahg-snapshot-sources-'));
    tempRoots.push(root);

    const sourceDir = path.join(root, 'temp', 'data');
    writeJson(path.join(sourceDir, 'regular-1-1.json'), {
      album_title: 'Regular 1 1',
      items: [],
    });

    const { materializeCanonicalArchiveSnapshots } = await import('./archiveSnapshotSources');
    const materialized = materializeCanonicalArchiveSnapshots(
      [{ collectionSlug: 'regular-1-1', filePath: path.join(sourceDir, 'regular-1-1.json') }],
      { projectRoot: root, collectionSlugOverride: 'regular' },
    );

    expect(materialized).toEqual([
      {
        collectionSlug: 'regular',
        filePath: path.join(root, 'backend-support', 'snapshots', 'firebase-archive', 'regular.json'),
      },
    ]);

    const snapshot = JSON.parse(fs.readFileSync(materialized[0].filePath, 'utf8'));
    expect(snapshot.collection.slug).toBe('regular');
  });
});
