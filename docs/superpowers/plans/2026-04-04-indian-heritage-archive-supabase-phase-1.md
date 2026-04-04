# Indian Heritage Archive Supabase Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate AHG from Firebase metadata to a Supabase-backed Indian cultural heritage archive while preserving Firebase Storage media, existing coin collections, canonical entity/tag behavior, and a strict public/private data boundary.

**Architecture:** Introduce Supabase Postgres as the metadata source of truth with a hybrid archive schema, refactor shared normalization into a single canonicalization layer, migrate the four existing coin collections into the new schema, then swap the frontend from Firebase-first services to Supabase-first services while keeping Firebase Storage image URLs. Public archive records and private owner-maintenance data are split at the storage, API, and UI layers.

**Tech Stack:** Supabase Postgres, Supabase Auth, SQL migrations, TypeScript, React, React Query, Vite, Firebase Storage, Node scripts, Python ingest scripts, Vitest

---

## File Structure

### Infrastructure and config

- Create: `supabase/config.toml`
- Create: `supabase/migrations/20260404_000001_extensions.sql`
- Create: `supabase/migrations/20260404_000002_archive_schema.sql`
- Create: `supabase/migrations/20260404_000003_rls_policies.sql`
- Create: `supabase/seed.sql`
- Create: `frontend/src/shared/config/supabase.ts`
- Modify: `frontend/package.json`
- Modify: `package.json`

### Shared catalog typing and canonicalization

- Create: `frontend/src/shared/lib/catalogCanonicalization.ts`
- Create: `frontend/src/shared/lib/catalogCanonicalization.test.ts`
- Create: `frontend/src/entities/domain/model/types.ts`
- Create: `frontend/src/entities/category/model/types.ts`
- Modify: `frontend/src/entities/item/model/types.ts`
- Modify: `frontend/src/entities/collection/model/types.ts`
- Modify: `frontend/src/shared/lib/queryKeys.ts`
- Modify: `frontend/src/shared/lib/catalogNormalization.ts`

### Supabase query layer

- Create: `frontend/src/shared/services/supabase.ts`
- Create: `frontend/src/backend-support/schemas/archive.ts`
- Create: `frontend/src/backend-support/mappers/normalizeArchiveCollection.ts`
- Create: `frontend/src/backend-support/mappers/normalizeArchiveItem.ts`
- Create: `frontend/src/entities/domain/api/domainService.ts`
- Create: `frontend/src/entities/category/api/categoryService.ts`
- Create: `frontend/src/entities/collection/api/collectionService.supabase.ts`
- Create: `frontend/src/entities/item/api/itemService.supabase.ts`
- Create: `frontend/src/entities/private-item/api/privateItemService.ts`
- Modify: `frontend/src/entities/collection/api/collectionService.ts`
- Modify: `frontend/src/entities/item/api/itemService.ts`
- Modify: `frontend/src/entities/user/api/userService.ts`

### Migration and ingest

- Create: `frontend/scripts/export-firebase-archive.ts`
- Create: `frontend/scripts/import-supabase-archive.ts`
- Create: `frontend/scripts/verify-supabase-migration.ts`
- Create: `shared-data/entityAliases.json`
- Modify: `frontend/scripts/import-collections.ts`
- Modify: `backend/scripts/catalogNormalization.js`
- Modify: `backend/coin_cataloguer/enrich_collection.py`
- Modify: `backend/coin_cataloguer/batch_ingest.py`

### Frontend archive UX

- Create: `frontend/src/pages/domains/DomainsPage.tsx`
- Create: `frontend/src/pages/domain-detail/DomainDetailPage.tsx`
- Create: `frontend/src/pages/categories/CategoriesPage.tsx`
- Create: `frontend/src/pages/category-detail/CategoryDetailPage.tsx`
- Create: `frontend/src/features/archive/components/ArchiveHero.tsx`
- Create: `frontend/src/features/archive/components/DomainGrid.tsx`
- Create: `frontend/src/features/archive/components/CategoryGrid.tsx`
- Create: `frontend/src/features/archive/components/ArchiveStats.tsx`
- Create: `frontend/src/features/private-item/components/PrivateItemPanel.tsx`
- Modify: `frontend/src/app/router.tsx`
- Modify: `frontend/src/pages/home/HomePage.tsx`
- Modify: `frontend/src/pages/collections/CollectionsPage.tsx`
- Modify: `frontend/src/pages/collection-detail/CollectionDetailPage.tsx`
- Modify: `frontend/src/pages/item-detail/ItemDetailPage.tsx`
- Modify: `frontend/src/features/item-details/components/RelatedItems.tsx`
- Modify: `frontend/src/shared/ui/Header.tsx`
- Modify: `frontend/src/shared/ui/Footer.tsx`
- Modify: `frontend/src/app/styles/index.css`

