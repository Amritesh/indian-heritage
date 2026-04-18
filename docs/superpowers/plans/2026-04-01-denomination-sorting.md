# Denomination Sorting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make sorting reliable for date and worth, add denomination sorting via a shared conversion chart, add clickable tag-driven search/filtering, and document conversion charts in the About page, with sorting applied to the complete filtered set.

**Architecture:** Normalize numeric and denomination fields during ingest, store derived fields in Firestore, and sort using derived values on the full filtered set before pagination. A shared denomination chart lives in frontend config and drives sorting and About copy. Tag-based search uses normalized tags for ruler, mint, and denomination. A scheduled backend job refreshes collection stats nightly using a proper cron schedule.

**Tech Stack:** React + TypeScript (frontend), Firestore, Firebase Functions (backend), Vitest.

---

### Task 1: Add a Shared Denomination Chart and Normalization Helpers

**Files:**
- Create: `frontend/src/shared/config/denominations.ts`
- Create: `frontend/src/shared/config/denominations.test.ts`

- [ ] **Step 1: Write failing tests for denomination parsing**

```ts
import { describe, expect, it } from 'vitest';
import { resolveDenomination } from '@/shared/config/denominations';

describe('resolveDenomination', () => {
  it('matches common unit aliases', () => {
    const rupee = resolveDenomination('Silver Rupee');
    expect(rupee?.key).toBe('rupee');
  });

  it('matches fractional aliases', () => {
    const half = resolveDenomination('1/2 rupee');
    expect(half?.key).toBe('half-rupee');
  });

  it('returns null for unknown text', () => {
    expect(resolveDenomination('unknown token')).toBeNull();
  });

  it('prefers longest match', () => {
    const half = resolveDenomination('half rupee coin');
    expect(half?.key).toBe('half-rupee');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/amritesh/Desktop/code/AHG && /usr/bin/npm test -- src/shared/config/denominations.test.ts`  
Expected: FAIL with "Cannot find module '@/shared/config/denominations'"

- [ ] **Step 3: Implement the shared chart and resolver**

```ts
export type DenominationEntry = {
  key: string;
  label: string;
  rank: number;
  baseValue?: number;
  aliases: string[];
};

const normalize = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9\\/\\s]+/g, ' ').replace(/\\s+/g, ' ').trim();

export const SHARED_DENOMINATIONS: DenominationEntry[] = [
  { key: 'dam', label: 'Dam', rank: 1, baseValue: 1 / 512, aliases: ['dam', 'daam'] },
  { key: 'pice', label: 'Pice', rank: 2, baseValue: 1 / 192, aliases: ['pice', 'pie'] },
  { key: 'paisa', label: 'Paisa', rank: 3, baseValue: 1 / 64, aliases: ['paisa'] },
  { key: 'half-anna', label: '1/2 Anna', rank: 4, baseValue: 1 / 32, aliases: ['1/2 anna', 'half anna'] },
  { key: 'anna', label: 'Anna', rank: 5, baseValue: 1 / 16, aliases: ['anna', 'annas', '1 anna'] },
  { key: 'two-anna', label: '2 Annas', rank: 6, baseValue: 2 / 16, aliases: ['2 anna', '2 annas'] },
  { key: 'four-anna', label: '4 Annas', rank: 7, baseValue: 4 / 16, aliases: ['4 anna', '4 annas'] },
  { key: 'eight-anna', label: '8 Annas', rank: 8, baseValue: 8 / 16, aliases: ['8 anna', '8 annas'] },
  { key: 'half-rupee', label: '1/2 Rupee', rank: 9, baseValue: 0.5, aliases: ['1/2 rupee', 'half rupee'] },
  { key: 'rupee', label: 'Rupee', rank: 10, baseValue: 1, aliases: ['rupee', 'rupees', 'silver rupee'] },
  { key: 'mohur', label: 'Mohur', rank: 11, baseValue: 1, aliases: ['mohur', 'gold mohur'] },
];

export function resolveDenomination(value?: string | null) {
  const normalizedValue = normalize(String(value || ''));
  if (!normalizedValue) return null;
  const withSpaces = ` ${normalizedValue} `;
  let best: DenominationEntry | null = null;
  for (const entry of SHARED_DENOMINATIONS) {
    for (const alias of [entry.label, entry.key, ...entry.aliases]) {
      const normalizedAlias = normalize(alias);
      if (!normalizedAlias) continue;
      if (withSpaces.includes(` ${normalizedAlias} `)) {
        if (!best || normalizedAlias.length > normalize(best.label).length) best = entry;
      }
    }
  }
  return best;
}
```

