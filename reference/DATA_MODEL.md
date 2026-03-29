# AHG Data Model Notes

## `collections`

Top-level listing metadata used by the frontend collection grid.

Typical fields:

- `id`
- `title`
- `assetValue`
- `category`
- `volume`
- `era`
- `description`
- `time`
- `pages`
- `image`
- `items`

Notes:

- In the live database, `collections` currently behaves like a list, not just a keyed object.
- Sync code must dedupe by `id` when updating a collection entry.

## `collection_details/<collectionId>`

Primary detail payload used by `/api/items/:id` and `/api/collections/:id`.

Expected shape:

```json
{
  "album_title": "Mughals",
  "items": [
    {
      "id": "jahangir-coin-1",
      "title": "Jahangir 1st Month Ilahi",
      "image": "gs://indian-heritage-gallery-bucket/images/mughals-1/jahangir-coins/coin-1.png",
      "notes": ["..."],
      "description": "...",
      "period": "...",
      "region": "...",
      "materials": ["Silver"],
      "display_labels": ["Wt: ..."],
      "metadata": {
        "ruler_or_issuer": "Jahangir",
        "year_or_period": "...",
        "mint_or_place": "Patna Mint",
        "denomination": "...",
        "series_or_catalog": "...",
        "material": "Silver",
        "condition": "...",
        "weight_estimate": "...",
        "estimated_price_inr": "...",
        "confidence": "High"
      }
    }
  ]
}
```

## Legacy vs Current Mughal Data

Legacy page-wise shapes existed in multiple forms:

- `collection_details/mughals` containing page placeholder records like `images/mughals-1/page-13.png`
- `collection_details/mughals-1-1`
- `collection_details/mughals-2-2`

Current desired shape:

- `collection_details/mughals` should contain item-wise coin entries only.
- Old page placeholder records should be filtered out.
- Legacy detail branches should be removed when no longer needed.

## Local Source Files

- Main curated Mughal file: `temp/data/mughals.json`
- Global collection metadata seed: `temp/data/collections.json`

## Merge Rules For New Coin Uploads

- Use local `temp/data/<collection>.json` as the preferred baseline when present.
- Preserve existing item IDs where possible.
- Deduplicate primarily by image path, then fall back to metadata/title identity.
- New uploads should land under `images/<collection>/<page-stem>/coin_<n>.png` so repeated page runs stay page-scoped.
