import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { deriveYearRange } from '../src/backend-support/mappers/normalizeItem';
import { readSnapshotFile, runArchiveImport } from './import-supabase-archive';
import { materializeCanonicalArchiveSnapshots, resolveArchiveSnapshotPaths } from './lib/archiveSnapshotSources';
import { loadWorkspaceEnv } from './lib/loadEnv';
import { runArchiveVerification } from './verify-supabase-migration';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

function buildPeriodSummary(filePath: string, collectionSlug: string) {
  const snapshot = readSnapshotFile(filePath, collectionSlug);
  const unresolved = snapshot.items
    .map((item) => {
      const sourceText = item.dateText || item.period || '';
      const normalized = deriveYearRange(sourceText);
      return {
        id: item.id,
        title: item.title ?? '',
        sourceText,
        sortYearStart: normalized.sortYearStart,
        sortYearEnd: normalized.sortYearEnd,
      };
    })
    .filter((item) => item.sourceText && item.sortYearStart === null);

  return {
    collectionSlug,
    filePath,
    totalItems: snapshot.items.length,
    unresolvedCount: unresolved.length,
    unresolvedSamples: unresolved.slice(0, 10),
  };
}

async function main() {
  loadWorkspaceEnv(projectRoot);
  const resolvedSnapshots = materializeCanonicalArchiveSnapshots(
    resolveArchiveSnapshotPaths({ projectRoot }),
    { projectRoot },
  );
  const snapshotFiles = resolvedSnapshots.map((entry) => entry.filePath);
  const periodSummary = resolvedSnapshots.map((entry) =>
    buildPeriodSummary(entry.filePath, entry.collectionSlug),
  );

  const [importSummary, verification] = await Promise.all([
    runArchiveImport({ snapshotFiles }),
    runArchiveVerification({ snapshotFiles }),
  ]);

  console.log(JSON.stringify({
    reprocessedAt: new Date().toISOString(),
    resolvedSnapshots,
    importSummary,
    periodSummary,
    verification,
  }, null, 2));

  if (verification.hasSupabaseEnv && verification.mismatches.length > 0) {
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${__filename}`) {
  main().catch((error) => {
    if (error instanceof Error) {
      console.error(JSON.stringify({ name: error.name, message: error.message, stack: error.stack }, null, 2));
    } else {
      console.error(String(error));
    }
    process.exitCode = 1;
  });
}
