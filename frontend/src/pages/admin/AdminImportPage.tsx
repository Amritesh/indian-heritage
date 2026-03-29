import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAllCollectionsAdmin } from '@/entities/collection/api/collectionAdminService';

type ImportStatus = 'idle' | 'running' | 'done' | 'error';

type ImportLog = {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error';
};

export function AdminImportPage() {
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [selectedCollection, setSelectedCollection] = useState('');

  const { data: collections = [] } = useQuery({
    queryKey: ['admin', 'collections'],
    queryFn: getAllCollectionsAdmin,
  });

  function addLog(message: string, type: ImportLog['type'] = 'info') {
    setLogs((prev) => [...prev, { timestamp: new Date().toLocaleTimeString(), message, type }]);
  }

  async function runImport() {
    setStatus('running');
    setLogs([]);
    addLog('Starting import process…');

    try {
      addLog('Import pipeline runs server-side via the Python backend scripts.', 'info');
      addLog('To import data, run the following from the /backend directory:', 'info');
      addLog(
        selectedCollection
          ? `python -m coin_cataloguer.main --collection ${selectedCollection}`
          : 'python -m coin_cataloguer.main',
        'info',
      );
      addLog('');
      addLog('The import pipeline will:', 'info');
      addLog('  1. Fetch items from the source API', 'info');
      addLog('  2. Normalize and validate with Zod schemas', 'info');
      addLog('  3. Download and process images', 'info');
      addLog('  4. Upsert records to Firestore', 'info');
      addLog('  5. Update collection item counts', 'info');
      addLog('');
      addLog('Check the backend terminal for live import progress.', 'success');
      setStatus('done');
    } catch (err) {
      addLog(err instanceof Error ? err.message : 'Unknown error', 'error');
      setStatus('error');
    }
  }

  const logColors = {
    info: 'text-on-surface-variant',
    success: 'text-tertiary',
    error: 'text-error',
  };

  return (
    <div className="space-y-8">
      <div>
        <span className="eyebrow">Tools</span>
        <h1 className="mt-2 font-headline text-3xl font-bold text-on-surface">Import Tools</h1>
        <p className="mt-1 text-on-surface-variant">Trigger and monitor collection import pipelines.</p>
      </div>

      {/* Import Control */}
      <div className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/10 space-y-6">
        <h2 className="font-label text-xs font-bold uppercase tracking-[0.2em] text-primary border-b border-outline-variant/20 pb-4">
          Run Import
        </h2>

        <div className="space-y-2">
          <label className="font-label text-xs font-bold uppercase tracking-wider text-outline">
            Target Collection
          </label>
          <select
            value={selectedCollection}
            onChange={(e) => setSelectedCollection(e.target.value)}
            className="w-full text-sm border border-outline-variant/30 rounded-lg px-3 py-2 bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">All collections</option>
            {collections.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.displayName}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={runImport}
            disabled={status === 'running'}
            className="btn-primary disabled:opacity-50"
          >
            {status === 'running' ? (
              <>
                <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                Running…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">cloud_download</span>
                Start Import
              </>
            )}
          </button>

          {status !== 'idle' && (
            <button
              onClick={() => { setStatus('idle'); setLogs([]); }}
              className="btn-secondary"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Import Log */}
      {logs.length > 0 && (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-outline-variant/10 flex items-center justify-between">
            <h2 className="font-label text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Import Log
            </h2>
            {status === 'done' && (
              <span className="text-xs text-tertiary font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                Complete
              </span>
            )}
            {status === 'error' && (
              <span className="text-xs text-error font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">error</span>
                Failed
              </span>
            )}
          </div>
          <div className="p-6 font-mono text-xs space-y-1 max-h-96 overflow-y-auto bg-surface-container-low/50">
            {logs.map((log, i) => (
              <div key={i} className={`flex gap-4 ${logColors[log.type]}`}>
                {log.message ? (
                  <>
                    <span className="text-outline shrink-0">{log.timestamp}</span>
                    <span>{log.message}</span>
                  </>
                ) : (
                  <span>&nbsp;</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Collection Status Grid */}
      <div className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/10 space-y-4">
        <h2 className="font-label text-xs font-bold uppercase tracking-[0.2em] text-primary border-b border-outline-variant/20 pb-4">
          Collection Sync Status
        </h2>
        <div className="divide-y divide-outline-variant/10">
          {collections.map((col) => (
            <div key={col.id} className="py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-on-surface">{col.displayName}</p>
                <p className="text-xs text-on-surface-variant mt-0.5">{col.itemCount} items</p>
              </div>
              <div className="text-right">
                {col.lastSyncedAt ? (
                  <p className="text-xs text-on-surface-variant">
                    Last synced {new Date(col.lastSyncedAt).toLocaleDateString()}
                  </p>
                ) : (
                  <p className="text-xs text-outline">Never synced</p>
                )}
              </div>
            </div>
          ))}
          {collections.length === 0 && (
            <p className="py-4 text-sm text-on-surface-variant text-center">No collections found</p>
          )}
        </div>
      </div>

      {/* Backend Instructions */}
      <div className="bg-surface-container-low rounded-xl border border-outline-variant/10 p-6 space-y-3">
        <h3 className="font-label text-xs font-bold uppercase tracking-wider text-outline">
          Backend Import Instructions
        </h3>
        <div className="space-y-2 text-sm text-on-surface-variant font-mono">
          <p className="text-on-surface font-semibold font-body">From project root:</p>
          <div className="bg-surface-container-lowest rounded-lg px-4 py-3 space-y-1 border border-outline-variant/10">
            <p>cd backend</p>
            <p>pip install -r requirements.txt</p>
            <p>python -m coin_cataloguer.main</p>
          </div>
          <p className="font-body mt-2">
            Set <span className="text-primary">GOOGLE_APPLICATION_CREDENTIALS</span> or use Firebase emulator for local testing.
          </p>
        </div>
      </div>
    </div>
  );
}