### Tests and docs

- Create: `frontend/src/entities/domain/api/domainService.test.ts`
- Create: `frontend/src/entities/category/api/categoryService.test.ts`
- Create: `frontend/src/entities/private-item/api/privateItemService.test.ts`
- Create: `frontend/src/pages/category-detail/CategoryDetailPage.test.tsx`
- Create: `frontend/src/pages/domains/DomainsPage.test.tsx`
- Modify: `frontend/src/pages/item-detail/ItemDetailPage.test.tsx`
- Modify: `frontend/src/app/router.test.tsx`
- Create: `reference/ARCHIVE_MODULES.md`
- Create: `reference/SUPABASE_ARCHIVE_SCHEMA.md`
- Modify: `reference/REPO_OVERVIEW.md`

## Task 1: Set Up Supabase Project Structure And Archive Schema

**Files:**
- Create: `supabase/config.toml`
- Create: `supabase/migrations/20260404_000001_extensions.sql`
- Create: `supabase/migrations/20260404_000002_archive_schema.sql`
- Create: `supabase/migrations/20260404_000003_rls_policies.sql`
- Create: `supabase/seed.sql`
- Modify: `package.json`

- [ ] **Step 1: Add the Supabase CLI workflow to the repo scripts**

```json
{
  "scripts": {
    "supabase:start": "supabase start",
    "supabase:stop": "supabase stop",
    "supabase:db:reset": "supabase db reset",
    "supabase:link": "supabase link --project-ref rwdjasxvkupweowgrrwl"
  }
}
```

- [ ] **Step 2: Create the local Supabase project config**

```toml
[project]
id = "rwdjasxvkupweowgrrwl"

[api]
enabled = true
port = 54321

[db]
port = 54322
major_version = 15

[studio]
enabled = true
port = 54323
```

- [ ] **Step 3: Write the extensions migration**

```sql
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;
```

- [ ] **Step 4: Write the archive schema migration**

