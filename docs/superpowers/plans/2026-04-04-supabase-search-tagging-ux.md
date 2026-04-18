# Supabase Search, Tagging, and UX Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make AHG fully Supabase-first for search, tags, filters, totals, and related items, while keeping Firebase Storage only for images/media.

**Architecture:** Keep metadata, search, relations, totals, and canonical identity in Supabase/Postgres. Use deterministic importer-generated relations first, then add Supabase-backed search/facet/count flows in frontend services so UI behavior comes from relational/archive data rather than Firebase-era denormalized snapshots.

**Tech Stack:** Supabase PostgREST, PostgreSQL relations/GIN-ready schema, TypeScript, Vitest, Firebase Storage, Python cataloguer/CrewAI docs/tests

---

## File Map

- Modify: `/Users/amritesh/Desktop/code/AHG/frontend/scripts/import-supabase-archive.ts`
  - Generate `record_relations`, strengthen idempotent relation/reference writes, and prepare search-friendly derived metadata.
- Modify: `/Users/amritesh/Desktop/code/AHG/frontend/scripts/verify-supabase-migration.ts`
  - Verify relation counts and Supabase-backed parity using canonicalized semantics.
- Create: `/Users/amritesh/Desktop/code/AHG/frontend/src/shared/lib/archiveRelations.ts`
  - Deterministic similarity scoring helper for importer-side `record_relations`.
- Create: `/Users/amritesh/Desktop/code/AHG/frontend/src/shared/lib/archiveRelations.test.ts`
  - Unit tests for deterministic relation scoring and per-item relation limits.
- Modify: `/Users/amritesh/Desktop/code/AHG/frontend/src/shared/services/supabase.ts`
  - Add any small helper needed for count-heavy queries/RPC readiness.
- Modify: `/Users/amritesh/Desktop/code/AHG/frontend/src/entities/collection/api/collectionService.supabase.ts`
  - Replace item-scan totals with `supabaseCount`-backed collection totals and targeted material aggregation.
- Create: `/Users/amritesh/Desktop/code/AHG/frontend/src/entities/collection/api/collectionService.supabase.test.ts`
  - Tests proving totals now come from Supabase count APIs rather than inferred row scans.
- Modify: `/Users/amritesh/Desktop/code/AHG/frontend/src/entities/category/api/categoryService.ts`
  - Keep category totals and ordering Supabase-backed, ready for future category refreshes.
- Modify: `/Users/amritesh/Desktop/code/AHG/frontend/src/entities/item/api/itemService.supabase.ts`
  - Move search, related items, tag filtering, and sorting to Supabase-backed behavior as far as current schema allows.
- Modify: `/Users/amritesh/Desktop/code/AHG/frontend/src/entities/item/api/itemService.ts`
  - Make Supabase path the clear primary path and keep Firebase as legacy fallback only.
- Modify: `/Users/amritesh/Desktop/code/AHG/frontend/src/backend-support/mappers/normalizeArchiveItem.ts`
  - Ensure media, pricing, and tag data reflect Supabase-backed archive rows cleanly.
- Modify: `/Users/amritesh/Desktop/code/AHG/backend/coin_cataloguer/crew.py`
  - Update task descriptions to reflect Supabase metadata + Firebase Storage reality.
- Modify: `/Users/amritesh/Desktop/code/AHG/backend/coin_cataloguer/main.py`
  - Update public docstrings/help text to stop implying Firebase is the source of truth for metadata.
- Modify: `/Users/amritesh/Desktop/code/AHG/backend/coin_cataloguer/batch_ingest.py`
  - Update progress/help language to reflect legacy Firebase upload compatibility versus Supabase archive truth.
- Modify: `/Users/amritesh/Desktop/code/AHG/backend/coin_cataloguer/enrich_collection.py`
  - Update upload function naming/comments for new architecture reality.
- Modify: `/Users/amritesh/Desktop/code/AHG/backend/coin_cataloguer/tools/firebase_uploader.py`
  - Label it clearly as a legacy/compatibility media+legacy-metadata bridge, not the archive source of truth.
- Create: `/Users/amritesh/Desktop/code/AHG/backend/coin_cataloguer/tests/test_supabase_transition.py`
  - Backend tests for wording/behavior reflecting Supabase-first architecture.

## Task 1: Add Deterministic Archive Relations

**Files:**
- Create: `/Users/amritesh/Desktop/code/AHG/frontend/src/shared/lib/archiveRelations.ts`
- Test: `/Users/amritesh/Desktop/code/AHG/frontend/src/shared/lib/archiveRelations.test.ts`

- [ ] **Step 1: Write the failing relation tests**

Run:
```bash
PATH=/usr/local/bin:/usr/bin:/bin /usr/local/bin/node /usr/local/lib/node_modules/npm/bin/npm-cli.js run test --workspace frontend -- src/shared/lib/archiveRelations.test.ts
```

