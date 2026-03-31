import { describe, expect, it } from 'vitest';
import { mapIngestRun } from './ingestProgressService';

describe('mapIngestRun', () => {
  it('maps summary counts and page entries', () => {
    const run = mapIngestRun({
      id: 'run-1',
      collectionSlug: 'princely-states',
      status: 'running',
      summary: { totalPages: 25, completedPages: 10, failedPages: 1, runningPages: 1 },
      pages: [{ sourceBatch: 'princeley-states-1-1', pageNumber: 5, status: 'completed' }],
    });

    expect(run.collectionSlug).toBe('princely-states');
    expect(run.summary.completedPages).toBe(10);
    expect(run.pages[0].pageNumber).toBe(5);
  });
});
