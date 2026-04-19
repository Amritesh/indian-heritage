# Supabase Archive Metadata Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make AHG public archive metadata and public archive APIs Supabase-only while keeping Firebase Storage for images and adding an all-collections period reprocess and verification flow.

**Architecture:** Tighten the existing Supabase path instead of creating another migration layer. Public frontend reads and public backend archive endpoints will use Supabase only, while a shared snapshot resolver will let the existing Supabase importer and verification flow cover both canonical archive snapshots and live `temp/data` collection files such as `early-coinage`.

**Tech Stack:** TypeScript, Vitest, Node.js, Express, Supabase REST, Firebase Storage, existing AHG import scripts

---

## File Structure

- Create: `frontend/scripts/lib/archiveSnapshotSources.ts`
- Create: `frontend/scripts/lib/archiveSnapshotSources.test.ts`
- Create: `frontend/scripts/reprocess-supabase-periods.ts`
- Create: `backend/src/archivePublicData.js`
- Create: `backend/src/archivePublicData.test.js`
- Modify: `frontend/src/entities/collection/api/collectionService.ts`
- Modify: `frontend/src/entities/collection/api/collectionService.test.ts`
- Modify: `frontend/src/entities/item/api/itemService.ts`
- Modify: `frontend/src/entities/item/api/itemService.test.ts`
- Modify: `frontend/scripts/import-supabase-archive.ts`
- Modify: `frontend/scripts/verify-supabase-migration.ts`
- Modify: `backend/src/index.js`

### Task 1: Add shared snapshot resolution for all enabled collections

**Files:**
- Create: `frontend/scripts/lib/archiveSnapshotSources.ts`
- Create: `frontend/scripts/lib/archiveSnapshotSources.test.ts`
- Modify: `frontend/scripts/import-supabase-archive.ts`
- Modify: `frontend/scripts/verify-supabase-migration.ts`

- [ ] **Step 1: Write the failing snapshot resolver test**

```ts
import { describe, expect, it } from 'vitest';
import { resolveArchiveSnapshotPaths } from './archiveSnapshotSources';

describe('resolveArchiveSnapshotPaths', () => {
  it('prefers enabled collection snapshots and falls back to temp/data for early-coinage', () => {
    const result = resolveArchiveSnapshotPaths({
      collectionSlugs: ['mughals', 'early-coinage'],
      candidateDirs: [
        '/repo/backend-support/snapshots/firebase-archive',
        '/repo/temp/data',
      ],
    });

    expect(result.map((entry) => entry.collectionSlug)).toEqual(['mughals', 'early-coinage']);
    expect(result.find((entry) => entry.collectionSlug === 'early-coinage')?.filePath)
      .toContain('/repo/temp/data/early-coinage.json');
  });
});
```

- [ ] **Step 2: Run the test and verify the resolver does not exist yet**

Run: `npm run test --workspace frontend -- archiveSnapshotSources.test.ts`
Expected: FAIL with module or export errors for `archiveSnapshotSources`

- [ ] **Step 3: Implement the shared resolver**

```ts
export function resolveArchiveSnapshotPaths(options: ResolveArchiveSnapshotPathsOptions = {}) {
  const targetSlugs = options.collectionSlugs?.length
    ? options.collectionSlugs
    : collectionRegistry.filter((entry) => entry.enabled).map((entry) => entry.slug);

  return targetSlugs.map((collectionSlug) => ({
    collectionSlug,
    filePath: resolveSnapshotForSlug(collectionSlug, options.candidateDirs ?? defaultCandidateDirs),
  }));
}
```

- [ ] **Step 4: Switch import and verify scripts to the shared resolver**

```ts
const resolvedSnapshots = resolveArchiveSnapshotPaths({ target, projectRoot });
const files = resolvedSnapshots.map((entry) => entry.filePath);
```

- [ ] **Step 5: Re-run the snapshot resolver test**

Run: `npm run test --workspace frontend -- archiveSnapshotSources.test.ts`
Expected: PASS

### Task 2: Make public frontend archive reads Supabase-only

**Files:**
- Modify: `frontend/src/entities/collection/api/collectionService.ts`
- Modify: `frontend/src/entities/collection/api/collectionService.test.ts`
- Modify: `frontend/src/entities/item/api/itemService.ts`
- Modify: `frontend/src/entities/item/api/itemService.test.ts`

