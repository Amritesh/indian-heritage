# Sultanate Ingest and Canonical Catalog Normalization Design

## Summary

AHG should add the `sultanate` collection from front-view album pages in `temp/image/sulatanate-1-1`, pages 7 through 18 inclusive, using the independent-page CrewAI flow already used for Mughal album pages. Before that ingest is synced into the customer-facing app, the catalog data model and import pipeline should be strengthened so canonical ruler, empire, mint, denomination, and tag normalization is applied consistently across existing and new collections. This work must preserve already processed data while repairing broken sorting and duplicate-tag behavior in the current British and other imported collections.

## Goals

- Process Sultanate album pages 7 through 18 from `temp/image/sulatanate-1-1` using the Mughal-style independent-page flow.
- Preserve all already processed collection data while adding normalization fields and recomputing derived fields safely.
- Canonicalize visible tags so spelling mistakes, name variants, partial names, and full-form titles do not fragment the tag system.
- Repair British collection sorting so denomination and price ordering works reliably for public collectors.
- Ensure new ingested records are normalized before they become public-facing.
- Keep the public experience professional and useful for collectors who want to browse, sort, tag, and share collections.

## Non-Goals

- Rebuilding the public UI in this slice.
- Replacing the current admin CMS.
- Perfect historical authority resolution for every ruler and mint in one pass.
- Reprocessing unrelated image assets unless required for Sultanate ingest.

## Current Problems

### Tag fragmentation

The app currently builds tags from raw metadata values such as denomination, ruler/issuer, mint/place, culture, and sometimes word fragments. Because these values are not canonicalized, multiple variants can become separate visible tags:

- spelling mistakes
- honorific variants
- partial names
- full names vs short names
- formatting differences in mints and empires

This defeats the purpose of tags as navigation entities.

### Denomination sort failure

Denomination sort relies on `denominationKey`, `denominationRank`, and `denominationBaseValue`. These values are derived from denomination parsing, but the current parsing rules are still too narrow and exist in more than one place. When parsing fails, items fall back to unknown denomination ranking, making sort behavior unreliable.

### Price sort inconsistency

Price sort depends on parsed numeric values from free-text fields. Existing imported records may have incomplete or inconsistent parsed ranges, so price sorting is not trustworthy for collectors.

### Risk of adding more bad data

If Sultanate is ingested before canonical normalization is fixed, new duplicate tags and broken sort fields will be added to the dataset and then need a second cleanup pass.

## Product Direction

AHG should behave like a public archive with institution-grade catalog structure underneath. The right model is:

1. Ingest raw records quickly.
2. Normalize entities and derived sort fields deterministically.
3. Publish only normalized records into the customer-facing browsing layer.

This creates a stable foundation for future institutional cataloging work.

## Data Model Direction

### Preserve existing source data

Existing descriptive values should not be destroyed. Raw metadata currently stored in records should remain available. Repairs should primarily add or recompute normalized and derived fields rather than overwriting historically useful source text unless the value is clearly derived and safe to normalize.

### Canonical entity fields

Each item should support canonical normalized values for at least:

- canonical ruler / issuer
- canonical authority / empire / culture
- canonical mint / place
- canonical denomination
- canonical material

These canonical values should drive visible tags, search keywords, and sort/classification logic.

### Raw vs canonical separation

The system should distinguish:

- raw imported text from AI or source records
- canonical text used for display facets and linking
- derived sort and filter values

This separation is essential so future migrations can improve normalization without losing the original imported wording.

### Tag model

Visible tags should be generated from canonical entities rather than free-form fragments. The tag system should favor:

- a canonical display label
- a normalized slug
- stable grouping across alias variants

Search keywords can remain broader and tokenized for discoverability, but public tags should be stable and intentional.

## Canonicalization Design

### Canonical ruler and authority resolution

The import layer should resolve ruler and authority names through deterministic normalization rules. This should include:

- case and whitespace normalization
- punctuation cleanup
- alias mapping for common variants
- collapse of full titles to a single canonical label where appropriate

Examples of intended behavior:

- `Muhammad bin Tughlaq`, `Muhammad-bin-Tughluq`, and close spelling variants should map to one canonical ruler entity
- `East India Company`, `E.I.C.`, and similar variants should map to one canonical authority
- empire and collection culture labels should not produce redundant parallel tags

This should be implemented through explicit alias dictionaries plus lightweight normalization rules, not fuzzy uncontrolled mutation.

### Canonical mint resolution