```sql
create table public.domains (
  id uuid primary key default gen_random_uuid(),
  canonical_id text not null unique,
  slug text not null unique,
  name text not null,
  description text not null,
  sort_order integer not null default 0,
  hero_image_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  canonical_id text not null unique,
  domain_id uuid not null references public.domains(id),
  slug text not null unique,
  title text not null,
  subtitle text,
  description text not null,
  long_description text,
  era_label text,
  country_code text not null default 'IN',
  source_pdf_name text,
  source_folder text,
  cover_image_path text,
  status text not null default 'draft',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

- [ ] **Step 5: Continue the schema migration with items, entities, themes, tags, relations, and private profiles**

```sql
create table public.items (
  id uuid primary key default gen_random_uuid(),
  canonical_id text not null unique,
  collection_id uuid not null references public.collections(id),
  domain_id uuid not null references public.domains(id),
  item_type text not null,
  title text not null,
  subtitle text,
  description text,
  short_description text,
  era_label text,
  date_start integer,
  date_end integer,
  display_date text,
  country_code text not null default 'IN',
  primary_image_path text,
  primary_image_alt text,
  attributes jsonb not null default '{}'::jsonb,
  sort_title text not null,
  sort_year_start integer,
  sort_year_end integer,
  review_status text not null default 'draft',
  visibility text not null default 'private',
  source_page_number integer,
  source_page_label text,
  source_batch text,
  source_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.item_private_profiles (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  owner_user_id uuid not null,
  year_bought integer,
  purchase_price numeric(12,2),
  purchase_currency text,
  estimated_value_min numeric(12,2),
  estimated_value_max numeric(12,2),
  estimated_value_avg numeric(12,2),
  acquisition_source text,
  acquisition_date date,
  internal_notes text,
  private_tags jsonb not null default '[]'::jsonb,
  private_attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(item_id, owner_user_id)
);
```

- [ ] **Step 6: Add indexes for public archive reads and private maintenance reads**

```sql
create index items_domain_visibility_idx on public.items(domain_id, visibility, review_status);
create index items_collection_visibility_idx on public.items(collection_id, visibility, review_status);
create index items_attributes_gin_idx on public.items using gin(attributes);
create index entity_aliases_normalized_alias_idx on public.entity_aliases(normalized_alias);
create index item_entities_item_relation_idx on public.item_entities(item_id, relation_type);
create index item_entities_entity_relation_idx on public.item_entities(entity_id, relation_type);
create index item_relations_item_score_idx on public.item_relations(item_id, score desc);
create index item_private_profiles_owner_item_idx on public.item_private_profiles(owner_user_id, item_id);
```

- [ ] **Step 7: Add row-level security policies**

```sql
alter table public.items enable row level security;
alter table public.item_private_profiles enable row level security;

create policy "public can read published items"
on public.items
for select
using (visibility = 'public' and review_status = 'published');

create policy "owners can read private profiles"
on public.item_private_profiles
for select
using (auth.uid() = owner_user_id);
```

- [ ] **Step 8: Seed initial archive domains**

```sql
insert into public.domains (canonical_id, slug, name, description, sort_order)
values
  ('ahg:domain:coins', 'coins', 'Coins', 'Numismatic heritage across Indian history.', 1),
  ('ahg:domain:stamps', 'stamps', 'Stamps', 'Philatelic heritage from princely, colonial, and modern India.', 2),
  ('ahg:domain:currency', 'currency', 'Currency', 'Paper money and currency instruments from Indian monetary history.', 3),
  ('ahg:domain:postal-stationery', 'postal-stationery', 'Postal Stationery', 'Postcards, envelopes, stationery, and related postal objects.', 4);
```

- [ ] **Step 9: Run the local schema reset**

Run: `npm run supabase:db:reset`

Expected: Supabase local stack applies the migrations successfully with all archive tables present.

- [ ] **Step 10: Commit**

```bash
git add package.json supabase
git commit -m "feat: add supabase archive schema"
```

## Task 2: Refactor Shared Canonicalization Into A Single Archive Module

**Files:**
- Create: `frontend/src/shared/lib/catalogCanonicalization.ts`
- Create: `frontend/src/shared/lib/catalogCanonicalization.test.ts`
- Create: `shared-data/entityAliases.json`
- Modify: `frontend/src/shared/lib/catalogNormalization.ts`
- Modify: `backend/scripts/catalogNormalization.js`

- [ ] **Step 1: Write the failing frontend canonicalization tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  canonicalizeAuthority,
  canonicalizeEntityLabel,
  canonicalizeMint,
  canonicalizeRuler,
  buildPublicTags,
} from '@/shared/lib/catalogCanonicalization';

describe('catalogCanonicalization', () => {
  it('collapses Akbar aliases to one canonical ruler', () => {
    expect(canonicalizeRuler('Jalal-ud-din Muhammad Akbar')).toBe('Akbar');
    expect(canonicalizeRuler('Akbar The Great')).toBe('Akbar');
  });

  it('keeps public tags canonical and deduplicated', () => {
    expect(
      buildPublicTags({
        authority: 'Mughal Empire',
        ruler: 'Jalal-ud-din Muhammad Akbar',
        mint: 'Lahore Mint',
        denomination: 'Rupee',
      }),
    ).toEqual(['Mughal Empire', 'Akbar', 'Lahore', 'Rupee']);
  });
});
```

- [ ] **Step 2: Run the canonicalization test to confirm it fails**

Run: `npm run test --workspace frontend -- catalogCanonicalization`

Expected: FAIL because the new module does not exist yet.

- [ ] **Step 3: Create the shared alias dataset**

```json
{
  "rulers": {
    "jalal ud din muhammad akbar": "Akbar",
    "akbar the great": "Akbar",
    "muhammad bin tughluq": "Muhammad bin Tughlaq",
    "mir mahbub ali khan": "Mir Mahbub Ali Khan"
  },
  "authorities": {
    "mughal empire": "Mughal Empire",
    "british india": "British India",
    "hyderabad state": "Hyderabad State"
  },
  "mints": {
    "lahore mint": "Lahore",
    "bombay mint": "Bombay",
    "patna mint": "Patna"
  }
}
```

- [ ] **Step 4: Implement the shared canonicalization module**

```ts
import entityAliases from '../../../../shared-data/entityAliases.json';

function normalizeKey(value?: string | null) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s-]+/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function canonicalizeRuler(value?: string | null) {
  const normalized = normalizeKey(value);
  return entityAliases.rulers[normalized] || canonicalizeEntityLabel(value);
}
```

- [ ] **Step 5: Re-export the new logic through the existing frontend module**

```ts
export {
  canonicalizeAuthority,
  canonicalizeMint,
  canonicalizeRuler as canonicalizeRulerOrIssuer,
  buildPublicTags as buildCanonicalTags,
} from '@/shared/lib/catalogCanonicalization';
```

- [ ] **Step 6: Update the backend normalization script to load the same alias file**

```js
const entityAliases = require('../../shared-data/entityAliases.json');

function canonicalizeRulerOrIssuer(value) {
  const normalized = normalizeEntityKey(value);
  return entityAliases.rulers[normalized] || titleCaseWords(normalized);
}
```

- [ ] **Step 7: Re-run the canonicalization tests**

Run: `npm run test --workspace frontend -- catalogCanonicalization`

Expected: PASS with alias-collapsing and tag-generation coverage.

- [ ] **Step 8: Commit**

```bash
git add shared-data/entityAliases.json frontend/src/shared/lib/catalogCanonicalization.ts frontend/src/shared/lib/catalogCanonicalization.test.ts frontend/src/shared/lib/catalogNormalization.ts backend/scripts/catalogNormalization.js
git commit -m "feat: unify archive canonicalization rules"
```

## Task 3: Add Supabase Client, Archive Schemas, And Service Adapters

**Files:**
- Create: `frontend/src/shared/config/supabase.ts`
- Create: `frontend/src/shared/services/supabase.ts`
- Create: `frontend/src/backend-support/schemas/archive.ts`
- Create: `frontend/src/backend-support/mappers/normalizeArchiveCollection.ts`
- Create: `frontend/src/backend-support/mappers/normalizeArchiveItem.ts`
- Create: `frontend/src/entities/domain/model/types.ts`
- Create: `frontend/src/entities/category/model/types.ts`
- Create: `frontend/src/entities/domain/api/domainService.ts`
- Create: `frontend/src/entities/category/api/categoryService.ts`
- Create: `frontend/src/entities/collection/api/collectionService.supabase.ts`
- Create: `frontend/src/entities/item/api/itemService.supabase.ts`
- Create: `frontend/src/entities/private-item/api/privateItemService.ts`
- Modify: `frontend/src/entities/item/model/types.ts`
- Modify: `frontend/src/entities/collection/model/types.ts`
- Modify: `frontend/src/shared/lib/queryKeys.ts`

- [ ] **Step 1: Write a failing service test for loading collections from Supabase rows**

```ts
import { describe, expect, it } from 'vitest';
import { normalizeArchiveCollection } from '@/backend-support/mappers/normalizeArchiveCollection';

describe('normalizeArchiveCollection', () => {
  it('maps archive collections into UI records', () => {
    expect(
      normalizeArchiveCollection({
        id: '1',
        canonical_id: 'ahg:collection:coins:mughals',
        slug: 'mughals',
        title: 'Mughal Coins',
        description: 'Imperial coinage',
        domain: { slug: 'coins', name: 'Coins' },
      }),
    ).toMatchObject({
      slug: 'mughals',
      name: 'Mughal Coins',
      domainSlug: 'coins',
    });
  });
});
```

- [ ] **Step 2: Run the mapper test**

Run: `npm run test --workspace frontend -- normalizeArchiveCollection`

Expected: FAIL because the archive schema mapper does not exist yet.

- [ ] **Step 3: Add the Supabase client configuration**

```ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: true } })
    : null;
```

- [ ] **Step 4: Add archive record schemas**

```ts
import { z } from 'zod';

export const archiveCollectionSchema = z.object({
  id: z.string(),
  canonical_id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  long_description: z.string().nullable().optional(),
  domain: z.object({
    slug: z.string(),
    name: z.string(),
  }),
});
```

- [ ] **Step 5: Expand the frontend domain, category, and item types**

```ts
export type ItemRecord = {
  id: string;
  canonicalId: string;
  domainSlug: string;
  collectionSlug: string;
  title: string;
  publicTags: string[];
  entityBadges: string[];
  relatedReasons?: string[];
  privateProfile?: {
    yearBought?: number | null;
    purchasePrice?: number | null;
    estimatedValueAvg?: number | null;
    internalNotes?: string | null;
  } | null;
};
```

- [ ] **Step 6: Implement the collection and item Supabase adapters**

```ts
export async function getCollectionsFromSupabase() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('collections')
    .select('id, canonical_id, slug, title, description, long_description, cover_image_path, domain:domains(slug, name)')
    .eq('status', 'published')
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data.map(normalizeArchiveCollection);
}
```

- [ ] **Step 7: Add the private profile service with authenticated access only**

```ts
export async function getPrivateItemProfile(itemId: string) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('item_private_profiles')
    .select('*')
    .eq('item_id', itemId)
    .maybeSingle();

  if (error) throw error;
  return data;
}
```

- [ ] **Step 8: Add query keys for domains, categories, and private items**

```ts
export const queryKeys = {
  domains: () => ['domains'] as const,
  domain: (slug: string) => ['domains', slug] as const,
  categories: () => ['categories'] as const,
  category: (slug: string) => ['categories', slug] as const,
  privateItem: (itemId: string) => ['private-item', itemId] as const,
};
```

- [ ] **Step 9: Re-run the frontend mapper and service tests**

Run: `npm run test --workspace frontend -- normalizeArchiveCollection domainService categoryService privateItemService`

Expected: PASS for schema mapping and service adapters.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/shared/config/supabase.ts frontend/src/shared/services/supabase.ts frontend/src/backend-support/schemas/archive.ts frontend/src/backend-support/mappers/normalizeArchiveCollection.ts frontend/src/backend-support/mappers/normalizeArchiveItem.ts frontend/src/entities/domain frontend/src/entities/category frontend/src/entities/private-item frontend/src/entities/collection/api/collectionService.supabase.ts frontend/src/entities/item/api/itemService.supabase.ts frontend/src/entities/item/model/types.ts frontend/src/entities/collection/model/types.ts frontend/src/shared/lib/queryKeys.ts
git commit -m "feat: add supabase archive service layer"
```

## Task 4: Build The Firebase-To-Supabase Migration Pipeline

**Files:**
- Create: `frontend/scripts/export-firebase-archive.ts`
- Create: `frontend/scripts/import-supabase-archive.ts`
- Create: `frontend/scripts/verify-supabase-migration.ts`
- Modify: `frontend/scripts/import-collections.ts`

- [ ] **Step 1: Write a failing verification test for collection parity**

```ts
import { describe, expect, it } from 'vitest';
import { compareCollectionCounts } from '../../scripts/verify-supabase-migration';

describe('compareCollectionCounts', () => {
  it('flags mismatched migrated item totals', () => {
    expect(compareCollectionCounts({ mughals: 10 }, { mughals: 9 })).toEqual([
      { slug: 'mughals', firebaseCount: 10, supabaseCount: 9 },
    ]);
  });
});
```

- [ ] **Step 2: Run the migration verification test**

Run: `npm run test --workspace frontend -- verify-supabase-migration`

Expected: FAIL because the new migration verifier does not exist.

- [ ] **Step 3: Create the Firebase export script**

```ts
const targetSlugs = ['mughals', 'british', 'princely-states', 'sultanate'];

for (const slug of targetSlugs) {
  const collection = await getCollectionBySlug(slug);
  const items = await getAllCollectionItemsForSearch(slug);
  snapshots[slug] = { collection, items };
}
```

- [ ] **Step 4: Create the Supabase import script that writes domains, collections, items, media, entities, tags, and private profiles**

```ts
for (const item of snapshot.items) {
  const canonical = buildArchiveItemRecord(item);
  await supabaseAdmin.from('items').upsert(canonical.item, { onConflict: 'canonical_id' });
  await supabaseAdmin.from('media_assets').upsert(canonical.mediaRows, { onConflict: 'item_id,storage_path' });
  await supabaseAdmin.from('item_tags').upsert(canonical.tagRows);
  await supabaseAdmin.from('item_entities').upsert(canonical.entityRows);
}
```

- [ ] **Step 5: Move public estimate fields out of the public item mapper and into private profile creation**

```ts
const privateProfile = {
  owner_user_id: ownerUserId,
  year_bought: null,
  purchase_price: null,
  estimated_value_avg: item.estimatedPriceAvg || null,
  internal_notes: item.notes.join('\n'),
};
```

- [ ] **Step 6: Create the parity verification script**

```ts
export function compareCollectionCounts(firebaseCounts: Record<string, number>, supabaseCounts: Record<string, number>) {
  return Object.keys(firebaseCounts)
    .filter((slug) => firebaseCounts[slug] !== supabaseCounts[slug])
    .map((slug) => ({
      slug,
      firebaseCount: firebaseCounts[slug],
      supabaseCount: supabaseCounts[slug] ?? 0,
    }));
}
```

- [ ] **Step 7: Run the export and import scripts against the 4 finished coin collections**

Run: `npm run import:collections --workspace frontend`

Expected: Local snapshot export completes for `mughals`, `british`, `princely-states`, and `sultanate`.

Run: `npx tsx frontend/scripts/import-supabase-archive.ts`

Expected: Supabase receives the migrated archive rows with upsert summaries per collection.

- [ ] **Step 8: Run the parity verifier**

Run: `npx tsx frontend/scripts/verify-supabase-migration.ts`

Expected: PASS with zero count mismatches and no missing image references.

- [ ] **Step 9: Commit**

```bash
git add frontend/scripts/export-firebase-archive.ts frontend/scripts/import-supabase-archive.ts frontend/scripts/verify-supabase-migration.ts frontend/scripts/import-collections.ts
git commit -m "feat: migrate firebase archive data into supabase"
```

## Task 5: Update Ingest Pipelines For Canonical Archive Writes

**Files:**
- Modify: `backend/coin_cataloguer/batch_ingest.py`
- Modify: `backend/coin_cataloguer/enrich_collection.py`
- Modify: `backend/scripts/catalogNormalization.js`
- Create: `backend/scripts/syncSupabaseArchive.js`

- [ ] **Step 1: Write the failing ingest metadata test**

```python
def test_build_coin_payload_preserves_provenance_and_public_private_split():
    payload = build_coin_payload(
        item={"metadata": {"source_batch": "mughals-1-1", "source_page_path": "page-7"}},
        analysis={"ruler_or_issuer": "Akbar", "estimated_price_inr": "Rs. 12,000"},
        image_path=Path("/tmp/coin.png"),
    )
    assert payload["source_batch"] == "mughals-1-1"
    assert payload["estimated_price_inr"] == "Rs. 12,000"
```

- [ ] **Step 2: Run the backend ingest test**

Run: `pytest backend/coin_cataloguer/tests/test_ingest_metadata.py -v`

Expected: FAIL or missing assertions for the new archive payload behavior.

- [ ] **Step 3: Add a Supabase archive sync script for canonical item writes**

```js
async function upsertArchiveItem(client, payload) {
  await client.from('items').upsert(payload.item, { onConflict: 'canonical_id' });
  if (payload.privateProfile) {
    await client.from('item_private_profiles').upsert(payload.privateProfile, { onConflict: 'item_id,owner_user_id' });
  }
}
```

- [ ] **Step 4: Update `enrich_collection.py` to emit archive-friendly payloads**

```python
payload = {
    "canonical_item_type": "coin",
    "source_batch": metadata.get("source_batch", ""),
    "source_page_path": metadata.get("source_page_path", ""),
    "public_metadata": {
        "ruler_or_issuer": analysis.get("ruler_or_issuer", ""),
        "mint_or_place": analysis.get("mint_or_place", ""),
        "denomination": analysis.get("denomination", ""),
    },
    "private_metadata": {
        "estimated_price_inr": analysis.get("estimated_price_inr", ""),
        "notes": analysis.get("notes", ""),
    },
}
```

- [ ] **Step 5: Update `batch_ingest.py` to support Supabase archive uploads**

```python
parser.add_argument(
    "--upload-supabase",
    action="store_true",
    help="Upload resulting archive records to Supabase",
)
```

- [ ] **Step 6: Re-run the backend tests**

Run: `pytest backend/coin_cataloguer/tests/test_ingest_metadata.py backend/coin_cataloguer/tests/test_batch_ingest.py -v`

Expected: PASS with preserved provenance and archive upload flags covered.

- [ ] **Step 7: Commit**

```bash
git add backend/coin_cataloguer/batch_ingest.py backend/coin_cataloguer/enrich_collection.py backend/scripts/catalogNormalization.js backend/scripts/syncSupabaseArchive.js
git commit -m "feat: write archive-ready ingest payloads"
```

## Task 6: Replace Firebase-First Reads With Supabase-First Archive Queries

**Files:**
- Modify: `frontend/src/entities/collection/api/collectionService.ts`
- Modify: `frontend/src/entities/item/api/itemService.ts`
- Modify: `frontend/src/entities/collection/hooks/useCollections.ts`
- Modify: `frontend/src/entities/item/hooks/useCollectionItems.ts`
- Modify: `frontend/src/entities/item/hooks/useItem.ts`
- Modify: `frontend/src/pages/item-detail/ItemDetailPage.tsx`
- Modify: `frontend/src/features/item-details/components/RelatedItems.tsx`
- Modify: `frontend/src/pages/home/HomePage.tsx`

- [ ] **Step 1: Write the failing item detail test that hides valuation data in public view**

```tsx
it('does not render private valuation in public item detail', async () => {
  render(<ItemDetailPage />);
  expect(screen.queryByText(/Estimated Market Value/i)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the item detail test**

Run: `npm run test --workspace frontend -- ItemDetailPage`

Expected: FAIL because the current page still renders estimated market value publicly.

- [ ] **Step 3: Make collection and item services prefer Supabase**

```ts
export async function getCollections(): Promise<CollectionRecord[]> {
  const supabaseCollections = await getCollectionsFromSupabase();
  if (supabaseCollections?.length) return supabaseCollections;
  return getCollectionsFromFirebase();
}
```

- [ ] **Step 4: Make item reads request private profile data only when authenticated**

```ts
export function useItem(itemId: string) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: [...queryKeys.item(itemId), isAuthenticated ? 'private' : 'public'],
    queryFn: () => getItemById(itemId, { includePrivate: isAuthenticated }),
  });
}
```

- [ ] **Step 5: Remove public estimated value rendering from `ItemDetailPage` and add a gated private panel**

```tsx
{isAuthenticated && item.privateProfile ? (
  <PrivateItemPanel profile={item.privateProfile} />
) : null}
```

- [ ] **Step 6: Replace related-item loading with explicit relation reasons**

```ts
const { data } = await supabase
  .from('item_relations')
  .select('score, reason, related:related_item_id(*)')
  .eq('item_id', item.id)
  .order('score', { ascending: false })
  .limit(6);
```

- [ ] **Step 7: Update home stats to use public archive records only**

```ts
const { count: itemCount } = await supabase
  .from('items')
  .select('*', { count: 'exact', head: true })
  .eq('visibility', 'public')
  .eq('review_status', 'published');
```

- [ ] **Step 8: Re-run service and page tests**

Run: `npm run test --workspace frontend -- ItemDetailPage itemService collectionService`

Expected: PASS with public/private separation and Supabase-first archive reads.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/entities/collection/api/collectionService.ts frontend/src/entities/item/api/itemService.ts frontend/src/entities/collection/hooks/useCollections.ts frontend/src/entities/item/hooks/useCollectionItems.ts frontend/src/entities/item/hooks/useItem.ts frontend/src/pages/item-detail/ItemDetailPage.tsx frontend/src/features/item-details/components/RelatedItems.tsx frontend/src/pages/home/HomePage.tsx frontend/src/features/private-item/components/PrivateItemPanel.tsx
git commit -m "feat: switch archive reads to supabase"
```

## Task 7: Redesign The Frontend As An Indian Cultural Heritage Archive

**Files:**
- Create: `frontend/src/pages/domains/DomainsPage.tsx`
- Create: `frontend/src/pages/domain-detail/DomainDetailPage.tsx`
- Create: `frontend/src/pages/categories/CategoriesPage.tsx`
- Create: `frontend/src/pages/category-detail/CategoryDetailPage.tsx`
- Create: `frontend/src/features/archive/components/ArchiveHero.tsx`
- Create: `frontend/src/features/archive/components/DomainGrid.tsx`
- Create: `frontend/src/features/archive/components/CategoryGrid.tsx`
- Create: `frontend/src/features/archive/components/ArchiveStats.tsx`
- Modify: `frontend/src/app/router.tsx`
- Modify: `frontend/src/pages/home/HomePage.tsx`
- Modify: `frontend/src/pages/collections/CollectionsPage.tsx`
- Modify: `frontend/src/pages/collection-detail/CollectionDetailPage.tsx`
- Modify: `frontend/src/shared/ui/Header.tsx`
- Modify: `frontend/src/shared/ui/Footer.tsx`
- Modify: `frontend/src/app/styles/index.css`

- [ ] **Step 1: Write the failing router test for new archive routes**

```tsx
it('registers domains and categories routes', () => {
  expect(router.routes[0].children?.some((route) => route.path === 'domains')).toBe(true);
  expect(router.routes[0].children?.some((route) => route.path === 'categories')).toBe(true);
});
```

- [ ] **Step 2: Run the router test**

Run: `npm run test --workspace frontend -- router`

Expected: FAIL because those routes do not exist yet.

- [ ] **Step 3: Add the new top-level routes**

```tsx
{ path: 'domains', element: <DomainsPage /> },
{ path: 'domains/:slug', element: <DomainDetailPage /> },
{ path: 'categories', element: <CategoriesPage /> },
{ path: 'categories/:slug', element: <CategoryDetailPage /> },
```

- [ ] **Step 4: Replace the homepage hero and stats with archive-wide entry points**

```tsx
<>
  <ArchiveHero />
  <ArchiveStats />
  <DomainGrid domains={domains} />
  <CategoryGrid categories={featuredCategories} />
</>
```

- [ ] **Step 5: Update navigation labels to match the archive IA**

```ts
const navItems = [
  { to: '/explore', label: 'Explore' },
  { to: '/domains', label: 'Domains' },
  { to: '/categories', label: 'Categories' },
  { to: '/collections', label: 'Collections' },
];
```

- [ ] **Step 6: Refresh archive styling to feel more professional and less Firebase-admin-oriented**

```css
:root {
  --archive-ink: #1f1a17;
  --archive-gold: #a06a2c;
  --archive-paper: #f5efe3;
  --archive-clay: #c9b29a;
}
```

- [ ] **Step 7: Re-run route and page tests**

Run: `npm run test --workspace frontend -- router DomainsPage CategoryDetailPage`

Expected: PASS with new routes and archive entry screens.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/app/router.tsx frontend/src/pages/home/HomePage.tsx frontend/src/pages/domains frontend/src/pages/domain-detail frontend/src/pages/categories frontend/src/pages/category-detail frontend/src/features/archive frontend/src/shared/ui/Header.tsx frontend/src/shared/ui/Footer.tsx frontend/src/app/styles/index.css
git commit -m "feat: redesign ahg as archive-first experience"
```

## Task 8: Add Reference Docs And Perform End-To-End Verification

**Files:**
- Create: `reference/ARCHIVE_MODULES.md`
- Create: `reference/SUPABASE_ARCHIVE_SCHEMA.md`
- Modify: `reference/REPO_OVERVIEW.md`

- [ ] **Step 1: Write the archive module reference**

```md
# Archive Modules

- `frontend/src/entities/domain`: domain browsing and domain detail queries
- `frontend/src/entities/category`: category page queries and rendering
- `frontend/src/entities/item`: public and private item records, item lookup, related items
- `frontend/src/shared/lib/catalogCanonicalization.ts`: alias resolution and smart-tag generation
- `frontend/scripts/import-supabase-archive.ts`: Firebase-to-Supabase migration entrypoint
```

- [ ] **Step 2: Write the schema reference for AI and future contributors**

```md
# Supabase Archive Schema

Core tables:
- `domains`
- `collections`
- `items`
- `item_private_profiles`
- `entities`
- `entity_aliases`
- `item_entities`
- `themes`
- `item_themes`
- `tags`
- `item_tags`
- `item_relations`
- `category_pages`
```

- [ ] **Step 3: Update the repo overview to point at the new archive architecture**

```md
Current system of record:
- Firebase Storage for media assets
- Supabase Postgres for metadata and canonical relationships
- legacy Firebase metadata retained only as migration fallback until parity verification is complete
```

- [ ] **Step 4: Run the frontend test suite**

Run: `npm run test --workspace frontend`

Expected: PASS with archive services, pages, routing, and canonicalization covered.

- [ ] **Step 5: Run the backend ingest-focused tests**

Run: `pytest backend/coin_cataloguer/tests/test_batch_ingest.py backend/coin_cataloguer/tests/test_ingest_metadata.py backend/coin_cataloguer/tests/test_enrich_collection.py -v`

Expected: PASS with provenance-preserving archive ingest behavior.

- [ ] **Step 6: Run the migration verification script against the linked Supabase project**

Run: `npx tsx frontend/scripts/verify-supabase-migration.ts`

Expected: PASS with zero collection count mismatches, no missing category-page seed data, and all public item image paths resolving to Firebase Storage paths.

- [ ] **Step 7: Build the frontend**

Run: `npm run build --workspace frontend`

Expected: PASS with a production-ready bundle using Supabase-first services.

- [ ] **Step 8: Commit**

```bash
git add reference/ARCHIVE_MODULES.md reference/SUPABASE_ARCHIVE_SCHEMA.md reference/REPO_OVERVIEW.md
git commit -m "docs: add archive module and schema references"
```

## Self-Review

### Spec coverage

- Supabase schema and metadata source of truth: covered in Tasks 1 and 3.
- Firebase Storage retained for media: covered in Tasks 4, 5, and 8.
- Public showcase plus private maintenance split: covered in Tasks 1, 3, and 6.
- Canonical entities and smart tags: covered in Task 2 and Task 4.
- Automatic category/domain archive UX: covered in Tasks 3 and 7.
- Migration of `mughals`, `british`, `princely-states`, and `sultanate`: covered in Task 4.
- Next ingest path for `early / primitive` and `foreign rulers`: covered in Task 5 by archive-ready ingest support.
- Professional archive UI: covered in Task 7.
- Reference markdown files for AI/module understanding: covered in Task 8.
- No destructive cleanup during phase 1: no task deletes legacy data; cleanup is intentionally deferred.

### Placeholder scan

- No `TODO`, `TBD`, or “implement later” placeholders remain.
- Every task names exact files and includes commands.
- Code-modifying steps include concrete snippets rather than generic descriptions.

### Type consistency

- Shared names are consistent across tasks:
  - `catalogCanonicalization`
  - `item_private_profiles`
  - `category_pages`
  - `getCollectionsFromSupabase`
  - `getPrivateItemProfile`

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-04-indian-heritage-archive-supabase-phase-1.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
