import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { shouldSkipLegacyPlaceholderSnapshot } from './snapshotFiltering';

describe('shouldSkipLegacyPlaceholderSnapshot', () => {
  it('skips legacy placeholder snapshots when a curated sibling exists', () => {
    const filePath = '/tmp/indian-foreign-rulers-1-1.json';
    const siblingFilePaths = [
      '/tmp/indian-foreign-rulers-1-1.json',
      '/tmp/indian-foreign-rulers.json',
    ];

    const result = shouldSkipLegacyPlaceholderSnapshot(
      filePath,
      {
        collection: { slug: 'indian-foreign-rulers-1-1' },
        items: [
          { title: 'Item on Page 1' },
          { title: 'Item on Page 2' },
        ],
      },
      siblingFilePaths,
    );

    expect(result).toBe(true);
  });

  it('keeps curated snapshots even when names are similar', () => {
    const filePath = '/tmp/indian-foreign-rulers.json';
    const siblingFilePaths = [
      '/tmp/indian-foreign-rulers-1-1.json',
      '/tmp/indian-foreign-rulers.json',
    ];

    const result = shouldSkipLegacyPlaceholderSnapshot(
      filePath,
      {
        collection: { slug: 'indian-foreign-rulers' },
        items: [
          { title: '12 Reis - Portuguese India' },
        ],
      },
      siblingFilePaths,
    );

    expect(result).toBe(false);
  });

  it('keeps non-placeholder snapshots even if they match the numbered naming pattern', () => {
    const filePath = '/tmp/sample-1-1.json';
    const siblingFilePaths = ['/tmp/sample-1-1.json', '/tmp/sample.json'];

    const result = shouldSkipLegacyPlaceholderSnapshot(
      filePath,
      {
        collection: { slug: 'sample-1-1' },
        items: [
          { title: 'Akbar Rupee' },
        ],
      },
      siblingFilePaths,
    );

    expect(result).toBe(false);
  });
});
