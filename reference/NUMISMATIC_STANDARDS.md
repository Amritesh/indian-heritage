# Numismatic Standards Reference

## Purpose

This file explains the numismatic modeling direction for AHG.

AHG should not treat coins as generic image cards with a few tags. The archive should support both:

- conceptual numismatic types
- physical collected coin specimens

This mirrors the practical distinction used by NUDS and Nomisma.

## Core Principle

Separate:

- `conceptual_items` with `concept_type = coin_type`
- `items` with `item_type = coin`

Use conceptual records for scholarship and classification.
Use physical item records for your actual specimen, condition, measurements, valuation, and ownership notes.

## NUDS-Like Features AHG Should Support

- ruler / issuer / authority
- dynasty / polity / state
- mint
- denomination
- material
- manufacture
- date and date-on-object
- legends and inscriptions
- obverse / reverse / edge description
- type series and catalogue references
- measurements: weight, diameter, axis
- findspot and discovery context
- hoard membership where known
- provenance chain
- public estimate ranges and private owner values

## Recommended Tables

- `conceptual_items`
- `items`
- `numismatic_type_profiles`
- `numismatic_item_profiles`
- `item_sides`
- `item_symbols`
- `measurements`
- `record_references`
- `provenance_events`
- `discovery_contexts`
- `hoards`
- `record_entities`
- `authority_links`

## Entity Usage

Use canonical `entities` for:

- rulers
- dynasties
- kingdoms
- states
- mints
- places
- languages
- deities
- symbolic motifs when they are meaningful browsing objects

Alias handling must collapse alternate names onto one entity.

Example:

- `Akbar`
- `Jalal-ud-din Muhammad Akbar`
- `Akbar the Great`

should map to one canonical person entity.

## Relatedness Rules

High-confidence numismatic relatedness can be derived from:

- same conceptual type
- same ruler
- same dynasty
- same mint
- same denomination
- same material
- same catalogue family

Always store a reason, not only a score.

## Authority Links

AHG remains the source of truth for local IDs.

Link out to:

- Nomisma
- Wikidata
- GeoNames
- Getty vocabularies

Do not make external IDs the primary key for AHG records.
