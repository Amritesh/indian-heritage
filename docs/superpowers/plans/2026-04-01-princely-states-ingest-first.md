# Princely States Ingest-First Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ingest `princely-states` quickly from the two specified independent-page folders, persist online-visible ingest progress, and make the resulting draft items easy to search and correct in the existing admin CMS before starting any public UI redesign.

**Architecture:** Add a narrow Python batch-ingest runner on top of the existing independent-page cataloguer, persist per-run and per-page status into Firebase plus local artifacts, enrich uploaded items with provenance and draft-review metadata, and teach the admin import/items/dashboard views to read that progress and expose basic correction workflows. Reuse the current Firestore/Firebase patterns instead of introducing a new backend service.

**Tech Stack:** Python 3, CrewAI/Gemini ingestion tools, Firebase Realtime Database and Storage, React 19, TypeScript, React Query, Firebase Firestore.

---

## File Structure

### Backend

- Create: `/Users/amritesh/Desktop/code/AHG/backend/coin_cataloguer/batch_ingest.py`
  Purpose: Batch runner for independent-page ingestion across multiple source folders and page ranges.
- Create: `/Users/amritesh/Desktop/code/AHG/backend/coin_cataloguer/ingest_progress.py`
  Purpose: Shared helpers for recording ingest run status locally and in Firebase.
- Modify: `/Users/amritesh/Desktop/code/AHG/backend/coin_cataloguer/main.py`
  Purpose: Extract reusable single-page processing helpers, attach provenance/review metadata during upload, and let batch ingestion call deterministic upload pieces without shelling out.

### Frontend

- Create: `/Users/amritesh/Desktop/code/AHG/frontend/src/entities/ingest/api/ingestProgressService.ts`
  Purpose: Read ingest progress documents for admin pages.
- Create: `/Users/amritesh/Desktop/code/AHG/frontend/src/entities/ingest/model/types.ts`
  Purpose: Typed ingest run and page-progress records.
- Modify: `/Users/amritesh/Desktop/code/AHG/frontend/src/entities/item/api/itemAdminService.ts`
  Purpose: Add admin-side search support and preserve searchable review metadata.
- Modify: `/Users/amritesh/Desktop/code/AHG/frontend/src/pages/admin/AdminImportPage.tsx`
  Purpose: Replace placeholder import instructions with live princely-states batch progress and the exact command to run.
- Modify: `/Users/amritesh/Desktop/code/AHG/frontend/src/pages/admin/AdminDashboardPage.tsx`
  Purpose: Add a compact ingest-progress summary for quick remote verification.
- Modify: `/Users/amritesh/Desktop/code/AHG/frontend/src/pages/admin/AdminItemsPage.tsx`
  Purpose: Add a search box so draft items can be found and corrected quickly after ingest.

### Tests

- Create: `/Users/amritesh/Desktop/code/AHG/frontend/src/entities/ingest/api/ingestProgressService.test.ts`
  Purpose: Verify progress mapping and ordering behavior.
- Modify: `/Users/amritesh/Desktop/code/AHG/frontend/src/pages/admin/AdminItemsPage.tsx`
  Purpose: Keep the page implementation testable with explicit filter/search state.
- Create: `/Users/amritesh/Desktop/code/AHG/frontend/src/pages/admin/AdminImportPage.test.tsx`
  Purpose: Verify the admin import screen shows live progress states and the princely-states command guidance.

## Task 1: Extract Reusable Ingest Helpers And Metadata Model

**Files:**
- Modify: `/Users/amritesh/Desktop/code/AHG/backend/coin_cataloguer/main.py`

- [ ] **Step 1: Write the failing backend metadata test harness**

Create a narrow script-first test file so we can validate the metadata transform without needing the full CrewAI runtime.

