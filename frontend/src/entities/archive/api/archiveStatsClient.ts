import type { ArchivePublicStats } from '@/entities/archive/api/archiveStatsService';

export async function getArchivePublicStatsFromApi(): Promise<ArchivePublicStats> {
  const response = await fetch('/api/archive-stats');
  if (!response.ok) {
    throw new Error(`Archive stats request failed (${response.status})`);
  }

  return (await response.json()) as ArchivePublicStats;
}
