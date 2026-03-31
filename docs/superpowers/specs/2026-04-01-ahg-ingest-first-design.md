# AHG Ingest-First Design

## Summary

Anand Heritage Gallery should prioritize fast, traceable onboarding of the remaining archive data before any major UI redesign work. The immediate delivery slice is to ingest the `princely-states` collection from two independent-page source folders:

- `temp/images/princeley-states-1-1` pages 5-16
- `temp/images/indian-princely-states-2-2` pages 4-20

The system should upload draft-quality catalogue entries quickly, expose progress online so the collection can be checked from another machine, and preserve enough source provenance and review metadata to support later cleanup in the existing admin CMS. After data sync is stabilized, the public-facing experience can be upgraded to better showcase the collection with stronger filtering, totals, and presentation.

## Goals

- Ingest the remaining `princely-states` pages quickly into a single `princely-states` collection.
- Preserve source provenance so every uploaded item can be traced back to folder, page, and generated outputs.
- Support speed-first ingestion without hiding uncertainty.
- Keep the current admin site as the correction workspace for searching and editing incorrect fields.
- Provide online-visible progress updates during or after ingestion so cross-device checking is easy.
- Prepare the data model so future non-coin collections such as stamps and banknotes can be added cleanly.

## Non-Goals

- Perfect numismatic validation during the first ingest pass.
- Solving the earlier Mughal Akbar omissions in this implementation slice.
- Building a new separate CMS product.
- Shipping the full visual redesign before the new data sync flow is in place.
- Designing final stamps/banknotes UX in this phase.

## Current Context

The codebase already has:

- A Python CrewAI-based ingestion pipeline for independent page processing in `backend/coin_cataloguer/main.py`.
- A separate paired-page flow for obverse/reverse collections in `backend/coin_cataloguer/process_pairs.py`.
- Gemini-backed segmentation and analysis tools in `backend/coin_cataloguer/tools/image_segmenter.py` and `backend/coin_cataloguer/tools/coin_analyzer.py`.
- Existing admin pages for imports, collections, items, and item editing in the frontend admin area.
- Firestore-backed collection and item views in the public frontend.

The current weakness is not lack of an ingestion path, but lack of a reliable ingest-first operating model: source pages need better run scoping, provenance, review flags, and online progress visibility so the collection can be onboarded fast and corrected later.

## Product Direction

AHG should operate as three linked workflows:

1. Fast batch ingestion of archive material into draft items.
2. Admin review and correction of incorrect or incomplete records.
3. Public presentation of cleaned records through a beautiful browsing experience.

The immediate implementation should optimize workflow 1 and support workflow 2, while explicitly deferring large workflow 3 changes until after data sync is stable.

## Immediate Scope

### Collection and Batch Scope

The first ingest-first implementation should process:

- Collection slug: `princely-states`
- Source folder A: `princeley-states-1-1`, pages 5 through 16 inclusive
- Source folder B: `indian-princely-states-2-2`, pages 4 through 20 inclusive

These pages are independent-page inputs like the Mughal flow, not obverse/reverse pairs. Therefore they should use the independent-page ingestion path, not `process_pairs.py`.

### Output Expectations

The run should produce:

- Draft items uploaded into the single `princely-states` collection.
- Saved local output artifacts per page, including segmentation and catalogue outputs.
- Firestore records with enough metadata for public display and admin correction.
- A progress view or status record that can be checked online from another system.

## Data and Domain Model Direction

### Stable Collection Identity

The public collection identity should be stable and human-facing:

- Collection slug/id: `princely-states`

Folder names such as `princeley-states-1-1` and `indian-princely-states-2-2` are ingest batch inputs, not public collection identifiers. The system should treat those as provenance metadata, not as separate public collections.

### Provenance Metadata

Every ingested item should preserve source metadata sufficient for revalidation and debugging. At minimum this should include:

- Public collection slug
- Source batch/folder name
- Source page number
- Source page path or stable relative path
- Generated output directory or run identifier
- Whether the item was created from independent-page or paired-page processing

This provenance should be stored separately from the public presentation fields so future folder renames or re-runs do not corrupt the public data model.

### Draft Review Metadata

Every ingested item should also carry lightweight review state. At minimum:

- Ingest status such as `draft`
- Confidence value from model output when available
- Missing-fields summary for important enrichments like price, issuer, mint, denomination
- Optional review flags such as `needs_review`, `missing_price`, `low_confidence`

The first pass should not block upload if these are missing. Instead, it should upload draft items and make these fields searchable in admin later.

### Future Media Types

New metadata work should avoid hard-coding assumptions that all collection items are coins. The system can continue using current coin-specific fields where needed, but new ingest metadata should be generic enough for later stamps and banknotes. In particular:

- Provenance and ingest metadata should be collection-item generic.
- Review status and missing-field markers should be generic.
- Public collection grouping should not depend on coin-only concepts.

## Backend Design

### Ingest Mode

The backend should support a speed-first ingest run for a specified collection plus page ranges from one or more source folders. For this implementation, it should orchestrate independent-page processing over the two princely-states folders and page ranges.

The backend should not require manual one-page-at-a-time invocation for the first-pass ingest. Instead, there should be a collection-scoped batch runner or equivalent scripted flow that:

