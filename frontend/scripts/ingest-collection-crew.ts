import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { CollectionDiscoveryAgent, MetadataNormalizationAgent, VerificationAgent, IngestContext } from './ingestion/agents';
import { SupabaseSyncAgent } from './ingestion/sync-agent';
import { loadWorkspaceEnv } from './lib/loadEnv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

/**
 * Crew orchestrator for collection ingestion.
 * Follows a multi-agent task pattern.
 */
class IngestionCrew {
  private discoveryAgent = new CollectionDiscoveryAgent();
  private normalizationAgent = new MetadataNormalizationAgent();
  private syncAgent = new SupabaseSyncAgent();
  private verificationAgent = new VerificationAgent();

  async run(ctx: IngestContext) {
    console.log('--- Starting Ingestion Crew ---');

    // Task 1: Discovery
    const snapshots = await this.discoveryAgent.discover(ctx);
    if (snapshots.length === 0) {
      console.error('No collections found to ingest.');
      return;
    }

    const results = [];
    for (const snapshot of snapshots) {
      console.log(`\n>>> Processing Collection: ${snapshot.collectionSlug}`);

      // Task 2: Sync (which includes normalization and Supabase upserts)
      // Note: For now, the sync agent wraps the existing robust import logic
      // but we could split it further into discrete agent steps.
      const syncResult = await this.syncAgent.sync(snapshot.collectionSlug, ctx.target);
      results.push(syncResult);
    }

    // Task 3: Verification
    const snapshotFiles = snapshots.map(s => s.filePath);
    const verificationReport = await this.verificationAgent.verify(snapshotFiles);

    console.log('\n--- Ingestion Crew Task Summary ---');
    console.log(`Collections Processed: ${snapshots.length}`);
    console.log(`Verification: ${verificationReport.mismatches.length} mismatches found.`);
    
    return {
      results,
      verificationReport
    };
  }
}

async function main() {
  loadWorkspaceEnv(projectRoot);
  
  const args = process.argv.slice(2);
  const collectionSlug = args.find(a => !a.startsWith('-'));
  
  const crew = new IngestionCrew();
  await crew.run({
    projectRoot,
    collectionSlug
  });
}

if (import.meta.url === `file://${__filename}`) {
  main().catch(console.error);
}
