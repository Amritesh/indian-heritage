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
