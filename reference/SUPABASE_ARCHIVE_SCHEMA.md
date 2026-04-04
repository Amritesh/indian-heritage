# Supabase Archive Schema

## Purpose

This file is a short guide to the current AHG Supabase archive schema direction.

## Main Principle

AHG stores:

- conceptual records
- physical specimen records
- canonical entities
- public tags and themes
- owner-private maintenance data

## Shared Core Tables

- `domains`
- `collections`
- `collection_schemas`
- `conceptual_items`
- `items`
- `item_private_profiles`
- `entities`
- `entity_aliases`
- `themes`
- `tags`
- `media_assets`
- `record_entities`
- `record_themes`
- `record_tags`
- `record_relations`
- `record_references`
- `provenance_events`
- `discovery_contexts`
- `hoards`
- `measurements`
- `item_sides`
- `item_symbols`
- `category_pages`
- `authority_links`
- `ingest_sources`
- `ingest_runs`

## Domain Profile Tables

- `numismatic_type_profiles`
- `numismatic_item_profiles`
- `philatelic_issue_profiles`
- `philatelic_item_profiles`
- `banknote_issue_profiles`
- `banknote_item_profiles`
- `postal_stationery_issue_profiles`

## Public / Private Split

Public:

- `conceptual_items`
- `items`
- public `entities`
- public `themes`
- public `tags`
- published `category_pages`

Private:

- `item_private_profiles`
- private provenance events
- owner-only maintenance metadata

## Current Migration Direction

The current Firebase archive migration is focused first on coin collections and writes:

- `collections`
- `conceptual_items`
- `items`
- `media_assets`
- `tags`
- `record_tags`
- `entities`
- `record_entities`
- `record_references`
- `numismatic_type_profiles`
- `numismatic_item_profiles`
- `item_private_profiles`

This lets AHG keep today’s frontend behavior while moving toward a standards-aligned archive model.
