import { beforeEach, describe, expect, it, vi } from 'vitest';

const getCollectionsFromSupabaseMock = vi.fn();
const getFirestoreOrThrowMock = vi.fn();

vi.mock('@/shared/config/supabase', () => ({
  hasSupabaseEnv: true,
}));

vi.mock('@/entities/collection/api/collectionService.supabase', () => ({
  getCollectionsFromSupabase: (...args: unknown[]) => getCollectionsFromSupabaseMock(...args),
}));

vi.mock('@/shared/services/firestore', () => ({
  getFirestoreOrThrow: (...args: unknown[]) => getFirestoreOrThrowMock(...args),
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  serverTimestamp: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
}));

import { getAllCollectionsAdmin } from './collectionAdminService';

describe('collectionAdminService', () => {
  beforeEach(() => {
    getCollectionsFromSupabaseMock.mockReset();
    getFirestoreOrThrowMock.mockReset();
  });

  it('uses Supabase collections for admin selectors when archive DB is configured', async () => {
    getCollectionsFromSupabaseMock.mockResolvedValue([
      {
        id: 'collection-regular',
        slug: 'regular-1-1',
        displayName: 'Regular 1-1',
        sortOrder: 7,
      },
    ]);

    await expect(getAllCollectionsAdmin()).resolves.toEqual([
      expect.objectContaining({
        slug: 'regular-1-1',
        displayName: 'Regular 1-1',
      }),
    ]);
    expect(getFirestoreOrThrowMock).not.toHaveBeenCalled();
  });
});
