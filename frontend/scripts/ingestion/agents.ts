import fs from 'node:fs';
import path from 'node:path';
import { 
  readSnapshotFile, 
  buildMigrationPayload, 
  MigrationPayloadBundle, 
  FirebaseArchiveSnapshot 
} from '../import-supabase-archive';
import { 
  materializeCanonicalArchiveSnapshots, 
  resolveArchiveSnapshotPaths 
} from '../lib/archiveSnapshotSources';
import { runArchiveVerification } from '../verify-supabase-migration';

export interface IngestContext {
  projectRoot: string;
  target?: string;
  collectionSlug?: string;
}

/**
 * Collection Discovery Agent
 * Responsible for finding and validating source manifests/snapshots.
 */
export class CollectionDiscoveryAgent {
  async discover(ctx: IngestContext) {
    console.log('[DiscoveryAgent] Looking for snapshots...');
    const snapshotPaths = resolveArchiveSnapshotPaths({ 
      target: ctx.target, 
      projectRoot: ctx.projectRoot 
    });
    const snapshots = materializeCanonicalArchiveSnapshots(snapshotPaths, { 
      projectRoot: ctx.projectRoot 
    });
    
    if (ctx.collectionSlug) {
      return snapshots.filter(s => s.collectionSlug === ctx.collectionSlug);
    }
    return snapshots;
  }
}

/**
 * Metadata Normalization Agent
 * Responsible for normalizing title, ruler, chronology, etc.
 */
export class MetadataNormalizationAgent {
  async normalize(filePath: string, collectionSlug?: string): Promise<MigrationPayloadBundle> {
    console.log(`[NormalizationAgent] Normalizing ${path.basename(filePath)}...`);
    const snapshot = readSnapshotFile(filePath, collectionSlug);
    return buildMigrationPayload(snapshot);
  }
}

/**
 * Supabase Sync Agent
 * Responsible for idempotent upserts to Supabase.
 */
export class SupabaseSyncAgent {
  // This will use the logic from import-supabase-archive.ts
  // but I'll refactor it to be cleaner if needed.
  // For now, I'll export a method that takes the payload and syncs it.
}

/**
 * Verification Agent
 * Runs sanity checks on the ingested data.
 */
export class VerificationAgent {
  async verify(snapshotFiles: string[]) {
    console.log('[VerificationAgent] Running sanity checks...');
    return runArchiveVerification({ snapshotFiles });
  }
}