```python
# /Users/amritesh/Desktop/code/AHG/backend/coin_cataloguer/tests/test_ingest_metadata.py
from coin_cataloguer.main import build_uploaded_item


def test_build_uploaded_item_attaches_provenance_and_review_flags():
    coin = {
        "image_path": "/tmp/princely/page-05/coin-1.png",
        "ruler_or_issuer": "Unknown",
        "year_or_period": "",
        "mint_or_place": "",
        "denomination": "Rupee",
        "material": "Silver",
        "estimated_price_inr": "",
        "confidence": "Low",
        "notes": "Needs expert review",
    }

    item = build_uploaded_item(
        coin=coin,
        collection_name="princely-states",
        item_index=1,
        source_page_path="/abs/temp/images/princeley-states-1-1/page-05.png",
        source_batch="princeley-states-1-1",
        ingestion_mode="independent-page",
        gs_url="gs://bucket/images/princely-states/page-05/coin-1.png",
    )

    assert item["title"] == "Rupee - Unknown"
    assert item["metadata"]["source_batch"] == "princeley-states-1-1"
    assert item["metadata"]["source_page_path"].endswith("page-05.png")
    assert item["metadata"]["ingestion_mode"] == "independent-page"
    assert "missing_price" in item["metadata"]["review_flags"]
    assert "low_confidence" in item["metadata"]["review_flags"]
```

- [ ] **Step 2: Run the backend metadata test to verify it fails**

Run:

```bash
cd /Users/amritesh/Desktop/code/AHG/backend
/Users/amritesh/.pyenv/versions/3.12.3/bin/python -m pytest coin_cataloguer/tests/test_ingest_metadata.py -v
```

Expected: FAIL with import or missing function errors because `build_uploaded_item` does not exist yet.

- [ ] **Step 3: Extract reusable item-building helpers in `main.py`**

Add small pure helpers near the existing upload logic so batch ingest can reuse them.

```python
def build_review_flags(coin):
    flags = []
    if not str(coin.get("estimated_price_inr", "")).strip():
        flags.append("missing_price")
    if not str(coin.get("mint_or_place", "")).strip():
        flags.append("missing_mint")
    if not str(coin.get("ruler_or_issuer", "")).strip() or str(coin.get("ruler_or_issuer", "")).strip().lower() == "unknown":
        flags.append("missing_issuer")
    if str(coin.get("confidence", "")).strip().lower() in {"low", "low confidence"}:
        flags.append("low_confidence")
    return flags


def build_uploaded_item(*, coin, collection_name, item_index, source_page_path="", source_batch="", ingestion_mode="independent-page", gs_url=""):
    ruler = coin.get("ruler_or_issuer", "Unknown")
    denomination = coin.get("denomination", "Unknown")
    year = coin.get("year_or_period", "")
    mint = coin.get("mint_or_place", "")
    material = coin.get("material", "")
    condition = coin.get("condition", "")
    weight = coin.get("weight_estimate", "")
    price = coin.get("estimated_price_inr", "")
    catalog_ref = coin.get("series_or_catalog", "")
    review_flags = build_review_flags(coin)

    return {
        "id": "",
        "page": item_index,
        "title": f"{denomination} - {ruler}",
        "period": year or None,
        "region": mint or None,
        "materials": [material] if material else ["Unknown"],
        "image": gs_url or coin.get("image_path", ""),
        "notes": [coin.get("notes")] if isinstance(coin.get("notes"), str) and coin.get("notes") else ["Auto-catalogued coin"],
        "display_labels": [f"₹{price}"] if price else [],
        "description": f"{denomination} issued by {ruler}.",
        "metadata": {
            "type": "coin",
            "ruler_or_issuer": ruler,
            "year_or_period": year,
            "mint_or_place": mint,
            "denomination": denomination,
            "series_or_catalog": catalog_ref,
            "material": material,
            "condition": condition,
            "weight_estimate": weight,
            "estimated_price_inr": price,
            "confidence": coin.get("confidence", ""),
            "ingest_status": "draft",
            "review_flags": review_flags,
            "source_batch": source_batch,
            "source_page_path": source_page_path,
            "ingestion_mode": ingestion_mode,
        },
    }
```

- [ ] **Step 4: Refactor `upload_to_firebase` to use the helper**

Replace the inline `item = { ... }` block in `upload_to_firebase` with a helper call like this:

```python
        item = build_uploaded_item(
            coin=coin,
            collection_name=collection_name,
            item_index=idx,
            source_page_path=source_page_path,
            source_batch=os.path.basename(os.path.dirname(source_page_path)) if source_page_path else "",
            ingestion_mode="independent-page",
            gs_url=gs_url,
        )
```

