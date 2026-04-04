# Philately And Paper Model

## Purpose

This file explains how AHG should model stamps, banknotes, and postal stationery in a way similar to the NUDS-style numismatic split.

The same core rule applies:

- one conceptual issue/design record
- one physical specimen record

## Stamps

Conceptual record:

- `conceptual_items` with `concept_type = stamp_issue`
- profile row in `philatelic_issue_profiles`

Physical record:

- `items` with `item_type = stamp`
- profile row in `philatelic_item_profiles`

Issue-level fields should include:

- issuing authority
- issue date
- face value
- format type
- printing method
- printer
- designer
- engraver
- perforation
- watermark
- paper type
- gum type
- overprint
- surcharge
- WNS number if available

Specimen-level fields should include:

- used or unused
- cancellation place and date
- hinged or mint condition
- centering
- gum condition
- margin notes
- sheet position

## Banknotes

Conceptual record:

- `conceptual_items` with `concept_type = banknote_issue`
- profile row in `banknote_issue_profiles`

Physical record:

- `items` with `item_type = banknote`
- profile row in `banknote_item_profiles`

Issue-level fields:

- issuing authority
- denomination
- currency code
- issue date
- withdrawal date
- watermark
- security thread
- printer
- signature authorities
- catalogue reference

Specimen-level fields:

- serial number
- serial prefix
- grade
- signature variant
- replacement note status
- error note

## Postal Stationery

Conceptual record:

- `conceptual_items` with `concept_type = postal_stationery_issue`
- profile row in `postal_stationery_issue_profiles`

Physical record:

- `items` with `item_type = postal_stationery`

Issue-level fields:

- stationery type
- issuing authority
- issue date
- face value
- paper type
- size note
- imprinted stamp note
- catalogue reference

## Themes

Themes such as Birds, Scientists, Gandhi, Railways, Temples, or Institutions should be linked through:

- `themes`
- `record_themes`

Do not model themes only as raw strings in JSON.

## Public vs Private

Public archive:

- issue metadata
- specimen facts
- thematic and authority links
- public citations

Private owner view:

- purchase details
- internal notes
- personal valuation
- maintenance notes
