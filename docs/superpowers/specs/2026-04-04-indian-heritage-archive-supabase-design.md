# Indian Heritage Archive Supabase Phase 1 Design

## Summary

AHG should evolve into a full Indian cultural heritage archive with one shared archive core and domain-aware profiles for coins, stamps, banknotes, postal stationery, medals, and related material.

Phase 1 keeps Firebase Storage as the media layer and makes Supabase Postgres the metadata source of truth.

The final schema direction should be:

- a shared archive core for domains, collections, entities, conceptual records, physical items, media, tags, categories, provenance, and owner-private maintenance data
- NUDS-inspired support for numismatics through a split between conceptual coin types and physical collected coins
- equivalent issue/type support for philately, banknotes, and postal stationery
- AHG-owned canonical IDs with external authority links to Nomisma, WNS, Wikidata, GeoNames, Getty vocabularies, and similar sources

This design deliberately moves beyond a generic `items + jsonb` catalog. It keeps flexibility where needed, but treats domain standards as first-class design inputs.

## Standards Direction

The archive should align with these reference models:

- NUDS / Nomisma for numismatic type and object description
- UPU / WADP WNS-style issue metadata for philately
- Spectrum for collection-management, provenance, rights, movement, valuation, and accountability

The system does not need to implement these standards verbatim, but it should support the same information shape.

## Goals

- Support the entire Indian collection as one archive, not only coin albums
- Preserve and migrate current coin collections safely
- Represent both conceptual issues/types and physical owned items
- Support rich numismatic records comparable to NUDS-style data
- Support stamp, note, and postal-material issue records with authoritative issue metadata
- Generate smart category pages automatically from canonical entities and themes
- Support stable public references for each item and type
- Keep owner-only valuation, acquisition, and maintenance data private
- Allow deterministic related-item logic based on structured evidence

## Non-Goals

- Full CIDOC CRM or linked-open-data ontology implementation in Phase 1
- Public social-post generation, challenges, and community flows in Phase 1
- Replacing Firebase Storage
- Perfect automatic authority alignment for every record on first ingest

## Archive Model

The archive should be built around three record layers:

1. Domain and collection structure
2. Conceptual records
3. Physical records

### Domain and collection structure

- `domains`
- `collections`
- `collection_schemas`
- `ingest_sources`
- `ingest_runs`

### Conceptual records

Conceptual records are issue-level or type-level records. They represent the thing in scholarship, not your specific specimen.

Examples:

- Mughal Akbar silver rupee, Lahore mint, type
- 1949 India definitive stamp issue
- RBI 10-rupee banknote issue with a given signature combination

### Physical records

Physical records represent the actual item you own or catalogued from an album.

Examples:

- one specific Akbar rupee in your collection
- one mounted stamp specimen in your album
- one particular banknote with serial prefix and condition details

## Canonical Identity Strategy

Every important record should have:

- UUID primary key for database integrity
- AHG-owned canonical ID for public references

Examples:

- `ahg:domain:coins`
- `ahg:collection:coins:mughals`
- `ahg:type:coin:mughal:akbar:rupee:lahore`
- `ahg:item:coin:mughal:akbar:rupee:lahore:0001`
- `ahg:issue:stamp:india:scientists:c-v-raman`
- `ahg:item:stamp:india:scientists:c-v-raman:0001`
- `ahg:entity:person:akbar`
- `ahg:entity:dynasty:asaf-jahi`

Rules:

- canonical IDs are owned by AHG
- external IDs never replace AHG IDs as primary identifiers
- display labels may change without changing canonical IDs
- aliases resolve to canonical entities, not to ad hoc text labels

## Final Supabase Schema Direction

The schema should keep the shared archive core and add conceptual/domain profile tables.

## Shared Core Tables

### `domains`

Top-level archive areas such as Coins, Stamps, Currency, Postal Stationery, Documents.

### `collections`

Album- or source-aware collection containers. These preserve provenance from PDFs, folder batches, and curation.

### `collection_schemas`

Configuration for collection-specific UI filters, editorial display rules, and ingest expectations.

### `conceptual_items`

Conceptual issue/type/design records.

Core fields:

