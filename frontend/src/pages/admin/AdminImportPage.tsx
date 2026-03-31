import { useQuery } from '@tanstack/react-query';
import { getLatestIngestRun } from '@/entities/ingest/api/ingestProgressService';

const BATCH_COMMAND = `cd /Users/amritesh/Desktop/code/AHG/backend
/Users/amritesh/.pyenv/versions/3.12.3/bin/python -m coin_cataloguer.batch_ingest \
  --images-root /Users/amritesh/Desktop/code/AHG/temp/images \
  --output-root /Users/amritesh/Desktop/code/AHG/temp/output/princely-states \
  --collection princely-states \
  --upload \
  --clear-first`;

export function AdminImportPage() {
  const { data: latestRun, isLoading } = useQuery({
    queryKey: ['admin', 'ingest-run', 'princely-states'],
    queryFn: () => getLatestIngestRun('princely-states'),
  });

  const failedPages = latestRun?.pages.filter((page) => page.status === 'failed').slice(0, 5) ?? [];

  return (
    <div className="space-y-8">
      <div>
        <span className="eyebrow">Tools</span>
        <h1 className="mt-2 font-headline text-3xl font-bold text-on-surface">Princely States Ingest</h1>
        <p className="mt-1 text-on-surface-variant">
          Track the current batch run and verify that princely-states data is landing before any public UI work starts.
        </p>
      </div>

      <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-8 space-y-5">
        <div className="flex items-center justify-between gap-4 border-b border-outline-variant/20 pb-4">
          <div>
            <h2 className="font-label text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Batch Command
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Run this exact command from the backend directory to ingest the current princely-states batch.
            </p>
          </div>
        </div>
        <pre className="overflow-x-auto rounded-lg border border-outline-variant/10 bg-surface-container-lowest px-4 py-3 font-mono text-sm text-on-surface-variant">
          {BATCH_COMMAND}
        </pre>
        <p className="text-sm text-on-surface-variant">
          Complete the data sync before starting any admin dashboard or public gallery redesign work.
        </p>
      </section>

      <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-8 space-y-6">
        <div className="flex items-start justify-between gap-4 border-b border-outline-variant/20 pb-4">
          <div>
            <h2 className="font-label text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Live Progress
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Latest run for <span className="font-semibold text-on-surface">princely-states</span>.
            </p>
          </div>
          <div className="rounded-full border border-outline-variant/10 bg-surface-container-low px-3 py-1 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
            {isLoading ? 'Loading…' : latestRun?.status ?? 'No run yet'}
          </div>
        </div>

        {latestRun ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl bg-surface-container-low/60 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-outline">Total Pages</p>
                <p className="mt-2 font-headline text-2xl font-bold text-on-surface tabular-nums">
                  {latestRun.summary.totalPages}
                </p>
              </div>
              <div className="rounded-xl bg-surface-container-low/60 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-outline">Completed</p>
                <p className="mt-2 font-headline text-2xl font-bold text-on-surface tabular-nums">
                  {latestRun.summary.completedPages} completed pages
                </p>
              </div>
              <div className="rounded-xl bg-surface-container-low/60 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-outline">Running</p>
                <p className="mt-2 font-headline text-2xl font-bold text-on-surface tabular-nums">
                  {latestRun.summary.runningPages} running pages
                </p>
              </div>
              <div className="rounded-xl bg-surface-container-low/60 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-outline">Failed</p>
                <p className="mt-2 font-headline text-2xl font-bold text-on-surface tabular-nums">
                  {latestRun.summary.failedPages} failed pages
                </p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.4fr,1fr]">
              <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low/40 p-5">
                <h3 className="font-semibold text-sm text-on-surface">Run Details</h3>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <p className="text-on-surface-variant">
                    Current status: <span className="font-semibold text-on-surface">{latestRun.status}</span>
                  </p>
                  <p className="text-on-surface-variant">
                    Last updated: <span className="font-semibold text-on-surface">{latestRun.updatedAt || '—'}</span>
                  </p>
                  <p className="text-on-surface-variant">
                    Started: <span className="font-semibold text-on-surface">{latestRun.startedAt || '—'}</span>
                  </p>
                  <p className="text-on-surface-variant">
                    Completed pages: <span className="font-semibold text-on-surface">{latestRun.summary.completedPages}</span>
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low/40 p-5">
                <h3 className="font-semibold text-sm text-on-surface">Recent Failed Pages</h3>
                {failedPages.length > 0 ? (
                  <ul className="mt-3 space-y-3 text-sm">
                    {failedPages.map((page) => (
                      <li key={`${page.sourceBatch}-${page.pageNumber}`} className="rounded-lg bg-surface-container-lowest px-4 py-3">
                        <p className="font-semibold text-on-surface">Page {page.pageNumber}</p>
                        <p className="text-on-surface-variant">{page.sourceBatch}</p>
                        <p className="mt-1 text-error">{page.error || 'No error message recorded.'}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-on-surface-variant">No failed pages recorded yet.</p>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-outline-variant/20 bg-surface-container-low/30 p-6 text-sm text-on-surface-variant">
            {isLoading ? 'Loading the latest ingest run…' : 'No princely-states ingest run has been recorded yet.'}
          </div>
        )}
      </section>
    </div>
  );
}
