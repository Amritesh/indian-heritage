# Mughal Collection Workflow

## Current Safe Workflow

### 1. Keep local Mughal JSON up to date

Local file:

- `temp/data/mughals.json`

Before major cleanup or sync, merge in the deployed API payload if needed so already processed single-coin entries are not lost.

### 2. Sync local Mughal JSON to Firebase

Current sync command:

```bash
node /Users/amritesh/Desktop/code/AHG/backend/scripts/syncCollection.js \
  --collection mughals \
  --data /Users/amritesh/Desktop/code/AHG/temp/data/mughals.json \
  --exclude-image-prefix gs://indian-heritage-gallery-bucket/images/mughals-1/page- \
  --exclude-image-prefix gs://indian-heritage-gallery-bucket/images/mughals-2/page- \
  --delete-detail-key mughals-1-1 \
  --delete-detail-key mughals-2-2 \
  --delete-storage-prefix images/mughals-1/page- \
  --delete-storage-prefix images/mughals-2/page- \
  --delete-storage-prefix images/mughals-1-1/ \
  --delete-storage-prefix images/mughals-2-2/
```

This does three things:

- filters stale page-level entries out of local `mughals.json`
- writes the cleaned `mughals` payload to Firebase
- deletes legacy Mughal detail branches and old storage objects

## Cataloguer Behavior

Command:

```bash
cd /Users/amritesh/Desktop/code/AHG/backend
python -m coin_cataloguer.main \
  --image /Users/amritesh/Desktop/code/AHG/temp/images/mughals-1-1/page-18.png \
  --collection mughals \
  --upload
```

Expected behavior after the uploader changes:

- process the supplied page locally
- save cropped coin images plus `catalogue.json`
- upload newly found coins into `mughals`
- merge with existing `temp/data/mughals.json`
- avoid resetting `collection_details/mughals`

## Validation Checks

### Local

```bash
python - <<'PY'
import json
with open('/Users/amritesh/Desktop/code/AHG/temp/data/mughals.json', encoding='utf-8') as f:
    data = json.load(f)
print(len(data.get('items', [])))
PY
```

### API

```bash
python - <<'PY'
import json, urllib.request
url='https://us-central1-indian-heritage-gallery.cloudfunctions.net/app/api/items/mughals'
with urllib.request.urlopen(url) as resp:
    payload=json.load(resp)
print(len((payload.get('itemCollection') or {}).get('items') or []))
PY
```

## Practical Caution

If a new upload introduces low-quality or duplicate AI-generated items, clean `temp/data/mughals.json` first and resync from local. The local file should remain the working reference for this collection.
