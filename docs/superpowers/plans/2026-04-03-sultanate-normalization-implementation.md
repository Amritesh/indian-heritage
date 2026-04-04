# Sultanate Normalization and Ingest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Canonicalize catalog entities and sort fields safely, repair existing collection data, ingest Sultanate pages 7-18 through the independent-page flow, sync data, and deploy the customer-facing app without losing processed records.

**Architecture:** Add one shared normalization layer for canonical ruler/authority/mint/tag and denomination/price derivation, then use it from both the frontend-support mapper path and the backend Firestore import/repair path. Run a safe repair over existing collections, process Sultanate pages into local data, normalize and sync them, then verify and deploy.

**Tech Stack:** TypeScript, Node.js, Firebase Admin/Firestore, Python CrewAI pipeline, Vitest

---

### Task 1: Create shared catalog normalization helpers

**Files:**
- Create: `frontend/src/shared/lib/catalogNormalization.ts`
- Modify: `frontend/src/shared/config/denominations.ts`
- Test: `frontend/src/shared/lib/catalogNormalization.test.ts`
- Test: `frontend/src/shared/config/denominations.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it('canonicalizes ruler and mint aliases into stable tags', () => {
  expect(canonicalizeRulerOrIssuer('Muhammad bin Tughluq')).toMatchObject({
    label: 'Muhammad bin Tughlaq',
    slug: 'muhammad-bin-tughlaq',
  });
});

it('resolves british and sultanate denomination aliases', () => {
  expect(resolveDenomination('One Rupee')).toMatchObject({ key: 'rupee', rank: 10 });
  expect(resolveDenomination('Tanka')).toMatchObject({ key: 'tanka' });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/shared/lib/catalogNormalization.test.ts src/shared/config/denominations.test.ts`
Expected: FAIL because canonical helpers and expanded denomination aliases do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
export function canonicalizeRulerOrIssuer(value?: string | null) {
  const normalized = normalizeEntityText(value);
  return resolveAlias(normalized, RULER_ALIASES, 'Unknown');
}