- [ ] **Step 5: Run the backend metadata test to verify it passes**

Run:

```bash
cd /Users/amritesh/Desktop/code/AHG/backend
/Users/amritesh/.pyenv/versions/3.12.3/bin/python -m pytest coin_cataloguer/tests/test_ingest_metadata.py -v
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
cd /Users/amritesh/Desktop/code/AHG
/usr/bin/git add backend/coin_cataloguer/main.py backend/coin_cataloguer/tests/test_ingest_metadata.py
/usr/bin/git commit -m "feat: add ingest provenance metadata helpers"
```

## Task 2: Add Princely States Batch Ingest Runner And Progress Recording

**Files:**
- Create: `/Users/amritesh/Desktop/code/AHG/backend/coin_cataloguer/ingest_progress.py`
- Create: `/Users/amritesh/Desktop/code/AHG/backend/coin_cataloguer/batch_ingest.py`
- Modify: `/Users/amritesh/Desktop/code/AHG/backend/coin_cataloguer/main.py`

- [ ] **Step 1: Write the failing batch-runner test**

Create a narrow parser/progress test:

```python
# /Users/amritesh/Desktop/code/AHG/backend/coin_cataloguer/tests/test_batch_ingest.py
from coin_cataloguer.batch_ingest import build_princely_states_plan


def test_build_princely_states_plan_uses_expected_page_ranges():
    plan = build_princely_states_plan("/repo/temp/images")

    assert plan["collection"] == "princely-states"
    assert plan["sources"][0]["folder"] == "princeley-states-1-1"
    assert plan["sources"][0]["pages"] == list(range(5, 17))
    assert plan["sources"][1]["folder"] == "indian-princely-states-2-2"
    assert plan["sources"][1]["pages"] == list(range(4, 21))
```

- [ ] **Step 2: Run the batch-runner test to verify it fails**

Run:

```bash
cd /Users/amritesh/Desktop/code/AHG/backend
/Users/amritesh/.pyenv/versions/3.12.3/bin/python -m pytest coin_cataloguer/tests/test_batch_ingest.py -v
```

Expected: FAIL because `batch_ingest.py` and `build_princely_states_plan` do not exist.

- [ ] **Step 3: Create `ingest_progress.py` with local and Firebase progress helpers**

Add a small module like:

```python
import json
import os
from datetime import datetime, timezone


def utc_now_iso():
    return datetime.now(timezone.utc).isoformat()


def write_local_progress(path, payload):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)


def update_remote_progress(database, run_id, payload):
    database.child("ingest_runs").child(run_id).set(payload)
```

- [ ] **Step 4: Create `batch_ingest.py` with the hard-coded first implementation slice**

Add a runner with these core pieces:

```python
def build_princely_states_plan(images_root):
    return {
        "collection": "princely-states",
        "sources": [
            {"folder": "princeley-states-1-1", "pages": list(range(5, 17))},
            {"folder": "indian-princely-states-2-2", "pages": list(range(4, 21))},
        ],
    }


def page_image_path(images_root, folder, page_number):
    return os.path.join(images_root, folder, f"page-{page_number}.png")


def main():
    parser = argparse.ArgumentParser(description="Batch ingest independent-page collection folders")
    parser.add_argument("--images-root", required=True)
    parser.add_argument("--output-root", required=True)
    parser.add_argument("--collection", default="princely-states")
    parser.add_argument("--upload", action="store_true")
    parser.add_argument("--clear-first", action="store_true")
```

Inside the loop:

```python
    for source in plan["sources"]:
        for page in source["pages"]:
            image_path = page_image_path(args.images_root, source["folder"], page)
            # record page status = running
            # call reusable single-page process helper from main.py
            # if upload: send to upload_to_firebase with source_page_path=image_path
            # record page status = completed or failed
```

- [ ] **Step 5: Extract a reusable single-page processing helper from `main.py`**

Add a helper so the batch runner can call the existing CrewAI flow without subprocessing:

```python
def run_cataloguer_for_image(*, image_path, output_dir, collection_name):
    from .crew import create_crew

    crew = create_crew(
        image_path=image_path,
        output_dir=output_dir,
        collection_name=collection_name,
    )
    result = crew.kickoff()
    return save_catalogue_result(result=result, image_path=image_path, output_dir=output_dir)
```

