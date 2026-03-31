import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdminDashboardPage } from './AdminDashboardPage';

const mocks = vi.hoisted(() => ({
  getCountFromServer: vi.fn(),
  getDocs: vi.fn(),
  getFirestoreOrThrow: vi.fn(),
  getLatestIngestRun: vi.fn(),
}));

vi.mock('@/entities/ingest/api/ingestProgressService', () => ({
  getLatestIngestRun: mocks.getLatestIngestRun,
}));

vi.mock('@/shared/services/firestore', () => ({
  getFirestoreOrThrow: mocks.getFirestoreOrThrow,
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  getCountFromServer: mocks.getCountFromServer,
  getDocs: mocks.getDocs,
  limit: vi.fn(() => ({})),
  orderBy: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  where: vi.fn(() => ({})),
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <AdminDashboardPage />
    </QueryClientProvider>,
  );
}

describe('AdminDashboardPage', () => {
  it('shows the latest ingest summary card', async () => {
    mocks.getFirestoreOrThrow.mockReturnValue({});
    mocks.getLatestIngestRun.mockResolvedValue({
      id: 'run-1',
      collectionSlug: 'princely-states',
      status: 'running',
      startedAt: '2026-04-01T10:00:00.000Z',
      updatedAt: '2026-04-01T10:30:00.000Z',
      summary: {
        totalPages: 25,
        completedPages: 10,
        failedPages: 1,
        runningPages: 1,
      },
      pages: [],
    });
    mocks.getCountFromServer.mockResolvedValue({
      data: () => ({ count: 12 }),
    });
    mocks.getDocs
      .mockResolvedValueOnce({
        docs: [
          {
            id: 'item-1',
            data: () => ({
              title: 'Mughal Coin',
              collectionName: 'Princely States',
              period: '1900',
            }),
          },
        ],
      })
      .mockResolvedValueOnce({
        docs: [
          {
            data: () => ({
              estimatedWorth: 500,
            }),
          },
        ],
      });

    renderPage();

    expect(await screen.findByText(/latest ingest/i)).toBeTruthy();
  });
});
