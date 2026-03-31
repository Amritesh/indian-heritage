# Indian Heritage Gallery

Firebase-first archive frontend for the British and Mughals collections. Runtime reads come from Firestore; the legacy source APIs are used only by the import/sync pipeline.

## Local Dev

From the repo root:

```bash
npm install
npm run firebase:env
npm run dev
```

`npm run firebase:env` writes [`frontend/.env.example`](/Users/amritesh/Desktop/code/AHG/frontend/.env.example)-compatible runtime config into a local `frontend/.env` file using the Firebase project in [`/.firebaserc`](/Users/amritesh/Desktop/code/AHG/.firebaserc). That file is gitignored.

## Import Data

The importer is idempotent and safe to rerun. It upserts stable top-level documents into:

- `collections/{collectionId}`
- `items/{itemId}`

Run one of:

```bash
npm run import:collections
npm run import:british
npm run import:mughals
```

The script fetches the source APIs once, validates payloads with zod, normalizes them, writes to Firestore, and stores a debug snapshot under [`backend-support/snapshots`](/Users/amritesh/Desktop/code/AHG/backend-support/snapshots).

## Deploy

From the repo root:

```bash
npm install
npm run firebase:env
npm run build
firebase deploy
```

If you prefer the repo-local CLI:

```bash
npm run deploy:firebase
```

Firebase Hosting deploys [`frontend/dist`](/Users/amritesh/Desktop/code/AHG/frontend/dist), rewrites all routes to `index.html` for SPA routing, and also publishes:

- [`firebase.json`](/Users/amritesh/Desktop/code/AHG/firebase.json)
- [`firestore.rules`](/Users/amritesh/Desktop/code/AHG/firestore.rules)
- [`firestore.indexes.json`](/Users/amritesh/Desktop/code/AHG/firestore.indexes.json)
- [`storage.rules`](/Users/amritesh/Desktop/code/AHG/storage.rules)

## Coin Cataloguer (CrewAI Pipeline)

The cataloguer uses three AI agents in sequence to process a coin album page and sync it to Firestore.

### Setup

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # add GEMINI_API_KEY and SERPER_API_KEY
```

### Full Pipeline — All Three Tools in Order

```bash
# From repo root
cd backend

# Tool 1 — segment_coins: detect and crop individual coins from a page image
# Tool 2 — analyze_coin:  identify each coin and produce a full catalogue entry
# Tool 3 — sync_collection_stats: push updated itemCount, materials, worth,
#           sortYear, and estimatedPriceAvg to Firestore
python -m coin_cataloguer.main \
  --image /path/to/temp/images/mughals-1-1/page-25.png \
  --collection mughals \
  --output /path/to/temp/output \
  --upload
```

The crew runs the three steps sequentially. `--upload` triggers the Firebase image upload (Tool 2 output) and the stats sync (Tool 3) automatically.

### Paired-Page Processing (obverse + reverse)

```bash
python -m coin_cataloguer.process_pairs \
  --collection mughals \
  --base-dir /path/to/temp/images/mughals-1-1 \
  --pairs "1:2,3:4,5:6" \
  --upload
```

After `process_pairs` adds new items, run the stats sync separately:

```bash
node backend/scripts/importToFirestore.js --collection mughals
```

### Sync Stats Only (after manual data edits)

```bash
node backend/scripts/importToFirestore.js --collection mughals
node backend/scripts/importToFirestore.js --collection british
node backend/scripts/importToFirestore.js   # both collections
```

## Data Model

Top-level `items` are intentional so item lookup, search, and future collections stay generic. Current indexed query patterns cover:

- enabled collections ordered by `sortOrder`
- published items by `collectionSlug`
- collection filtering by `materials`
- title, page, and imported-date sorting

## Verification Checklist

- app loads with Firebase web config from `frontend/.env`
- `/collections` shows British and Mughals from Firestore
- `/items/:itemId` renders item details from Firestore
- importer can be rerun without duplicate corruption because item ids are stable
- `firebase deploy` publishes hosting, rules, storage rules, and indexes together