- `id uuid primary key`
- `canonical_id text unique not null`
- `domain_id uuid not null references domains(id)`
- `collection_id uuid references collections(id)`
- `concept_type text not null`
- `slug text unique not null`
- `title text not null`
- `subtitle text`
- `summary text`
- `era_label text`
- `date_start int`
- `date_end int`
- `display_date text`
- `country_code text not null default 'IN'`
- `authority_status text not null`
- `search_text tsvector`
- `attributes jsonb not null default '{}'::jsonb`
- `review_status text not null`
- `visibility text not null`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

Examples of `concept_type`:

- `coin_type`
- `stamp_issue`
- `banknote_issue`
- `postal_stationery_issue`
- `medal_type`

### `items`

Physical collected or observed objects.

In the final design, `items` should explicitly mean physical specimens.

Core fields:

- `id uuid primary key`
- `canonical_id text unique not null`
- `domain_id uuid not null references domains(id)`
- `collection_id uuid not null references collections(id)`
- `conceptual_item_id uuid references conceptual_items(id)`
- `item_type text not null`
- `slug text unique`
- `title text not null`
- `subtitle text`
- `description text`
- `short_description text`
- `era_label text`
- `date_start int`
- `date_end int`
- `display_date text`
- `country_code text not null default 'IN'`
- `primary_image_path text`
- `primary_image_alt text`
- `search_text tsvector`
- `attributes jsonb not null default '{}'::jsonb`
- `sort_title text not null`
- `sort_year_start int`
- `sort_year_end int`
- `review_status text not null`
- `visibility text not null`
- `source_page_number int`
- `source_page_label text`
- `source_batch text`
- `source_reference text`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

### `item_private_profiles`

Private owner-facing data only.

Fields include:

- `item_id`
- `owner_user_id`
- `year_bought`
- `purchase_price`
- `purchase_currency`
- `estimated_value_min`
- `estimated_value_max`
- `estimated_value_avg`
- `acquisition_source`
- `acquisition_date`
- `internal_notes`
- `private_tags`
- `private_attributes`

These fields are never used in public filtering, sorting, or category generation.

### `media_assets`

General media table for both conceptual and physical records.

Core fields:

- `id uuid primary key`
- `target_kind text not null`
- `target_id uuid not null`
- `storage_provider text not null`
- `storage_path text not null`
- `public_url text`
- `asset_role text not null`
- `alt_text text`
- `caption text`
- `sort_order int not null default 0`
- `width int`
- `height int`
- `metadata jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

`target_kind` can be:

- `item`
- `conceptual_item`
- `entity`
- `category_page`
- `collection`

### `entities`

Canonical named things.

Entity types include:

- `person`
- `dynasty`
- `kingdom`
- `state`
- `mint`
- `place`
- `postal_authority`
- `institution`
- `species`
- `theme_subject`
- `language`
- `deity`
- `event`
- `printer`
- `designer`
- `engraver`

### `entity_aliases`

Alias and normalization table for canonical entity resolution.

This is where `Akbar`, `Jalal-ud-din Muhammad Akbar`, and related forms map to one canonical entity.

### `themes`

Cross-domain browsing themes such as Birds, Scientists, Gandhi, Railways, Temples, Freedom Movement.

### `tags`

Public-facing faceting labels derived from canonical entities, controlled values, and editorial themes.

### `authority_links`

Links AHG records to external knowledge bases.

Core fields:

- `local_kind`
- `local_id`
- `authority_name`
- `authority_id`
- `authority_url`
- `match_type`
- `confidence`

Authority targets include:

- `nomisma`
- `wikidata`
- `wns`
- `geonames`
- `getty_tgn`
- `getty_aat`

### `category_pages`

Generated or curated landing pages for domains, collections, entities, themes, and possibly conceptual records.

### `record_entities`

General relation table between records and entities.

Core fields:

- `id uuid primary key`
- `record_kind text not null`
- `record_id uuid not null`
- `entity_id uuid not null references entities(id)`
- `relation_type text not null`
- `is_primary boolean not null default false`
- `confidence numeric(5,4)`
- `source text not null`
- `created_at timestamptz not null`

Examples:

- conceptual coin type -> Akbar -> `issued_by`
- physical coin -> Lahore mint -> `minted_at`
- stamp issue -> C. V. Raman -> `depicts_person`
- stamp issue -> India Post -> `issued_by_authority`

### `record_themes`

General relation table between records and themes.

### `record_tags`

General relation table between records and tags.

### `record_relations`

General relation table for explainable similarity and relationships.

Fields:

- `source_kind`
- `source_id`
- `related_kind`
- `related_id`
- `relation_type`
- `score`
- `reason`

### `record_references`

Structured references to catalogues, publications, sale listings, and scholarly citations.

Fields:

- `record_kind`
- `record_id`
- `reference_type`
- `reference_system`
- `reference_code`
- `citation_text`
- `url`
- `is_primary`

This is critical for NUDS-like support.

### `provenance_events`

Ownership, acquisition, auction, publication, transfer, or exhibition history.

Fields:

- `item_id`
- `event_type`
- `actor_entity_id`
- `counterparty_entity_id`
- `event_date`
- `event_date_note`
- `location_entity_id`
- `amount`
- `currency_code`
- `source_note`
- `is_private`

### `discovery_contexts`

Archaeological or find-context support for numismatics and related materials.

Fields:

- `conceptual_item_id`
- `item_id`
- `context_type`
- `findspot_entity_id`
- `hoard_name`
- `deposit_date_note`
- `discovery_note`
- `source_note`

## Domain Profile Tables

The shared core is not enough by itself. Each major domain needs focused profile tables.

## Numismatic Support

The archive should support NUDS-like numismatic depth through these tables.

### `numismatic_type_profiles`

One row per conceptual coin type.

Fields include:

- `conceptual_item_id uuid primary key references conceptual_items(id)`
- `object_type text`
- `denomination text`
- `manufacture text`
- `material text`
- `mint_entity_id uuid`
- `authority_entity_id uuid`
- `issuer_entity_id uuid`
- `dynasty_entity_id uuid`
- `region_entity_id uuid`
- `date_on_object text`
- `date_standardized_start int`
- `date_standardized_end int`
- `type_series text`
- `catalogue_primary text`
- `obverse_summary text`
- `reverse_summary text`
- `edge_summary text`
- `attributes jsonb not null default '{}'::jsonb`

### `numismatic_item_profiles`

One row per physical coin specimen.

Fields include:

- `item_id uuid primary key references items(id)`
- `material text`
- `denomination text`
- `weight_grams numeric(10,4)`
- `diameter_mm numeric(10,3)`
- `axis_hours numeric(5,2)`
- `condition_label text`
- `authenticity_status text`
- `mint_entity_id uuid`
- `issuer_entity_id uuid`
- `authority_entity_id uuid`
- `type_series text`
- `catalogue_primary text`
- `estimated_public_price_min numeric(12,2)`
- `estimated_public_price_max numeric(12,2)`
- `attributes jsonb not null default '{}'::jsonb`

### `item_sides`

Supports obverse, reverse, edge, and other sided descriptions.

Fields:

- `id uuid primary key`
- `target_kind text not null`
- `target_id uuid not null`
- `side_type text not null`
- `description text`
- `legend text`
- `transcription text`
- `translation text`
- `orientation_note text`
- `attributes jsonb not null default '{}'::jsonb`

`target_kind` may be `conceptual_item` or `item`.

### `item_symbols`

Structured symbols, monograms, tamghas, mintmarks, privy marks, control marks.

### `measurements`

Normalized physical measurements for any physical object.

Fields:

- `item_id`
- `measurement_type`
- `value_numeric`
- `unit`
- `qualifier`

### `hoards`

Optional hoard-level records for numismatic context.

### NUDS-aligned capabilities required

- conceptual type description
- physical object description
- obverse and reverse structured data
- legends and inscriptions
- type series and catalogue references
- mint, authority, issuer, denomination, material
- physical measurements
- provenance and find context
- hoard linkage where relevant
- external Nomisma linking

## Philatelic Support

Philately should follow the same conceptual-versus-physical principle.

### `philatelic_issue_profiles`

One row per conceptual stamp issue or issue member.

Fields include:

- `conceptual_item_id uuid primary key references conceptual_items(id)`
- `issuing_authority_entity_id uuid`
- `series_title text`
- `issue_date date`
- `face_value numeric(12,4)`
- `face_value_currency text`
- `format_type text`
- `printing_method text`
- `printer_entity_id uuid`
- `designer_entity_id uuid`
- `engraver_entity_id uuid`
- `perforation text`
- `watermark text`
- `paper_type text`
- `gum_type text`
- `sheet_details text`
- `overprint_text text`
- `surcharge_text text`
- `wns_number text`
- `official_status text`
- `attributes jsonb not null default '{}'::jsonb`

### `philatelic_item_profiles`

One row per physical stamp specimen.

Fields include:

- `item_id uuid primary key references items(id)`
- `centering_grade text`
- `gum_condition text`
- `hinged_status text`
- `used_status text`
- `cancellation_type text`
- `cancellation_place_entity_id uuid`
- `cancellation_date date`
- `margin_note text`
- `sheet_position text`
- `attributes jsonb not null default '{}'::jsonb`

### Philatelic capabilities required

- issue-level authoritative metadata
- thematic links such as birds, scientists, institutions
- issue date and face value
- perforation, watermark, paper, printing method
- designer, engraver, printer, postal authority
- overprint and surcharge support
- specimen-level condition and postal-use details
- WNS or analogous authority linking where available

## Banknote Support

### `banknote_issue_profiles`

Fields include:

- `conceptual_item_id uuid primary key references conceptual_items(id)`
- `issuing_authority_entity_id uuid`
- `series_title text`
- `denomination numeric(12,4)`
- `currency_code text`
- `issue_date date`
- `withdrawal_date date`
- `signature_primary_entity_id uuid`
- `signature_secondary_entity_id uuid`
- `watermark text`
- `security_thread text`
- `dimensions_note text`
- `printer_entity_id uuid`
- `catalogue_primary text`
- `attributes jsonb not null default '{}'::jsonb`

### `banknote_item_profiles`

Fields include:

- `item_id uuid primary key references items(id)`
- `serial_number text`
- `serial_prefix text`
- `grade text`
- `replacement_note_status text`
- `signature_variant text`
- `error_note text`
- `attributes jsonb not null default '{}'::jsonb`

## Postal Stationery Support

### `postal_stationery_issue_profiles`

Fields include:

- `conceptual_item_id uuid primary key references conceptual_items(id)`
- `stationery_type text`
- `issuing_authority_entity_id uuid`
- `issue_date date`
- `face_value numeric(12,4)`
- `face_value_currency text`
- `paper_type text`
- `size_note text`
- `imprinted_stamp_note text`
- `catalogue_primary text`
- `attributes jsonb not null default '{}'::jsonb`

## Smart Tags and Canonicalization

Public tags should be generated from:

- canonical linked entities
- controlled denominations and materials
- authoritative issue/type metadata
- editorial themes

Public tags should not be generated directly from arbitrary OCR fragments.

Alias handling should resolve historical naming variants to the canonical entity table.

Examples:

- `Akbar`
- `Jalal-ud-din Muhammad Akbar`
- `Akbar the Great`

all map to one `entities` record, which then drives:

- filters
- search aliases
- category pages
- similar items

## Similar and Related Item Logic

Relatedness should be explainable and domain-aware.

High-confidence signals:

- same conceptual type or issue
- same issuer
- same dynasty
- same mint
- same denomination
- same postal authority
- same printer or engraver
- same theme
- same catalogue reference family

Every relation should store:

- `relation_type`
- `score`
- `reason`

## Category Page Generation

Category pages should be generated from:

- domains
- collections
- entities
- themes
- selected conceptual records

Hero images should come from the best linked public media.

Summaries should be editable after auto-generation.

## Security

Public views should expose only:

- published domains
- published collections
- public conceptual records
- public physical records
- public category pages
- public tags and public entity metadata

Owner/admin views should additionally expose:

- `item_private_profiles`
- private provenance events
- maintenance metadata

## Migration Direction

Phase 1 migration should proceed in this order:

1. establish the shared archive core in Supabase
2. add conceptual and physical separation
3. migrate current coin collections into:
   - conceptual coin types
   - physical coin items
   - canonical entities
   - references and profile tables
4. validate counts and media parity
5. ingest early / primitive and foreign rulers into the new numismatic model
6. only then widen ingestion to stamps, notes, and postal material

## Decision

Phase 1 should proceed with:

- Supabase Postgres as the metadata source of truth
- Firebase Storage retained for media
- AHG-owned canonical IDs
- a shared archive core
- `conceptual_items` plus physical `items`
- NUDS-inspired numismatic profile tables
- equivalent issue/specimen profile tables for philately, banknotes, and postal stationery
- private owner-maintenance data isolated from public archive views