- Accepts the target collection slug
- Accepts one or more source directories
- Accepts inclusive page ranges for each source directory
- Runs the existing independent-page cataloguer for each page
- Uploads results into the same public collection
- Records progress after each page

### Speed-First Safety

Because the prime objective is onboarding quickly, the backend should favor forward progress. A page-level failure should be recorded clearly without stopping the whole batch unless the failure is systemic.

Expected behavior:

- Successful pages upload immediately.
- Failed pages are logged with enough detail to revisit later.
- Missing enrichment fields do not block upload.
- Low-confidence records still upload as draft items.

### Revalidation Support

The design must keep open the path for later manual or semi-automated revalidation, especially for collections like Mughals. That means:

- Original generated catalogue output must be retained locally.
- Source page references must remain attached to uploaded items.
- Re-running one page or one folder later should be possible without requiring a full collection rebuild.

### Sync Before UI Work

Implementation order matters:

1. Stabilize and run the data ingest and sync flow for `princely-states`.
2. Confirm data is visible and editable online.
3. Only then begin public-facing UI upgrades.

This ordering is mandatory for the current phase.

## Admin CMS Design

The existing admin area should remain the correction surface. The goal is not a new queue-heavy moderation product, but a practical CMS that lets the owner search and edit incorrect details quickly.

### Required Admin Capabilities

After the ingest-first work, the admin experience should support:

- Searching for items that were just uploaded
- Filtering or locating items within `princely-states`
- Opening any item in an edit form
- Updating incorrect metadata manually
- Saving corrected information back to Firestore cleanly

### Important Editable Fields

The admin item editor should support correcting the fields most likely to be incomplete or wrong after AI ingest, including:

- Title
- Issuer/ruler
- Mint/place
- Denomination
- Material
- Year/period
- Price estimate
- Notes
- Confidence/review fields if surfaced
- Collection assignment if needed

### Desired Searchability

The admin items list should be strong enough for practical correction sessions. At minimum it should support collection-based narrowing and searching by item title or identifying text. If review flags are added in this phase, they should be easy to expose here later.

## Online Progress Visibility

You need to monitor ingestion from another system. Therefore the system should expose progress in a network-visible form rather than only terminal logs.

Recommended implementation direction:

- Store page-level ingest status in Firestore or another backend-readable location.
- Show a simple admin-facing progress view summarizing total pages, completed pages, failed pages, and last processed page.

This does not need to be a polished dashboard in the first slice. It only needs to be accurate and available online.

## Public UI Direction

The public experience remains important, but it comes after sync stability. Once the ingest-first slice is complete, the public UI should be improved to better showcase the collection with:

- Better collection totals and summary stats
- Strong filtering and discovery
- More compelling item detail storytelling
- Better visual representation of archive material

These improvements should use the strengthened synced dataset rather than inventing around incomplete data.

## Architecture Summary

### Backend

- Add a batch-oriented independent-page ingest flow for the specified princely-states folders and page ranges.
- Reuse existing segmentation and coin analysis tools where possible.
- Attach provenance and lightweight review metadata to uploaded items.
- Persist progress so it can be viewed online.

### Admin

- Reuse the current admin CMS shell and item editing flow.
- Ensure newly uploaded items are searchable and editable.
- Add minimal support for viewing ingest progress and correcting draft records.

### Public Frontend

- Defer major visual changes until after the first successful sync.
- Use the synced collection data as the basis for later display improvements.

## Risks and Mitigations

### Risk: Missed items on some pages

Mitigation:

- Keep speed-first ingest.
- Record page provenance and outputs.
- Revisit flagged pages later rather than blocking initial upload.

### Risk: Incomplete enrichment data

Mitigation:

- Upload draft items even with missing fields.
- Surface missing data clearly in admin-editable records.

### Risk: Folder naming changes later

Mitigation:

- Keep folder names as provenance metadata only.
- Use stable public collection slugs independent of source folder names.

### Risk: Future stamps and banknotes do not fit

Mitigation:

- Keep new ingest and review metadata generic.
- Avoid introducing new coin-only assumptions into shared data structures.

## Testing Strategy

The first implementation should be validated at three levels:

### Ingest Validation

- Confirm only the requested page ranges are processed.
- Confirm both source folders upload into the single `princely-states` collection.
- Confirm page failures are recorded without collapsing the batch.
- Confirm uploaded items retain source provenance.

### Admin Validation

- Confirm admin login still works.
- Confirm newly ingested items are visible in the admin items list.
- Confirm an item can be found and edited successfully.
- Confirm corrected values persist.

### Online Visibility Validation

- Confirm progress can be checked from another machine.
- Confirm the visible status reflects real ingest results.

## Open Implementation Guidance

The fastest safe path is to build a narrow batch-ingest slice for `princely-states`, run it successfully, and only then expand the pattern to the remaining collections. The implementation should prefer incremental improvements to the existing ingestion and admin systems over a broad rewrite.

## Approved Direction

This design reflects the current agreed priorities:

- Prime objective: onboard archive data properly and quickly
- First concrete target: `princely-states`
- Ingest mode: independent pages, not paired pages
- Data sync before UI redesign
- Existing admin should remain the correction CMS
- Progress should be visible online during validation from another machine