And a save helper:

```python
def save_catalogue_result(*, result, image_path, output_dir):
    save_dir = output_dir or os.path.join(os.path.dirname(image_path), "coins_output")
    os.makedirs(save_dir, exist_ok=True)
    catalogue_path = os.path.join(save_dir, "catalogue.json")
    ...
    return {"catalogue_path": catalogue_path, "catalogue_data": catalogue_data, "save_dir": save_dir}
```

- [ ] **Step 6: Run the batch-runner tests**

Run:

```bash
cd /Users/amritesh/Desktop/code/AHG/backend
/Users/amritesh/.pyenv/versions/3.12.3/bin/python -m pytest coin_cataloguer/tests/test_batch_ingest.py coin_cataloguer/tests/test_ingest_metadata.py -v
```

Expected: PASS

- [ ] **Step 7: Dry-run the batch command without upload**

Run:

```bash
cd /Users/amritesh/Desktop/code/AHG/backend
/Users/amritesh/.pyenv/versions/3.12.3/bin/python -m coin_cataloguer.batch_ingest \
  --images-root /Users/amritesh/Desktop/code/AHG/temp/images \
  --output-root /Users/amritesh/Desktop/code/AHG/temp/output/princely-states \
  --collection princely-states
```

Expected: Per-page output folders and a local progress JSON appear under `temp/output/princely-states`, even if some pages fail.

- [ ] **Step 8: Commit**

```bash
cd /Users/amritesh/Desktop/code/AHG
/usr/bin/git add backend/coin_cataloguer/main.py backend/coin_cataloguer/batch_ingest.py backend/coin_cataloguer/ingest_progress.py backend/coin_cataloguer/tests/test_batch_ingest.py
/usr/bin/git commit -m "feat: add batch ingest runner for princely states"
```

## Task 3: Persist Online-Visible Ingest Progress

**Files:**
- Modify: `/Users/amritesh/Desktop/code/AHG/backend/coin_cataloguer/ingest_progress.py`
- Modify: `/Users/amritesh/Desktop/code/AHG/backend/coin_cataloguer/batch_ingest.py`

- [ ] **Step 1: Write the failing progress-shape test**

```python
# /Users/amritesh/Desktop/code/AHG/backend/coin_cataloguer/tests/test_ingest_progress.py
from coin_cataloguer.ingest_progress import build_run_summary


def test_build_run_summary_counts_completed_and_failed_pages():
    summary = build_run_summary([
        {"status": "completed"},
        {"status": "completed"},
        {"status": "failed"},
    ])

    assert summary["completedPages"] == 2
    assert summary["failedPages"] == 1
    assert summary["totalPages"] == 3
```

- [ ] **Step 2: Run the progress test to verify it fails**

Run:

```bash
cd /Users/amritesh/Desktop/code/AHG/backend
/Users/amritesh/.pyenv/versions/3.12.3/bin/python -m pytest coin_cataloguer/tests/test_ingest_progress.py -v
```

Expected: FAIL because `build_run_summary` does not exist.

- [ ] **Step 3: Implement summary helpers and remote payload shape**

Add:

```python
def build_run_summary(page_entries):
    total = len(page_entries)
    completed = sum(1 for entry in page_entries if entry.get("status") == "completed")
    failed = sum(1 for entry in page_entries if entry.get("status") == "failed")
    running = sum(1 for entry in page_entries if entry.get("status") == "running")
    return {
        "totalPages": total,
        "completedPages": completed,
        "failedPages": failed,
        "runningPages": running,
    }
```

Write a remote run payload like:

```python
{
    "id": run_id,
    "collectionSlug": "princely-states",
    "status": "running",
    "startedAt": utc_now_iso(),
    "updatedAt": utc_now_iso(),
    "summary": build_run_summary(page_entries),
    "pages": page_entries,
}
```

- [ ] **Step 4: Update the batch runner to save progress after every page**

Inside `batch_ingest.py`, after each page finishes:

