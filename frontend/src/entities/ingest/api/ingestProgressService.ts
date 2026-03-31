import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { getFirestoreOrThrow } from '@/shared/services/firestore';
import {
  IngestPageProgress,
  IngestPageStatus,
  IngestRunRecord,
  IngestRunSummary,
} from '@/entities/ingest/model/types';

export const INGEST_RUNS_COLLECTION = 'ingest_runs';

function readString(data: Record<string, unknown>, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  return fallback;
}

function readNumber(data: Record<string, unknown>, keys: string[], fallback = 0): number {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }

  return fallback;
}

function readStatus(value: unknown): IngestPageStatus {
  if (value === 'running' || value === 'completed' || value === 'failed' || value === 'pending') {
    return value;
  }

  return 'pending';
}

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function mapSummary(data: Record<string, unknown>): IngestRunSummary {
  return {
    totalPages: readNumber(data, ['totalPages', 'total_pages']),
    completedPages: readNumber(data, ['completedPages', 'completed_pages']),
    failedPages: readNumber(data, ['failedPages', 'failed_pages']),
    runningPages: readNumber(data, ['runningPages', 'running_pages']),
  };
}

function mapPageProgress(value: unknown): IngestPageProgress {
  const data = toRecord(value);

  return {
    sourceBatch: readString(data, ['sourceBatch', 'source_batch']),
    pageNumber: readNumber(data, ['pageNumber', 'page_number']),
    status: readStatus(data.status),
    itemsUploaded: readNumber(data, ['itemsUploaded', 'items_uploaded']),
    error: readString(data, ['error']),
    startedAt: readString(data, ['startedAt', 'started_at']),
    updatedAt: readString(data, ['updatedAt', 'updated_at']),
    sourcePagePath: readString(data, ['sourcePagePath', 'source_page_path']),
  };
}

function mapPages(value: unknown): IngestPageProgress[] {
  if (Array.isArray(value)) {
    return value.map(mapPageProgress);
  }

  if (typeof value === 'object' && value !== null) {
    return Object.values(value as Record<string, unknown>).map(mapPageProgress);
  }

  return [];
}

export function mapIngestRun(data: Record<string, unknown>): IngestRunRecord {
  return {
    id: readString(data, ['id']),
    collectionSlug: readString(data, ['collectionSlug', 'collection_slug']),
    status: readString(data, ['status'], 'unknown'),
    startedAt: readString(data, ['startedAt', 'started_at']),
    updatedAt: readString(data, ['updatedAt', 'updated_at']),
    summary: mapSummary(toRecord(data.summary)),
    pages: mapPages(data.pages).sort((left, right) => {
      if (left.pageNumber !== right.pageNumber) {
        return left.pageNumber - right.pageNumber;
      }

      return left.sourceBatch.localeCompare(right.sourceBatch);
    }),
  };
}

export async function getLatestIngestRun(collectionSlug: string): Promise<IngestRunRecord | null> {
  const db = getFirestoreOrThrow();
  const snapshot = await getDocs(
    query(
      collection(db, INGEST_RUNS_COLLECTION),
      where('collectionSlug', '==', collectionSlug),
      orderBy('updatedAt', 'desc'),
      limit(1),
    ),
  );

  if (snapshot.empty) {
    return null;
  }

  return mapIngestRun(snapshot.docs[0].data() as Record<string, unknown>);
}
