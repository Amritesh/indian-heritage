# AHG Repository Overview

## Purpose

Anand Heritage Gallery is a digital archive for curated Indian heritage collections. The current focus is numismatics, with Mughal coins moving from page-wise album entries to item-wise catalog records.

## Top-Level Structure

- `frontend/`: React app for browsing collections and item details.
- `backend/`: Firebase Functions Express API plus Python coin-cataloguing tools.
- `temp/data/`: Local JSON source-of-truth files for collection detail payloads.
- `temp/images/`: Local working image folders, including page images and cropped coin outputs.
- `docs/`: Static build output for frontend deployment.

## Runtime Pieces

- Frontend fetches collection data from the deployed backend API.
- Backend API in `backend/src/index.js` serves:
  - `/api/collections`
  - `/api/collections/:id`
  - `/api/items/:id`
  - `/api/processImage`
- Firebase Realtime Database stores:
  - `collections`
  - `collection_details`
- Firebase Storage stores item/page images under `images/<collection>/...`.

## Coin Cataloguing Flow

- Entry point: `backend/coin_cataloguer/main.py`
- Crew definition: `backend/coin_cataloguer/crew.py`
- Segmentation tool: `backend/coin_cataloguer/tools/image_segmenter.py`
- Coin analysis tool: `backend/coin_cataloguer/tools/coin_analyzer.py`

The intended Mughal flow is:

1. Start from a page image such as `temp/images/mughals-1-1/page-18.png`.
2. Segment the page into individual cropped coin images.
3. Analyze each crop and save `catalogue.json` next to the output images.
4. Upload with `--collection mughals --upload`.
5. Merge new items into the existing `mughals` dataset instead of resetting the collection.

## Important Current Scripts

- `backend/scripts/uploadData.js`: bulk uploader for local temp data and images.
- `backend/scripts/prepareCollectionData.js`: older page-wise JSON generator.
- `backend/scripts/syncCollection.js`: current sync/cleanup script for pushing a local collection JSON to Firebase while filtering stale items and removing legacy paths.

## Current Mughal Direction

- Keep `temp/data/mughals.json` as the main local collection file.
- Treat processed single-coin entries as the valuable source data.
- Remove page-level placeholder records from the public `mughals` collection.
- Append newly processed coin items under `mughals`; do not recreate the collection from scratch.