```python
        run_payload["pages"][page_index] = {
            "sourceBatch": source["folder"],
            "pageNumber": page,
            "imagePath": image_path,
            "status": "completed",
            "cataloguePath": result["catalogue_path"],
            "itemsUploaded": upload_result["items_uploaded"] if upload_result else 0,
            "error": "",
        }
        run_payload["summary"] = build_run_summary(run_payload["pages"])
        run_payload["updatedAt"] = utc_now_iso()
        write_local_progress(local_progress_path, run_payload)
        update_remote_progress(database, run_id, run_payload)
```

And on failure:

```python
        run_payload["pages"][page_index]["status"] = "failed"
        run_payload["pages"][page_index]["error"] = str(exc)
```

- [ ] **Step 5: Run the progress tests**

Run:

```bash
cd /Users/amritesh/Desktop/code/AHG/backend
/Users/amritesh/.pyenv/versions/3.12.3/bin/python -m pytest coin_cataloguer/tests/test_ingest_progress.py coin_cataloguer/tests/test_batch_ingest.py -v
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
cd /Users/amritesh/Desktop/code/AHG
/usr/bin/git add backend/coin_cataloguer/ingest_progress.py backend/coin_cataloguer/batch_ingest.py backend/coin_cataloguer/tests/test_ingest_progress.py
/usr/bin/git commit -m "feat: persist ingest progress for admin monitoring"
```

## Task 4: Make Admin Import Page Read Live Ingest Progress

**Files:**
- Create: `/Users/amritesh/Desktop/code/AHG/frontend/src/entities/ingest/model/types.ts`
- Create: `/Users/amritesh/Desktop/code/AHG/frontend/src/entities/ingest/api/ingestProgressService.ts`
- Create: `/Users/amritesh/Desktop/code/AHG/frontend/src/entities/ingest/api/ingestProgressService.test.ts`
- Modify: `/Users/amritesh/Desktop/code/AHG/frontend/src/pages/admin/AdminImportPage.tsx`

- [ ] **Step 1: Write the failing frontend progress service test**

```ts
import { describe, expect, it } from 'vitest';
import { mapIngestRun } from './ingestProgressService';

describe('mapIngestRun', () => {
  it('maps summary counts and page entries', () => {
    const run = mapIngestRun({
      id: 'run-1',
      collectionSlug: 'princely-states',
      status: 'running',
      summary: { totalPages: 25, completedPages: 10, failedPages: 1, runningPages: 1 },
      pages: [{ sourceBatch: 'princeley-states-1-1', pageNumber: 5, status: 'completed' }],
    });

    expect(run.collectionSlug).toBe('princely-states');
    expect(run.summary.completedPages).toBe(10);
    expect(run.pages[0].pageNumber).toBe(5);
  });
});
```

- [ ] **Step 2: Run the frontend test to verify it fails**

Run:

```bash
cd /Users/amritesh/Desktop/code/AHG/frontend
npm run test -- ingestProgressService.test.ts
```

Expected: FAIL because the service does not exist yet.

- [ ] **Step 3: Implement ingest progress types and Firestore/Realtime reader**

Create type definitions like:

```ts
export type IngestPageStatus = 'pending' | 'running' | 'completed' | 'failed';

export type IngestRunRecord = {
  id: string;
  collectionSlug: string;
  status: string;
  startedAt?: string;
  updatedAt?: string;
  summary: {
    totalPages: number;
    completedPages: number;
    failedPages: number;
    runningPages: number;
  };
  pages: Array<{
    sourceBatch: string;
    pageNumber: number;
    status: IngestPageStatus;
    itemsUploaded?: number;
    error?: string;
  }>;
};
```

Implement a mapping function and a reader:

```ts
export function mapIngestRun(data: Record<string, unknown>): IngestRunRecord { ... }

export async function getLatestIngestRun(collectionSlug: string): Promise<IngestRunRecord | null> {
  const db = getFirestoreOrThrow();
  const snapshot = await getDocs(
    query(collection(db, 'ingest_runs'), where('collectionSlug', '==', collectionSlug), orderBy('updatedAt', 'desc'), limit(1)),
  );
  ...
}
```

If the backend ends up writing to Realtime Database instead, swap the implementation but keep this API stable.

- [ ] **Step 4: Replace placeholder copy in `AdminImportPage.tsx`**

Refactor the page to:

