import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
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
      const syncResult = await this.syncAgent.sync(ctx.collectionSlug ?? snapshot.collectionSlug, ctx.target, { replace: ctx.replace });
      results.push(syncResult);
    }

    // Task 3: Verification
    const snapshotFiles = snapshots.map(s => s.filePath);
    const verificationReport = await this.verificationAgent.verify(snapshotFiles);

    console.log('\n--- Ingestion Crew Task Summary ---');
    console.log(`Collections Processed: ${snapshots.length}`);
    console.log(`Verification: ${verificationReport.mismatches.length} mismatches found.`);

    if (ctx.deploy) {
      if (verificationReport.mismatches.length > 0) {
        throw new Error('Deploy skipped because verification reported mismatches.');
      }
      runDeploySync();
    }
    
    return {
      results,
      verificationReport
    };
  }
}

function parseArgs(argv: string[]) {
  let target: string | undefined;
  let collectionSlug: string | undefined;
  let replace = false;
  let deploy = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--replace' || arg === '--replace-collection') {
      replace = true;
      continue;
    }
    if (arg === '--deploy') {
      deploy = true;
      continue;
    }
    if (arg === '--collection') {
      collectionSlug = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg.startsWith('--collection=')) {
      collectionSlug = arg.slice('--collection='.length);
      continue;
    }
    if (!arg.startsWith('-') && !target) {
      target = arg;
    }
  }

  return { target, collectionSlug, replace, deploy };
}

function runDeploySync() {
  console.log('[DeployAgent] Verification passed. Syncing environment and deploying live version...');
  const result = spawnSync(process.execPath, [path.join(projectRoot, 'scripts', 'deploy-firebase.cjs')], {
    cwd: projectRoot,
    env: process.env,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error('Deploy failed.');
  }
}

async function main() {
  loadWorkspaceEnv(projectRoot);
  
  const args = parseArgs(process.argv.slice(2));
  
  const crew = new IngestionCrew();
  await crew.run({
    projectRoot,
    target: args.target,
    collectionSlug: args.collectionSlug,
    replace: args.replace,
    deploy: args.deploy,
  });
}

if (import.meta.url === `file://${__filename}`) {
  main().catch(console.error);
}
