import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/config/supabase', () => ({
  hasSupabaseEnv: true,
  supabaseConfig: {
    url: 'https://example.supabase.co',
    anonKey: 'anon-key',
  },
}));

import { supabaseSelect } from '@/shared/services/supabase';

describe('supabaseSelect', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('paginates across default 1000-row pages when no limit is provided', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => Array.from({ length: 1000 }, (_, index) => ({ id: `row-${index}` })),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 'row-1000' }, { id: 'row-1001' }],
      });
    vi.stubGlobal('fetch', fetchMock);

    const rows = await supabaseSelect<{ id: string }>('items', { select: 'id', review_status: 'eq.published' });

    expect(rows).toHaveLength(1002);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toContain('limit=1000');
    expect(fetchMock.mock.calls[0]?.[0]).toContain('offset=0');
    expect(fetchMock.mock.calls[1]?.[0]).toContain('offset=1000');
  });

  it('respects an explicit limit without auto-pagination', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: 'row-1' }],
    });
    vi.stubGlobal('fetch', fetchMock);

    const rows = await supabaseSelect<{ id: string }>('items', { select: 'id', limit: 5 });

    expect(rows).toEqual([{ id: 'row-1' }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toContain('limit=5');
    expect(fetchMock.mock.calls[0]?.[0]).not.toContain('offset=1000');
  });
});
