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
});