- [ ] **Step 4: Run tests and verify they pass**

Run: `cd /Users/amritesh/Desktop/code/AHG && /usr/bin/npm test -- src/shared/config/denominations.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
/usr/bin/git -C /Users/amritesh/Desktop/code/AHG add frontend/src/shared/config/denominations.ts frontend/src/shared/config/denominations.test.ts
/usr/bin/git -C /Users/amritesh/Desktop/code/AHG commit -m "feat: add shared denomination chart"
```

### Task 2: Normalize Derived Numeric Fields in Frontend Mapper + Schema

**Files:**
- Modify: `frontend/src/backend-support/mappers/normalizeItem.ts`
- Modify: `frontend/src/backend-support/schemas/firestore.ts`
- Modify: `frontend/src/entities/item/model/types.ts`
- Modify: `frontend/src/backend-support/mappers/normalizeItem.test.ts`

- [ ] **Step 1: Write failing tests for new derived fields**

```ts
expect(normalized.sortYearStart).toBe(1668);
expect(normalized.sortYearEnd).toBe(1669);
expect(normalized.estimatedPriceMin).toBe(2000);
expect(normalized.estimatedPriceMax).toBe(3500);
expect(normalized.denominationKey).toBe('rupee');
expect(normalized.denominationRank).toBeGreaterThan(0);
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/amritesh/Desktop/code/AHG && /usr/bin/npm test -- normalizeItem`  
Expected: FAIL due to missing properties

- [ ] **Step 3: Implement derivation helpers and mapping**

```ts
import { resolveDenomination } from '@/shared/config/denominations';

function deriveYearRange(value?: string | null) {
  const matches = String(value ?? '').match(/\\b(\\d{3,4})\\b/g) || [];
  const nums = matches.map((v) => Number(v)).filter((n) => n >= 500 && n <= 2100);
  if (!nums.length) return { start: 0, end: null };
  const start = Math.min(...nums);
  const end = Math.max(...nums);
  return { start, end: end === start ? null : end };
}

function derivePriceRange(priceText?: string | null) {
  const nums = String(priceText ?? '')
    .replace(/,/g, '')
    .match(/\\d+/g)
    ?.map((v) => Number(v))
    .filter((n) => Number.isFinite(n) && n > 0) ?? [];
  if (!nums.length) return { min: 0, max: 0, avg: 0 };
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const avg = Math.round((min + max) / 2);
  return { min, max, avg };
}

function deriveWeightGrams(value?: string | null) {
  const match = String(value ?? '').match(/(\\d+(?:\\.\\d+)?)/);
  return match ? Number(match[1]) : null;
}
```

Add fields in the return object:

```ts
const denom = resolveDenomination(rawItem.metadata.denomination);
const yearRange = deriveYearRange(rawItem.metadata.year_or_period || rawItem.period);
const priceRange = derivePriceRange(rawItem.metadata.estimated_price_inr);

denominationSystem: 'shared-indic',
denominationKey: denom?.key ?? null,
denominationRank: denom?.rank ?? 9999,
denominationBaseValue: denom?.baseValue ?? null,
sortYearStart: yearRange.start,
sortYearEnd: yearRange.end,
estimatedPriceMin: priceRange.min,
estimatedPriceMax: priceRange.max,
estimatedPriceAvg: priceRange.avg,
weightGrams: deriveWeightGrams(rawItem.metadata.weight_estimate),
```

Also update `firestoreItemSchema` and `ItemRecord` to include the new fields.

- [ ] **Step 4: Run tests**

Run: `cd /Users/amritesh/Desktop/code/AHG && /usr/bin/npm test -- normalizeItem`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
/usr/bin/git -C /Users/amritesh/Desktop/code/AHG add \
  frontend/src/backend-support/mappers/normalizeItem.ts \
  frontend/src/backend-support/schemas/firestore.ts \
  frontend/src/entities/item/model/types.ts \
  frontend/src/backend-support/mappers/normalizeItem.test.ts