- [ ] **Step 1: Write the failing collection-service test for missing Supabase config**

```ts
it('rejects public collection reads when Supabase config is missing', async () => {
  await expect(getCollections()).rejects.toThrow(/Supabase/i);
});
```

- [ ] **Step 2: Write the failing item-service test for missing Supabase config**

```ts
it('rejects public item reads when Supabase config is missing', async () => {
  await expect(getCollectionItemsPage({ collectionSlug: 'mughals' })).rejects.toThrow(/Supabase/i);
});
```

- [ ] **Step 3: Run the targeted frontend tests and confirm they fail because services still fall back**

Run: `npm run test --workspace frontend -- collectionService.test.ts itemService.test.ts`
Expected: FAIL because services still return fallback data instead of throwing

- [ ] **Step 4: Remove legacy public fallbacks and add explicit Supabase guards**

```ts
function assertSupabaseArchiveConfigured() {
  if (!hasSupabaseEnv) {
    throw new Error('Supabase archive configuration is required for public metadata reads.');
  }
}

export async function getCollections() {
  assertSupabaseArchiveConfigured();
  return getCollectionsFromSupabase();
}
```

- [ ] **Step 5: Re-run the targeted frontend tests**

Run: `npm run test --workspace frontend -- collectionService.test.ts itemService.test.ts`
Expected: PASS

### Task 3: Move backend public archive routes to Supabase metadata

**Files:**
- Create: `backend/src/archivePublicData.js`
- Create: `backend/src/archivePublicData.test.js`
- Modify: `backend/src/index.js`

- [ ] **Step 1: Write the failing backend helper test**

```js
test('getPublicItemsByCollectionSlug reads published public items from Supabase', async () => {
  const items = await getPublicItemsByCollectionSlug(config, httpClient, 'mughals');
  assert.equal(items[0].collectionSlug, 'mughals');
});
```

- [ ] **Step 2: Run the backend node test and verify the helper is missing**

Run: `node --test backend/src/archivePublicData.test.js`
Expected: FAIL because `archivePublicData.js` does not exist yet

- [ ] **Step 3: Implement the Supabase-backed helper and route wiring**

```js
app.get('/api/items/:id', async (req, res) => {
  const items = await getPublicItemsByCollectionSlug(resolveSupabaseConfig(...), axios, req.params.id);
  res.json(items);
});
```

- [ ] **Step 4: Re-run the backend node test**

Run: `node --test backend/src/archivePublicData.test.js`
Expected: PASS

### Task 4: Add all-collections period reprocess and verification

**Files:**
- Create: `frontend/scripts/reprocess-supabase-periods.ts`
- Modify: `frontend/scripts/import-supabase-archive.ts`
- Modify: `frontend/scripts/verify-supabase-migration.ts`

- [ ] **Step 1: Write the failing script-level test for period issue summarization**

```ts
it('reports unresolved periods when deriveYearRange cannot normalize a date', () => {
  const report = summarizePeriodNormalizationIssues([
    { id: 'coin-1', dateText: 'AH date only', period: 'AH 1000' },
  ]);

  expect(report.unresolvedCount).toBe(1);
});
```

- [ ] **Step 2: Run the targeted test and verify the report helper is missing**

Run: `npm run test --workspace frontend -- archiveSnapshotSources.test.ts`
Expected: FAIL for missing unresolved-period summary helper

- [ ] **Step 3: Implement the reprocess wrapper**

```ts
const resolvedSnapshots = resolveArchiveSnapshotPaths({ projectRoot });
const importSummary = await runArchiveImport({ snapshotFiles: resolvedSnapshots.map((entry) => entry.filePath) });
const verification = await runArchiveVerification({ snapshotFiles: resolvedSnapshots.map((entry) => entry.filePath) });

console.log(JSON.stringify({ importSummary, verification }, null, 2));
```

- [ ] **Step 4: Run the all-collection reprocess**

Run: `npm exec --workspace frontend tsx scripts/reprocess-supabase-periods.ts`
Expected: JSON summary showing resolved files, import summaries, and unresolved-period counts

- [ ] **Step 5: Re-run focused verification**

Run: `npm run test --workspace frontend -- archiveSnapshotSources.test.ts collectionService.test.ts itemService.test.ts && node --test backend/src/archivePublicData.test.js`
Expected: PASS