export function buildCanonicalTags(input: CatalogEntityInput) {
  return uniqueTagEntities([
    canonicalizeAuthority(input.culture),
    canonicalizeRulerOrIssuer(input.rulerOrIssuer),
    canonicalizeMint(input.mintOrPlace),
    canonicalizeMaterial(input.material),
    canonicalizeDenominationLabel(input.denomination),
  ]);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/shared/lib/catalogNormalization.test.ts src/shared/config/denominations.test.ts`
Expected: PASS

### Task 2: Route existing normalization/import logic through the shared helpers

**Files:**
- Modify: `frontend/src/backend-support/mappers/normalizeItem.ts`
- Modify: `backend/scripts/importToFirestore.js`
- Test: `frontend/src/backend-support/mappers/normalizeItem.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
it('uses canonical entity tags and shared denomination metadata', () => {
  expect(normalized.tags).toContain('muhammad-bin-tughlaq');
  expect(normalized.denominationKey).toBe('rupee');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/backend-support/mappers/normalizeItem.test.ts`
Expected: FAIL because raw tags and local denomination parsing are still used.

- [ ] **Step 3: Write minimal implementation**

```ts
const canonical = deriveCanonicalCatalogFields({...});
const tags = canonical.tags.map((tag) => tag.label);
const searchKeywords = canonical.searchKeywords;
```

```js
const normalized = deriveCanonicalCatalogFields({...});
denominationKey: normalized.denomination.key,
tags: normalized.tags.labels,
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/backend-support/mappers/normalizeItem.test.ts src/shared/lib/catalogNormalization.test.ts`
Expected: PASS

### Task 3: Add a safe repair script for existing collection data

**Files:**
- Create: `backend/scripts/repairCatalogData.js`
- Modify: `backend/scripts/importToFirestore.js`
- Test: `frontend/src/shared/lib/catalogNormalization.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
it('recomputes canonical tags and sort fields for british-style records', () => {
  expect(repaired.denominationRank).toBeLessThan(9999);
  expect(repaired.estimatedPriceAvg).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/shared/lib/catalogNormalization.test.ts`
Expected: FAIL because no repair path exercises the shared derivation on existing-style data.

- [ ] **Step 3: Write minimal implementation**

```js
for (const itemDoc of items) {
  const repaired = repairFirestoreItem(itemDoc.data(), collectionConfig);
  batch.set(itemRef, repaired, { merge: true });
}
```

- [ ] **Step 4: Run tests and a dry run**

Run: `npm test -- src/shared/lib/catalogNormalization.test.ts`
Expected: PASS

Run: `node backend/scripts/repairCatalogData.js --collection british --dry-run`
Expected: Summary output showing repaired denomination, price, and tag fields without deleting items.

### Task 4: Process Sultanate pages 7-18 into local data

**Files:**
- Inspect: `temp/images/sultanate-coins-1/page-7.png` through `page-18.png`
- Modify: `backend/coin_cataloguer/main.py`
- Modify: `temp/data/collections.json`
- Produce: `temp/data/sultanate.json`

- [ ] **Step 1: Verify source pages exist**

Run: `find temp/images/sultanate-coins-1 -maxdepth 1 -type f | sort`
Expected: Includes page images 7 through 18.

- [ ] **Step 2: Add collection metadata seed if missing**

```json
{
  "id": "sultanate",
  "title": "Sultanate Coins",
  "culture": "Delhi Sultanate"
}
```

- [ ] **Step 3: Run independent-page cataloguer across pages 7-18**

Run:

```bash
for page in {7..18}; do
  python -m coin_cataloguer.main \
    --image "temp/images/sultanate-coins-1/page-${page}.png" \
    --output "temp/output/sultanate/page-${page}" \
    --collection sultanate \
    --upload
done
```

Expected: Each page produces a catalogue and uploads/merges into local collection detail data for `sultanate`.

- [ ] **Step 4: Verify local data file exists**

Run: `ls temp/data/sultanate.json`
Expected: File exists and contains merged items.

### Task 5: Repair and sync existing plus Sultanate data

**Files:**
- Modify: Firestore `collections/*` and `items/*`
- Modify: `temp/data/british.json`
- Modify: `temp/data/mughals.json`
- Modify: `temp/data/princely-states.json`
- Modify: `temp/data/sultanate.json`

- [ ] **Step 1: Run repair on existing collections**

Run:

```bash
node backend/scripts/repairCatalogData.js --collection british
node backend/scripts/repairCatalogData.js --collection mughals
node backend/scripts/repairCatalogData.js --collection princely-states
node backend/scripts/repairCatalogData.js --collection sultanate
```

Expected: Merge updates only, no item deletion, summary counts for repaired records.

- [ ] **Step 2: Re-sync Firestore collection summaries**

Run:

```bash
node backend/scripts/importToFirestore.js --collection british
node backend/scripts/importToFirestore.js --collection mughals
node backend/scripts/importToFirestore.js --collection princely-states
node backend/scripts/importToFirestore.js --collection sultanate
```

Expected: Collection docs reflect repaired sort fields, tags, and summary stats.

### Task 6: Verify frontend behavior and deploy

**Files:**
- Test: `frontend/src/shared/lib/catalogNormalization.test.ts`
- Test: `frontend/src/backend-support/mappers/normalizeItem.test.ts`
- Test: existing frontend suite

- [ ] **Step 1: Run focused frontend tests**

Run:

```bash
npm test --workspace frontend -- \
  src/shared/lib/catalogNormalization.test.ts \
  src/backend-support/mappers/normalizeItem.test.ts \
  src/shared/config/denominations.test.ts
```

Expected: PASS

- [ ] **Step 2: Run full frontend suite**

Run: `npm test --workspace frontend`
Expected: PASS

- [ ] **Step 3: Deploy**

Run: `npm run deploy:firebase`
Expected: Successful Hosting/Firebase deploy with updated app code.