/usr/bin/git -C /Users/amritesh/Desktop/code/AHG commit -m "feat: normalize derived sorting fields"
```

### Task 3: Extend Firestore Import Script with Derived Fields

**Files:**
- Modify: `backend/scripts/importToFirestore.js`

- [ ] **Step 1: Add derivation helpers and fields**
Use the same year/price/weight derivation from Task 2 and a minimal denomination resolver. Add these fields to each item: `sortYearStart`, `sortYearEnd`, `estimatedPriceMin`, `estimatedPriceMax`, `estimatedPriceAvg`, `weightGrams`, `denominationSystem`, `denominationKey`, `denominationRank`, `denominationBaseValue`.

- [ ] **Step 2: Run dry-run**

Run: `cd /Users/amritesh/Desktop/code/AHG && /usr/bin/node backend/scripts/importToFirestore.js --collection mughals --dry-run`  
Expected: No errors

- [ ] **Step 3: Commit**

```bash
/usr/bin/git -C /Users/amritesh/Desktop/code/AHG add backend/scripts/importToFirestore.js
/usr/bin/git -C /Users/amritesh/Desktop/code/AHG commit -m "feat: derive numeric fields during import"
```

### Task 4: Update Item Service + Sorting on Full Filtered Set

**Files:**
- Modify: `frontend/src/entities/item/api/itemService.ts`
- Modify: `frontend/src/entities/item/model/types.ts`
- Modify: `frontend/src/features/collection-browser/components/CollectionFilters.tsx`
- Modify: `frontend/src/entities/item/hooks/useCollectionItems.ts`

- [ ] **Step 1: Add new sort option**

```ts
export type ItemSort =
  | 'featured'
  | 'title'
  | 'recent'
  | 'price_asc'
  | 'price_desc'
  | 'year_asc'
  | 'year_desc'
  | 'denomination_asc';
```

- [ ] **Step 2: Add in-memory sort helper**

```ts
export function sortItems(items: ItemRecord[], sort: ItemSort) {
  const list = [...items];
  if (sort === 'denomination_asc') {
    return list.sort((a, b) =>
      a.denominationRank - b.denominationRank ||
      (a.denominationBaseValue ?? 0) - (b.denominationBaseValue ?? 0) ||
      a.title.localeCompare(b.title)
    );
  }
  if (sort === 'price_asc') return list.sort((a, b) => a.estimatedPriceAvg - b.estimatedPriceAvg);
  if (sort === 'price_desc') return list.sort((a, b) => b.estimatedPriceAvg - a.estimatedPriceAvg);
  if (sort === 'year_asc') return list.sort((a, b) => a.sortYearStart - b.sortYearStart);
  if (sort === 'year_desc') return list.sort((a, b) => b.sortYearStart - a.sortYearStart);
  if (sort === 'title') return list.sort((a, b) => a.title.localeCompare(b.title));
  return list.sort((a, b) => a.pageNumber - b.pageNumber);
}
```

- [ ] **Step 3: Apply filters then full-set sort then paginate**
Refactor `getCollectionItemsPage` to:
1. fetch all items matching `collectionSlug` and `published`
2. apply `material` and `search`
3. apply `sortItems`
4. paginate in memory with numeric cursor

Update `useCollectionItems` cursor to number.

- [ ] **Step 4: Add sort option to UI**

```tsx
<option value="denomination_asc">Denomination (low to high)</option>
```

- [ ] **Step 5: Commit**

```bash
/usr/bin/git -C /Users/amritesh/Desktop/code/AHG add \
  frontend/src/entities/item/api/itemService.ts \
  frontend/src/entities/item/model/types.ts \
  frontend/src/features/collection-browser/components/CollectionFilters.tsx \
  frontend/src/entities/item/hooks/useCollectionItems.ts
