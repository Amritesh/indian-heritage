# Archive Modules

## Purpose

This file helps AI agents and contributors understand the main archive modules in AHG.

## Core Data And Modeling

- `supabase/migrations/20260404_000002_archive_schema.sql`
  The current draft archive schema. Shared archive core plus conceptual and physical record modeling.
- `supabase/migrations/20260404_000003_rls_policies.sql`
  Public versus private access rules.
- `reference/NUMISMATIC_STANDARDS.md`
  NUDS-inspired numismatic modeling notes.
- `reference/PHILATELY_AND_PAPER_MODEL.md`
  Issue-versus-specimen modeling for stamps, notes, and postal stationery.
- `reference/CANONICAL_IDS_AND_AUTHORITIES.md`
  Canonical ID and authority-linking rules.

## Shared Canonicalization

- `frontend/src/shared/lib/catalogCanonicalization.ts`
  Shared canonical label, alias, tag, and keyword helpers.
- `frontend/src/shared/lib/catalogNormalization.ts`
  Compatibility layer exposing canonicalization plus denomination normalization.
- `backend/scripts/catalogNormalization.js`
  Backend-side equivalent normalization for ingest and migration scripts.
- `shared-data/entityAliases.json`
  Canonical alias data for rulers, authorities, and mints.

## Supabase Frontend Layer

- `frontend/src/shared/config/supabase.ts`
  Supabase env detection.
- `frontend/src/shared/services/supabase.ts`
  Lightweight PostgREST access helpers.
- `frontend/src/backend-support/schemas/archive.ts`
  Zod schemas for archive rows used by the frontend.
- `frontend/src/backend-support/mappers/normalizeArchiveCollection.ts`
  Maps archive collection rows into current frontend collection records.
- `frontend/src/backend-support/mappers/normalizeArchiveItem.ts`
  Maps archive item rows into current frontend item records.

## Archive Entity Services

- `frontend/src/entities/collection/api/collectionService.supabase.ts`
  Supabase-first collection reads and aggregate item/material derivation.
- `frontend/src/entities/item/api/itemService.supabase.ts`
  Supabase-first item, related-item, and search-loading helpers.
- `frontend/src/entities/collection/api/collectionService.ts`
  Runtime service that now prefers Supabase and falls back to Firebase/registry.
- `frontend/src/entities/item/api/itemService.ts`
  Runtime item service with current sort, filter, related-item, and search behavior.
- `frontend/src/entities/domain/api/domainService.ts`
  Domain browsing queries.
- `frontend/src/entities/category/api/categoryService.ts`
  Category page queries.
- `frontend/src/entities/private-item/api/privateItemService.ts`
  Owner-only private item profile access.

## Migration And Verification Scripts

- `frontend/scripts/export-firebase-archive.ts`
  Exports Firebase metadata into local archive snapshots.
- `frontend/scripts/import-supabase-archive.ts`
  Converts Firebase snapshots into conceptual items, physical items, profiles, entities, tags, and references for Supabase.
- `frontend/scripts/verify-supabase-migration.ts`
  Compares Firebase snapshot counts against Supabase counts.
- `frontend/scripts/import-collections.ts`
  Existing snapshot generation and collection import support.

## Ingest Pipeline

- `backend/coin_cataloguer/main.py`
  Main entry for coin cataloguing.
- `backend/coin_cataloguer/crew.py`
  Segmentation and numismatic cataloguing orchestration.
- `backend/coin_cataloguer/enrich_collection.py`
  Collection enrichment logic.
- `backend/coin_cataloguer/batch_ingest.py`
  Page batch ingest pipeline.
- `backend/coin_cataloguer/tools/coin_analyzer.py`
  Coin analysis prompt and structured metadata extraction.

## Protected Source Material

- `temp/backend/data`
  Source PDFs, page images, and protected migration-era material. Do not delete during migration work.