Expected:
- Fails because `@/shared/lib/archiveRelations` does not exist yet.

- [ ] **Step 2: Implement deterministic relation scoring**

Create a focused helper that:
- accepts simplified item seeds
- scores pairs by:
  - same `conceptualItemId`
  - same `rulerOrIssuer`
  - same `mintOrPlace`
  - same `denomination`
  - overlapping materials/tags
  - same collection fallback
- returns explainable `reason` strings and sorted results
- caps stored relations per source item

- [ ] **Step 3: Run the relation tests**

Run:
```bash
PATH=/usr/local/bin:/usr/bin:/bin /usr/local/bin/node /usr/local/lib/node_modules/npm/bin/npm-cli.js run test --workspace frontend -- src/shared/lib/archiveRelations.test.ts
```

Expected:
- PASS for relation scoring behavior.

## Task 2: Persist `record_relations` During Supabase Import

**Files:**
- Modify: `/Users/amritesh/Desktop/code/AHG/frontend/scripts/import-supabase-archive.ts`
- Modify: `/Users/amritesh/Desktop/code/AHG/frontend/scripts/verify-supabase-migration.ts`
- Test: `/Users/amritesh/Desktop/code/AHG/frontend/src/shared/lib/archiveRelations.test.ts`

- [ ] **Step 1: Write/adjust failing verification expectation**

Run:
```bash
PATH=/usr/local/bin:/usr/bin:/bin /usr/local/bin/node /usr/local/lib/node_modules/npm/bin/npm-cli.js exec --workspace frontend tsx scripts/verify-supabase-migration.ts
```

Expected:
- Current verifier does not check/import `record_relations` semantics yet.

- [ ] **Step 2: Generate relation rows in the importer**

Use `buildItemSimilarityRelations(...)` against canonicalized item payloads and map the result into `record_relations`.

Requirements:
- dedupe by `(source_kind, source_id, related_kind, related_id, relation_type)`
- avoid self-relations
- clear old per-source item relations before re-upsert for idempotency

- [ ] **Step 3: Extend verifier for relation sanity**

Add a lightweight relation verification mode that checks:
- `record_relations` rows exist for imported public items
- no self-relations exist
- relation counts are stable on rerun

- [ ] **Step 4: Run importer and verifier**

Run:
```bash
PATH=/usr/local/bin:/usr/bin:/bin /usr/local/bin/node /usr/local/lib/node_modules/npm/bin/npm-cli.js exec --workspace frontend tsx scripts/import-supabase-archive.ts
PATH=/usr/local/bin:/usr/bin:/bin /usr/local/bin/node /usr/local/lib/node_modules/npm/bin/npm-cli.js exec --workspace frontend tsx scripts/verify-supabase-migration.ts
```

Expected:
- Both commands exit successfully.

## Task 3: Move Collection Totals to Supabase Counts

**Files:**
- Modify: `/Users/amritesh/Desktop/code/AHG/frontend/src/entities/collection/api/collectionService.supabase.ts`
- Create: `/Users/amritesh/Desktop/code/AHG/frontend/src/entities/collection/api/collectionService.supabase.test.ts`
- Modify: `/Users/amritesh/Desktop/code/AHG/frontend/src/shared/services/supabase.ts`

- [ ] **Step 1: Write the failing collection totals tests**

Run:
```bash
PATH=/usr/local/bin:/usr/bin:/bin /usr/local/bin/node /usr/local/lib/node_modules/npm/bin/npm-cli.js run test --workspace frontend -- src/entities/collection/api/collectionService.supabase.test.ts
```

Expected:
- Fails because `itemCount` still comes from row scan length, not `supabaseCount`.

- [ ] **Step 2: Replace collection item totals with `supabaseCount`**

Keep only material aggregation from selected item rows. Use `supabaseCount('items', ...)` for public item totals per collection.

- [ ] **Step 3: Run the collection service tests**

Run:
```bash
PATH=/usr/local/bin:/usr/bin:/bin /usr/local/bin/node /usr/local/lib/node_modules/npm/bin/npm-cli.js run test --workspace frontend -- src/entities/collection/api/collectionService.supabase.test.ts
```

Expected:
- PASS.

## Task 4: Improve Supabase Search, Tags, and Related Items

**Files:**
- Modify: `/Users/amritesh/Desktop/code/AHG/frontend/src/entities/item/api/itemService.supabase.ts`
- Modify: `/Users/amritesh/Desktop/code/AHG/frontend/src/entities/item/api/itemService.ts`
- Modify: `/Users/amritesh/Desktop/code/AHG/frontend/src/backend-support/mappers/normalizeArchiveItem.ts`
- Test: `/Users/amritesh/Desktop/code/AHG/frontend/src/entities/item/api/itemService.test.ts`