Mint values should be cleaned similarly. The system should normalize obvious punctuation, spacing, and casing differences and support explicit aliases for known mints when needed.

### Canonical denomination resolution

Denomination parsing must move to one shared source of truth used by:

- frontend normalization helpers
- Firestore import scripts
- data repair scripts

It should be extended to cover known British, Mughal, Sultanate, and shared Indian coin denominations with robust aliases.

## Migration and Repair Strategy

### Safe migration requirement

No already processed data should be lost. The migration must:

- read existing collection data from local JSON / Firestore
- recompute normalized and derived fields deterministically
- write back with merge semantics
- preserve item ids and existing media references
- avoid deleting records unless explicitly requested

### Repair scope

The first repair pass should cover at least:

- `british`
- `mughals`
- `princely-states`
- any new `sultanate` records before public sync

### Recomputed fields

Repair should recompute:

- canonical entity fields
- tags
- search keywords
- `denominationKey`
- `denominationRank`
- `denominationBaseValue`
- `estimatedPriceMin`
- `estimatedPriceMax`
- `estimatedPriceAvg`
- any related search text fields

### Validation focus

British is the immediate validation target because the user already observed broken denomination and price sort behavior there.

## Sultanate Ingest Design

### Source

- Base directory: `temp/image/sulatanate-1-1`
- Page range: 7 through 18 inclusive

### Ingest mode

Use the independent-page pipeline, not paired-page processing. These are front-view-only images and should be processed like Mughal album pages.

### Collection identity

The public collection slug should be stable and human-facing:

- `sultanate`

Folder names remain provenance metadata only.

### Post-ingest normalization

After page processing but before final sync/public consumption:

- normalize ruler/authority/mint/denomination fields
- generate canonical tags
- compute sort fields
- sync collection stats

### Provenance

Sultanate items should preserve source batch and page provenance just like other ingest-first work, so revalidation remains possible later.

## Public App Expectations

After this work:

- denomination sort should produce meaningful ascending order
- price sort should use parsed price ranges rather than raw text ordering
- tag pages and collection tag filters should stop fragmenting across spelling variants
- collectors should be able to browse and organize collections with confidence that categories are stable

## Backend and Script Architecture

### Shared normalization module

The repo should gain a shared normalization layer that can be consumed by both:

- the frontend/backend-support import mapping path
- backend repair/import scripts

This avoids divergence between current duplicate parsing implementations.

### Repair script

A dedicated repair script should:

- load one or more collections
- recompute canonical and derived fields
- merge updates safely into Firestore and/or local temp data
- log counts of normalized tags, repaired denomination fields, and repaired price fields

### Ingest orchestration

Sultanate processing should be run page-by-page or via a narrow batch runner over pages 7-18, then passed through normalization repair, then synced to Firestore collections/items.

## Risks and Mitigations

### Risk: canonical rules collapse genuinely different rulers into one entity

Mitigation:

- start with explicit alias dictionaries and conservative normalization
- avoid fuzzy merges without known mappings
- preserve raw values for manual review

### Risk: migration overwrites useful descriptive text

Mitigation:

- treat raw descriptive metadata as preserved source
- write canonical fields separately
- use merge updates and stable item ids

### Risk: British sort still fails due to unexpected denomination formats

Mitigation:

- inspect current British denomination values before finalizing alias coverage
- log unresolved denomination strings during repair
- keep unknowns explicit instead of silently misclassifying them

### Risk: Sultanate ingest creates low-quality records

Mitigation:

- process through the same normalization layer before public sync
- preserve provenance for later admin cleanup
- avoid hiding uncertainty in raw metadata

## Testing and Verification Strategy

### Normalization tests

- alias variants resolve to one canonical ruler / authority tag
- denomination parsing resolves known British and Sultanate denominations correctly
- unresolved denominations remain explicit but do not corrupt sorting

### Repair validation

- run repair against British and confirm denomination sort fields and price fields are populated sensibly
- verify tags collapse rather than expand

### Sultanate validation

- confirm pages 7-18 are processed from `temp/image/sulatanate-1-1`
- confirm records land in `sultanate`
- confirm canonical tags and sort fields exist before sync

### Deployment validation

- public app still builds and deploys
- collection sorting works on the deployed site
- tag navigation remains functional

## Approved Direction

The agreed delivery slice is:

1. Strengthen the normalization/data model without losing existing processed data.
2. Repair existing collection data, especially British sorting and canonical tags.
3. Process Sultanate pages 7-18 through the independent-page flow.
4. Sync the repaired and newly ingested data.
5. Deploy the updated customer-facing app.
