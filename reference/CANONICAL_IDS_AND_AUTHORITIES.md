# Canonical IDs And Authorities

## Purpose

This file defines how AHG should identify records and connect them to external knowledge bases.

## Golden Rule

AHG owns the canonical IDs.

External authorities are linked references, not the primary identity of the record.

## Canonical ID Patterns

Examples:

- `ahg:domain:coins`
- `ahg:collection:coins:mughals`
- `ahg:type:coin:mughal:akbar:rupee:lahore`
- `ahg:item:coin:mughal:akbar:rupee:lahore:0001`
- `ahg:issue:stamp:india:scientists:c-v-raman`
- `ahg:item:stamp:india:scientists:c-v-raman:0001`
- `ahg:entity:person:akbar`
- `ahg:entity:dynasty:asaf-jahi`
- `ahg:entity:postal-authority:india-post`

## Rules

- never reuse canonical IDs
- never derive them from mutable UI labels only
- do not expose raw database UUIDs as the main public reference
- use canonical IDs in URLs, exports, and cross-record references where practical

## Authority Links

Store external matches in `authority_links`.

Useful authority families:

- `nomisma`
- `wikidata`
- `wns`
- `geonames`
- `getty_tgn`
- `getty_aat`

Suggested fields:

- `local_kind`
- `local_id`
- `authority_name`
- `authority_id`
- `authority_url`
- `match_type`
- `confidence`

## Alias Resolution

Aliases belong to canonical entities, not to tags.

Process:

1. normalize raw text
2. resolve to canonical entity where confidence is high
3. preserve raw text separately
4. derive public tags from canonical entity labels

This keeps search broad while keeping browsing clean.

## Public Tags

Public tags should be derived from:

- entities
- themes
- controlled denominations
- controlled materials
- strong issue/type metadata

Avoid creating public tags directly from arbitrary OCR text or notes.