/usr/bin/git -C /Users/amritesh/Desktop/code/AHG commit -m "feat: add denomination sorting and full-set sorting"
```

### Task 5: Tag-Driven Search and Filtering

**Files:**
- Modify: `frontend/src/pages/search/SearchPage.tsx`
- Modify: `frontend/src/features/search/components/SearchResults.tsx`
- Modify: `frontend/src/shared/ui/ItemCard.tsx`
- Modify: `frontend/src/pages/item-detail/ItemDetailPage.tsx`
- Modify: `frontend/src/shared/lib/queryKeys.ts`
- Modify: `frontend/src/entities/item/api/itemService.ts`
- Modify: `frontend/src/entities/item/model/types.ts`

- [ ] **Step 1: Add `tag` to query types**

```ts
export type CollectionItemQuery = {
  collectionSlug: string;
  limit?: number;
  sort?: ItemSort;
  material?: string;
  search?: string;
  tag?: string;
};
```

- [ ] **Step 2: Filter by tag in itemService**
If `tag` is provided, filter items to those whose `tags` array contains the tag (case-insensitive match on normalized tag).

- [ ] **Step 3: Update SearchPage to accept `?q=` and `?tag=`**
Use `useSearchParams` to hydrate initial term. Clicking a tag should navigate to `/search?q=<tag>`.

- [ ] **Step 4: Make tags clickable**
In `ItemCard` and `ItemDetailPage`, render tags as buttons and navigate to search on click without triggering the card navigation.

- [ ] **Step 5: Commit**

```bash
/usr/bin/git -C /Users/amritesh/Desktop/code/AHG add \
  frontend/src/pages/search/SearchPage.tsx \
  frontend/src/features/search/components/SearchResults.tsx \
  frontend/src/shared/ui/ItemCard.tsx \
  frontend/src/pages/item-detail/ItemDetailPage.tsx \
  frontend/src/shared/lib/queryKeys.ts \
  frontend/src/entities/item/api/itemService.ts \
  frontend/src/entities/item/model/types.ts
/usr/bin/git -C /Users/amritesh/Desktop/code/AHG commit -m "feat: add tag-driven search and filtering"
```

### Task 6: Add About Page Conversion Chart Card

**Files:**
- Modify: `frontend/src/pages/about/AboutPage.tsx`

- [ ] **Step 1: Add a new info card**

```ts
{
  icon: 'timeline',
  title: 'Conversion Charts',
  description:
    'Denomination sorting uses a shared ladder (paisa → anna → rupee → mohur). Charts are archival tools for consistent browsing, not strict economic equivalences across eras.',
}
```

- [ ] **Step 2: Commit**

```bash
/usr/bin/git -C /Users/amritesh/Desktop/code/AHG add frontend/src/pages/about/AboutPage.tsx
/usr/bin/git -C /Users/amritesh/Desktop/code/AHG commit -m "feat: document denomination conversion charts"
```

### Task 7: Add a Nightly Stats Refresh Cron (Proper Cron Syntax)

**Files:**
- Modify: `backend/src/index.js`

- [ ] **Step 1: Add a scheduled function**

```js
exports.refreshCollectionStats = functions.pubsub
  .schedule('0 3 * * *')
  .timeZone('Asia/Kolkata')
  .onRun(async () => {
    const firestore = admin.firestore();
    const collectionsSnap = await firestore.collection('collections').get();
    const batch = firestore.batch();

    for (const docSnap of collectionsSnap.docs) {
      const slug = docSnap.id;
      const itemsSnap = await firestore
        .collection('items')
        .where('collectionSlug', '==', slug)
        .where('published', '==', true)
        .get();

      let totalWorth = 0;
      const materials = new Set();
      itemsSnap.forEach((itemDoc) => {
        const data = itemDoc.data();
        totalWorth += Number(data.estimatedPriceAvg || 0);
        (data.materials || []).forEach((m) => m && materials.add(m));
      });

      batch.set(
        docSnap.ref,
        {
          itemCount: itemsSnap.size,
          filterableMaterials: Array.from(materials).sort(),
          estimatedWorth: totalWorth,
          lastSyncedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }

    await batch.commit();
    return null;
  });
```

- [ ] **Step 2: Commit**

```bash
/usr/bin/git -C /Users/amritesh/Desktop/code/AHG add backend/src/index.js
/usr/bin/git -C /Users/amritesh/Desktop/code/AHG commit -m "feat: add nightly collection stats refresh cron"
```