- [ ] **Step 1: Add failing/targeted tests for Supabase-first item behavior**

Extend tests to cover:
- related item fallback from `record_relations`
- tag matching against canonical/public tags
- stable sorting behavior with Supabase-backed items

- [ ] **Step 2: Tighten Supabase item service behavior**

Implement:
- media-backed item normalization
- `record_relations` primary path for related items
- same-type / same-collection fallback only when no stored relations exist
- better tag matching based on canonical/public tag arrays

- [ ] **Step 3: Keep item service fallback explicit**

In `/frontend/src/entities/item/api/itemService.ts`, keep Supabase as the clear primary path and Firebase as legacy fallback only.

- [ ] **Step 4: Run focused item service tests**

Run:
```bash
PATH=/usr/local/bin:/usr/bin:/bin /usr/local/bin/node /usr/local/lib/node_modules/npm/bin/npm-cli.js run test --workspace frontend -- src/entities/item/api/itemService.test.ts
```

Expected:
- PASS.

## Task 5: Update Category and Search UX Data Sources

**Files:**
- Modify: `/Users/amritesh/Desktop/code/AHG/frontend/src/entities/category/api/categoryService.ts`
- Modify: `/Users/amritesh/Desktop/code/AHG/frontend/src/pages/home/HomePage.tsx`
- Modify: `/Users/amritesh/Desktop/code/AHG/frontend/src/pages/collection-detail/CollectionDetailPage.tsx`
- Modify: `/Users/amritesh/Desktop/code/AHG/frontend/src/features/collection-browser/components/CollectionFilters.tsx`

- [ ] **Step 1: Audit current pages for Firebase-era assumptions**

Check that:
- collection totals come from Supabase collection service
- category totals use `category_pages.item_count`
- filter UIs use public tags/materials from Supabase-backed item rows

- [ ] **Step 2: Make search/filter UX lean on Supabase-derived data**

Implement:
- counts shown from Supabase-backed collection/category services
- tag/filter chips based on canonical/public tags
- avoid client-side registry assumptions when Supabase data is available

- [ ] **Step 3: Run frontend test/build verification**

Run:
```bash
PATH=/usr/local/bin:/usr/bin:/bin /usr/local/bin/node /usr/local/lib/node_modules/npm/bin/npm-cli.js run test --workspace frontend
PATH=/usr/local/bin:/usr/bin:/bin /usr/local/bin/node /usr/local/lib/node_modules/npm/bin/npm-cli.js run build --workspace frontend
```

Expected:
- Tests pass
- Build passes

## Task 6: Update Cataloguer/Crew Modules for Supabase-First Reality

**Files:**
- Modify: `/Users/amritesh/Desktop/code/AHG/backend/coin_cataloguer/crew.py`
- Modify: `/Users/amritesh/Desktop/code/AHG/backend/coin_cataloguer/main.py`
- Modify: `/Users/amritesh/Desktop/code/AHG/backend/coin_cataloguer/batch_ingest.py`
- Modify: `/Users/amritesh/Desktop/code/AHG/backend/coin_cataloguer/enrich_collection.py`
- Modify: `/Users/amritesh/Desktop/code/AHG/backend/coin_cataloguer/tools/firebase_uploader.py`
- Create: `/Users/amritesh/Desktop/code/AHG/backend/coin_cataloguer/tests/test_supabase_transition.py`

- [ ] **Step 1: Write the failing backend wording test**

Run:
```bash
PATH=/bin:/usr/bin /Users/amritesh/Desktop/code/AHG/backend/.venv/bin/python -m pytest /Users/amritesh/Desktop/code/AHG/backend/coin_cataloguer/tests/test_supabase_transition.py
```

Expected:
- FAIL because current crew/task wording still describes Firebase metadata as the destination.

- [ ] **Step 2: Update docstrings/help text and legacy uploader descriptions**

Requirements:
- state clearly that metadata is normalized into Supabase
- state clearly that Firebase Storage remains the media store
- preserve compatibility behavior for existing legacy uploader entry points

- [ ] **Step 3: Run focused backend tests**

Run:
```bash
PATH=/bin:/usr/bin /Users/amritesh/Desktop/code/AHG/backend/.venv/bin/python -m pytest /Users/amritesh/Desktop/code/AHG/backend/coin_cataloguer/tests/test_crew.py /Users/amritesh/Desktop/code/AHG/backend/coin_cataloguer/tests/test_supabase_transition.py
```

Expected:
- PASS.

## Task 7: Final Verification and Surgical Commit

