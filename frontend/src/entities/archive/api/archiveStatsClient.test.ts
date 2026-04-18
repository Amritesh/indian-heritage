import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getArchivePublicStatsFromApi } from '@/entities/archive/api/archiveStatsClient';

describe('archiveStatsClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('loads homepage archive stats from the backend api', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: 1240,
        collections: 5,
        materials: 9,
        totalWorth: 25000,
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(getArchivePublicStatsFromApi()).resolves.toEqual({
      items: 1240,
      collections: 5,
      materials: 9,
      totalWorth: 25000,
    });
    expect(fetchMock).toHaveBeenCalledWith('/api/archive-stats');
  });

  it('throws when the backend stats api responds with an error', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(getArchivePublicStatsFromApi()).rejects.toThrow(
      'Archive stats request failed (503)',
    );
  });
});