```tsx
const { data: latestRun, isLoading: isLoadingRun } = useQuery({
  queryKey: ['admin', 'ingest-run', 'princely-states'],
  queryFn: () => getLatestIngestRun('princely-states'),
});
```

Show:

- Exact batch command for the current phase
- Current run status
- Completed / failed / total counts
- Recent failed pages if any
- A note that data sync must be completed before UI work begins

- [ ] **Step 5: Run the frontend tests**

Run:

```bash
cd /Users/amritesh/Desktop/code/AHG/frontend
npm run test -- ingestProgressService.test.ts AdminImportPage.test.tsx
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
cd /Users/amritesh/Desktop/code/AHG
/usr/bin/git add frontend/src/entities/ingest/model/types.ts frontend/src/entities/ingest/api/ingestProgressService.ts frontend/src/entities/ingest/api/ingestProgressService.test.ts frontend/src/pages/admin/AdminImportPage.tsx frontend/src/pages/admin/AdminImportPage.test.tsx
/usr/bin/git commit -m "feat: show live batch ingest progress in admin import page"
```

## Task 5: Add Searchable Admin Correction Workflow

**Files:**
- Modify: `/Users/amritesh/Desktop/code/AHG/frontend/src/entities/item/api/itemAdminService.ts`
- Modify: `/Users/amritesh/Desktop/code/AHG/frontend/src/pages/admin/AdminItemsPage.tsx`

- [ ] **Step 1: Write the failing admin search test**

Add a UI-level test:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminItemsPage } from './AdminItemsPage';

