import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdminImportPage } from './AdminImportPage';

const mocks = vi.hoisted(() => ({
  getLatestIngestRun: vi.fn(),
  getAllCollectionsAdmin: vi.fn(),
}));

vi.mock('@/entities/ingest/api/ingestProgressService', () => ({
  getLatestIngestRun: mocks.getLatestIngestRun,
}));

vi.mock('@/entities/collection/api/collectionAdminService', () => ({
  getAllCollectionsAdmin: mocks.getAllCollectionsAdmin,
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
      <AdminImportPage />
    </QueryClientProvider>,
  );
}

describe('AdminImportPage', () => {
  it('shows the princely-states batch command and latest ingest progress', async () => {
    mocks.getAllCollectionsAdmin.mockResolvedValue([]);
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
      pages: [
        {
          sourceBatch: 'princeley-states-1-1',
          pageNumber: 5,
          status: 'completed',
          itemsUploaded: 4,
          error: '',
          startedAt: '2026-04-01T10:00:00.000Z',
          updatedAt: '2026-04-01T10:10:00.000Z',
          sourcePagePath: '/temp/images/princeley-states-1-1/page-5.png',
        },
        {
          sourceBatch: 'indian-princely-states-2-2',
          pageNumber: 12,
          status: 'failed',
          itemsUploaded: 0,
          error: 'OCR failed',
          startedAt: '2026-04-01T10:15:00.000Z',
          updatedAt: '2026-04-01T10:16:00.000Z',
          sourcePagePath: '/temp/images/indian-princely-states-2-2/page-12.png',
        },
      ],
    });

    renderPage();

    expect(await screen.findByText(/coin_cataloguer\.batch_ingest/)).toBeTruthy();
    expect(await screen.findByText(/10 completed pages/i)).toBeTruthy();
    expect(
      screen.getByText((_, element) => element?.textContent === 'Current status: running'),
    ).toBeTruthy();
    expect(screen.getByText(/1 failed/i)).toBeTruthy();
    expect(screen.getByText(/page 12/i)).toBeTruthy();
    expect(screen.getByText(/ocr failed/i)).toBeTruthy();
  });
});
