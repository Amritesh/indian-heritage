# Supabase Archive Metadata Cutover Design

## Summary

AHG should treat Supabase as the only source of truth for archive metadata and public archive APIs.

Firebase Storage remains the media backend, but only as a blob store for images and derived crops. Public collection, item, stats, and time-period sorting behavior should come entirely from Supabase-backed records.

This cutover also makes period normalization part of the import flow so all enabled archive collections can be reprocessed and verified consistently, including collections whose source snapshots currently live in different folders or file formats.

## Goals

- Make public archive metadata reads Supabase-only.
- Keep Firebase Storage image URLs intact.
- Make period sorting rely on one canonical year-range parser.
- Reprocess all enabled archive collections through the Supabase import flow.
- Verify unresolved or unsortable period values as part of that flow.

## Non-Goals

- Migrate image storage away from Firebase Storage.
- Finish the admin write-path migration in this pass.
- Delete every legacy Firebase or Firestore script immediately.

## Current Drift

The current codebase is partly cut over, but not fully:

- `frontend/src/entities/archive/api/archiveStatsService.ts` is already Supabase-backed.
- `frontend/src/entities/collection/api/collectionService.ts` and `frontend/src/entities/item/api/itemService.ts` still fall back to Firestore or legacy JSON/API sources.
- `backend/src/index.js` still serves `/api/collections`, `/api/collections/:id`, and `/api/items/:id` from Firebase RTDB.
- `frontend/scripts/import-supabase-archive.ts` already uses the canonical `deriveYearRange()` parser, but all-collection snapshot resolution does not consistently include live collection files such as `temp/data/early-coinage.json`.

## Decision

AHG will use this split:

- Supabase: all public collection, item, and stats metadata.
- Firebase Storage: image storage only.
- Canonical period parsing: `frontend/src/backend-support/mappers/normalizeItem.ts`.

Any public archive codepath that lacks Supabase configuration should fail explicitly instead of silently falling back to Firebase metadata.

## Design

### Public frontend reads

`collectionService.ts` and `itemService.ts` should stop reading Firestore and stop fetching legacy collection JSON when used for public archive reads.

They should:

- read exclusively through the existing Supabase service modules
- throw a clear configuration error when Supabase env is missing
- preserve the current returned `CollectionRecord` and `ItemRecord` shapes

### Public backend APIs

`backend/src/index.js` public archive routes should stop reading Firebase RTDB for metadata.

The backend should expose:

- `/api/archive-stats` via the existing Supabase-first stats logic
- `/api/collections` via Supabase
- `/api/collections/:id` via Supabase by slug
- `/api/items/:id` as the collection-items-by-slug endpoint backed by Supabase

The response shape should stay compatible with the existing route contracts where practical.

### Period normalization

`deriveYearRange()` is the canonical parser for archive sorting.

The import and verification flow should use that single parser for:

- `sort_year_start`
- `sort_year_end`
- unresolved-period reporting

No second backend-specific year parser should be introduced for this flow.

### Snapshot resolution and reprocess flow

All-collection reprocessing should resolve snapshots from both:

- `backend-support/snapshots/firebase-archive`
- `temp/data`

Resolution should prioritize enabled collection slugs from the collection registry, rather than blindly importing every JSON file in `temp/data`.

This allows the flow to include collections like `early-coinage` even when they have not yet been copied into the canonical snapshot export folder.

### Verification

The reprocess flow should report:

- which snapshot file was used per collection
- import results per collection
- unresolved period counts per collection
- sample unresolved period strings for manual cleanup

## Testing

- Vitest coverage for public frontend services rejecting legacy fallback behavior when Supabase config is missing.
- Vitest coverage for the shared snapshot resolver choosing the correct collection files.
- Node test coverage for backend Supabase-backed public archive helpers.
- Fresh local verification by running targeted tests plus the all-collection period reprocess script.
