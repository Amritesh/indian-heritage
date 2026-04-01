# Denomination Sorting + Conversion Charts Design

**Date:** 2026-04-01  
**Project:** AHG (Anand Heritage Gallery)  
**Owner:** Codex + User

## Goal
Fix date and worth sorting by using consistently derived numeric fields, introduce denomination sorting using a shared conversion chart, and add an About-page card that documents the chart. Sorting must apply to the complete set of filtered items (not only the current page) across both collection and global search.

## Scope
In scope:
- Normalize sortable numeric fields for items (years, price ranges, weight).
- Denomination normalization with a shared chart and optional per-collection overrides.
- Sorting on the full filtered result set for collection browsing and search.
- About page “Conversion Charts” info card.
- Keep raw/source strings intact for display and provenance.

Out of scope:
- Backend database migrations outside Firestore item docs.
- Full historical economic conversion beyond the chart used for browsing order.

## Architecture Overview
Normalization happens during ingest/normalization and stored in Firestore as derived fields. Frontend sorting always uses derived fields, never raw strings. A shared denomination chart lives in frontend config and is used to resolve canonical denomination keys + rank, and to render the About page chart summary. Sorting applies after filters (material, search, etc.) and happens on the complete filtered result set before pagination.

## Data Model Changes
### Item (derived fields)
- `sortYearStart: number`
- `sortYearEnd: number | null`
- `estimatedPriceMin: number`
- `estimatedPriceMax: number`
- `estimatedPriceAvg: number`
- `weightGrams: number | null`
- `denominationSystem: string` (e.g., `shared-indic`)
- `denominationKey: string | null`
- `denominationRank: number`
- `denominationBaseValue: number | null`

### Collection (derived fields)
- `estimatedWorth: number`
- `denominationSystemsUsed: string[]` (optional)
- `denominationStats: Record<string, number>` (optional)

## Denomination Chart
Shared chart with optional per-collection overrides:
- Fields per entry: `key`, `label`, `rank`, `baseValue?`, `aliases[]`
- Resolve order:
  1. Match normalized denomination text against `aliases` or `label`
  2. Assign `denominationKey`, `denominationRank`, `denominationBaseValue`
  3. If no match: `denominationRank = 9999`, `denominationKey = null`

Sorting by denomination:
1. `denominationRank` ascending
2. `denominationBaseValue` ascending
3. `title` ascending (stable tie-break)

## Sorting & Filtering Behavior
- Apply filters (material, search) first.
- Then sort the *entire filtered set* using derived fields.
- Then paginate. This ensures stable ordering independent of page size.

## Tag-Driven Search & Filtering
- Tags for ruler, mint, and denomination must be clickable and filterable.
- Clicking a tag should navigate to search with the tag prefilled and return only items that include that tag.
- In a collection view, clicking a tag should filter within that collection when possible.
- Tags should include normalized values for ruler, mint, and denomination so the filter is consistent with search.

## About Page Conversion Card
New info card that:
- States the chart is a shared ladder for consistent archival sorting.
- Clarifies that historical economic equivalence can vary by era and region.
- Links the chart to the sorting/filtering behavior of the archive.

## Testing
- Unit tests for denomination parsing and rank assignment.
- Tests for sorting with mixed numeric and non-numeric values.
- Verify sorting is applied after filter and before pagination.
