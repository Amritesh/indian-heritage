import { 
  MigrationPayloadBundle,
  runArchiveImport
} from '../import-supabase-archive';

/**
 * Supabase Sync Agent
 * Performs ordered idempotent upserts to Supabase.
 */
export class SupabaseSyncAgent {
  async sync(collectionSlug?: string, target?: string) {
    console.log(`[SyncAgent] Syncing collection: ${collectionSlug || 'all'}...`);
    return runArchiveImport({ collectionSlug, target });
  }
}