it('passes search text into the admin items query', async () => {
  render(<AdminItemsPage />);
  const input = await screen.findByPlaceholderText(/search items/i);
  await userEvent.type(input, 'akbar');
  expect(input).toHaveValue('akbar');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
cd /Users/amritesh/Desktop/code/AHG/frontend
npm run test -- AdminItemsPage
```

Expected: FAIL because there is no search input yet.

- [ ] **Step 3: Add search support to `getAdminItems`**

Update the function signature and fallback filter:

```ts
export async function getAdminItems({ collectionSlug, status = 'all', search = '', pageSize = 100 }: AdminItemQuery): Promise<ItemRecord[]> {
  ...
  const items = snapshot.docs.map((d) => mapItemSnapshot(d.data()));
  if (!search.trim()) return items;
  const needle = search.trim().toLowerCase();
  return items.filter((item) =>
    [
      item.title,
      item.period,
      item.collectionName,
      item.description,
      item.searchText,
      String(item.metadata?.ruler_or_issuer ?? ''),
      String(item.metadata?.mint_or_place ?? ''),
      String(item.metadata?.denomination ?? ''),
    ]
      .join(' ')
      .toLowerCase()
      .includes(needle),
  );
}
```

- [ ] **Step 4: Add a search box to `AdminItemsPage.tsx`**

Add:

```tsx
const [search, setSearch] = useState('');

const { data: items = [], isLoading } = useQuery({
  queryKey: ['admin', 'items', collectionSlug, statusFilter, search],
  queryFn: () =>
    getAdminItems({
      collectionSlug: collectionSlug || undefined,
      status: statusFilter,
      search,
    }),
});
```

And in the filter bar:

```tsx
<input
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  placeholder="Search items, issuers, mints, notes…"
  className="min-w-[18rem] text-sm border border-outline-variant/30 rounded-lg px-3 py-2 bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
/>
```

- [ ] **Step 5: Run the admin items tests**

Run:

```bash
cd /Users/amritesh/Desktop/code/AHG/frontend
npm run test -- AdminItemsPage
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
cd /Users/amritesh/Desktop/code/AHG
/usr/bin/git add frontend/src/entities/item/api/itemAdminService.ts frontend/src/pages/admin/AdminItemsPage.tsx
/usr/bin/git commit -m "feat: add admin search for draft collection corrections"
```

## Task 6: Add A Compact Ingest Summary To Admin Dashboard

**Files:**
- Modify: `/Users/amritesh/Desktop/code/AHG/frontend/src/pages/admin/AdminDashboardPage.tsx`
- Modify: `/Users/amritesh/Desktop/code/AHG/frontend/src/entities/ingest/api/ingestProgressService.ts`

- [ ] **Step 1: Write the failing dashboard test**

```tsx
import { render, screen } from '@testing-library/react';
import { AdminDashboardPage } from './AdminDashboardPage';

it('shows the latest ingest summary card', async () => {
  render(<AdminDashboardPage />);
  expect(await screen.findByText(/latest ingest/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
cd /Users/amritesh/Desktop/code/AHG/frontend
npm run test -- AdminDashboardPage
```

Expected: FAIL because no ingest summary section exists yet.

- [ ] **Step 3: Add the dashboard query and summary card**

Use the same ingest service:

```tsx
const { data: latestIngestRun } = useQuery({
  queryKey: ['admin', 'ingest-run', 'princely-states'],
  queryFn: () => getLatestIngestRun('princely-states'),
});
```

Render a compact panel:

```tsx
<div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-6">
  <h2 className="font-label text-xs font-bold uppercase tracking-[0.2em] text-primary">Latest Ingest</h2>
  {latestIngestRun ? (
    <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
      <p>Total pages: {latestIngestRun.summary.totalPages}</p>
      <p>Completed: {latestIngestRun.summary.completedPages}</p>
      <p>Failed: {latestIngestRun.summary.failedPages}</p>
      <p>Status: {latestIngestRun.status}</p>
    </div>
  ) : (
    <p className="mt-3 text-sm text-on-surface-variant">No ingest runs recorded yet.</p>
  )}
</div>
```

- [ ] **Step 4: Run the dashboard tests**

Run:

```bash
cd /Users/amritesh/Desktop/code/AHG/frontend
npm run test -- AdminDashboardPage
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/amritesh/Desktop/code/AHG
/usr/bin/git add frontend/src/pages/admin/AdminDashboardPage.tsx frontend/src/entities/ingest/api/ingestProgressService.ts
/usr/bin/git commit -m "feat: surface ingest status on admin dashboard"
```

## Task 7: Run End-To-End Verification Before UI Redesign Work

**Files:**
- Modify: `/Users/amritesh/Desktop/code/AHG/docs/superpowers/specs/2026-04-01-ahg-ingest-first-design.md`
  Purpose: Optionally append a short implementation-status note after verification if desired.

- [ ] **Step 1: Run frontend automated checks**

Run:

```bash
cd /Users/amritesh/Desktop/code/AHG
npm run test
npm run build
```

Expected: PASS

- [ ] **Step 2: Run backend automated checks**

Run:

```bash
cd /Users/amritesh/Desktop/code/AHG/backend
/Users/amritesh/.pyenv/versions/3.12.3/bin/python -m pytest coin_cataloguer/tests -v
```

Expected: PASS

- [ ] **Step 3: Run the real princely-states ingest**

Run:

```bash
cd /Users/amritesh/Desktop/code/AHG/backend
/Users/amritesh/.pyenv/versions/3.12.3/bin/python -m coin_cataloguer.batch_ingest \
  --images-root /Users/amritesh/Desktop/code/AHG/temp/images \
  --output-root /Users/amritesh/Desktop/code/AHG/temp/output/princely-states \
  --collection princely-states \
  --upload \
  --clear-first
```

Expected:

- Pages 5-16 from `princeley-states-1-1` are processed.
- Pages 4-20 from `indian-princely-states-2-2` are processed.
- The online run summary updates as pages complete.
- Uploaded items land in the `princely-states` collection.

- [ ] **Step 4: Verify online admin behavior**

Manual checks:

- Log into `/admin`
- Open `/admin/import` and confirm the latest run summary is visible
- Open `/admin/items` and filter to `princely-states`
- Search for a known ruler, mint, or denomination from the newly ingested records
- Edit one item and confirm the change persists

- [ ] **Step 5: Commit any final polish**

```bash
cd /Users/amritesh/Desktop/code/AHG
/usr/bin/git add .
/usr/bin/git commit -m "feat: complete princely states ingest-first workflow"
```

- [ ] **Step 6: Stop and reassess before public UI work**

Do not begin the public-facing redesign yet. First confirm:

- The ingest run completed acceptably
- The admin correction flow is usable
- The online progress view is enough for remote validation

Only after that should the next spec/plan cover public collection UI upgrades.
