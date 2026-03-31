export type IngestPageStatus = 'pending' | 'running' | 'completed' | 'failed';

export type IngestRunSummary = {
  totalPages: number;
  completedPages: number;
  failedPages: number;
  runningPages: number;
};

export type IngestPageProgress = {
  sourceBatch: string;
  pageNumber: number;
  status: IngestPageStatus;
  itemsUploaded: number;
  error: string;
  startedAt: string;
  updatedAt: string;
  sourcePagePath: string;
};

export type IngestRunRecord = {
  id: string;
  collectionSlug: string;
  status: string;
  startedAt: string;
  updatedAt: string;
  summary: IngestRunSummary;
  pages: IngestPageProgress[];
};