**Files:**
- Modify only the rollout slice:
  - `/Users/amritesh/Desktop/code/AHG/frontend/scripts/import-supabase-archive.ts`
  - `/Users/amritesh/Desktop/code/AHG/frontend/scripts/verify-supabase-migration.ts`
  - `/Users/amritesh/Desktop/code/AHG/frontend/src/shared/lib/archiveRelations.ts`
  - `/Users/amritesh/Desktop/code/AHG/frontend/src/shared/lib/archiveRelations.test.ts`
  - `/Users/amritesh/Desktop/code/AHG/frontend/src/shared/services/supabase.ts`
  - `/Users/amritesh/Desktop/code/AHG/frontend/src/entities/collection/api/collectionService.supabase.ts`
  - `/Users/amritesh/Desktop/code/AHG/frontend/src/entities/collection/api/collectionService.supabase.test.ts`
  - `/Users/amritesh/Desktop/code/AHG/frontend/src/entities/category/api/categoryService.ts`
  - `/Users/amritesh/Desktop/code/AHG/frontend/src/entities/item/api/itemService.supabase.ts`
  - `/Users/amritesh/Desktop/code/AHG/frontend/src/entities/item/api/itemService.ts`
  - `/Users/amritesh/Desktop/code/AHG/frontend/src/backend-support/mappers/normalizeArchiveItem.ts`
  - `/Users/amritesh/Desktop/code/AHG/backend/coin_cataloguer/crew.py`
  - `/Users/amritesh/Desktop/code/AHG/backend/coin_cataloguer/main.py`
  - `/Users/amritesh/Desktop/code/AHG/backend/coin_cataloguer/batch_ingest.py`
  - `/Users/amritesh/Desktop/code/AHG/backend/coin_cataloguer/enrich_collection.py`
  - `/Users/amritesh/Desktop/code/AHG/backend/coin_cataloguer/tools/firebase_uploader.py`
  - `/Users/amritesh/Desktop/code/AHG/backend/coin_cataloguer/tests/test_supabase_transition.py`

- [ ] **Step 1: Re-run migration verification**

Run:
```bash
PATH=/usr/local/bin:/usr/bin:/bin /usr/local/bin/node /usr/local/lib/node_modules/npm/bin/npm-cli.js exec --workspace frontend tsx scripts/import-supabase-archive.ts
PATH=/usr/local/bin:/usr/bin:/bin /usr/local/bin/node /usr/local/lib/node_modules/npm/bin/npm-cli.js exec --workspace frontend tsx scripts/verify-supabase-migration.ts
```

- [ ] **Step 2: Re-run app verification**

Run:
```bash
PATH=/usr/local/bin:/usr/bin:/bin /usr/local/bin/node /usr/local/lib/node_modules/npm/bin/npm-cli.js run test --workspace frontend
PATH=/usr/local/bin:/usr/bin:/bin /usr/local/bin/node /usr/local/lib/node_modules/npm/bin/npm-cli.js run build --workspace frontend
PATH=/bin:/usr/bin /Users/amritesh/Desktop/code/AHG/backend/.venv/bin/python -m pytest /Users/amritesh/Desktop/code/AHG/backend/coin_cataloguer/tests/test_crew.py /Users/amritesh/Desktop/code/AHG/backend/coin_cataloguer/tests/test_supabase_transition.py
```

- [ ] **Step 3: Deploy**

Run:
```bash
PATH=/usr/local/bin:/usr/bin:/bin /usr/local/bin/node /usr/local/lib/node_modules/npm/bin/npm-cli.js run deploy:firebase
```

- [ ] **Step 4: Surgical commit**

Run:
```bash
/usr/bin/git add \
  frontend/scripts/import-supabase-archive.ts \
  frontend/scripts/verify-supabase-migration.ts \
  frontend/src/shared/lib/archiveRelations.ts \
  frontend/src/shared/lib/archiveRelations.test.ts \
  frontend/src/shared/services/supabase.ts \
  frontend/src/entities/collection/api/collectionService.supabase.ts \
  frontend/src/entities/collection/api/collectionService.supabase.test.ts \
  frontend/src/entities/category/api/categoryService.ts \
  frontend/src/entities/item/api/itemService.supabase.ts \
  frontend/src/entities/item/api/itemService.ts \
  frontend/src/backend-support/mappers/normalizeArchiveItem.ts \
  backend/coin_cataloguer/crew.py \
  backend/coin_cataloguer/main.py \
  backend/coin_cataloguer/batch_ingest.py \
  backend/coin_cataloguer/enrich_collection.py \
  backend/coin_cataloguer/tools/firebase_uploader.py \
  backend/coin_cataloguer/tests/test_supabase_transition.py \
  docs/superpowers/plans/2026-04-04-supabase-search-tagging-ux.md
/usr/bin/git commit -m "feat: improve supabase search tagging and archive relations"
```

Expected:
- Only the rollout slice is committed.

