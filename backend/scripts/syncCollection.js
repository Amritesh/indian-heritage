const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const { Storage } = require('@google-cloud/storage');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }
    if (args[key] === undefined) {
      args[key] = next;
    } else if (Array.isArray(args[key])) {
      args[key].push(next);
    } else {
      args[key] = [args[key], next];
    }
    i += 1;
  }
  return args;
}

function asArray(value) {
  if (value === undefined || value === true) return [];
  return Array.isArray(value) ? value : [value];
}

function titleizeCollectionName(collectionName) {
  return String(collectionName || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function loadCollectionMetaSeed(projectRoot, collectionId) {
  const collectionsPath = path.join(projectRoot, 'temp', 'data', 'collections.json');
  if (!fs.existsSync(collectionsPath)) return {};
  const raw = readJson(collectionsPath);
  const entries = raw.collections || raw;
  if (Array.isArray(entries)) {
    return entries.find((entry) => entry && entry.id === collectionId) || {};
  }
  if (entries && typeof entries === 'object') {
    if (entries[collectionId] && typeof entries[collectionId] === 'object') {
      return entries[collectionId];
    }
    return Object.values(entries).find((entry) => entry && entry.id === collectionId) || {};
  }
  return {};
}

function buildCollectionMeta(collectionId, collectionDetail, metaSeed) {
  const items = Array.isArray(collectionDetail.items) ? collectionDetail.items : [];
  const firstImage = items.find((item) => typeof item.image === 'string' && item.image)?.image || '';
  return {
    id: collectionId,
    title: metaSeed.title || collectionDetail.album_title || titleizeCollectionName(collectionId),
    assetValue: metaSeed.assetValue || String(items.length),
    category: metaSeed.category || 'Numismatics',
    volume: metaSeed.volume || '1',
    era: metaSeed.era || '',
    description: metaSeed.description || null,
    time: metaSeed.time || null,
    pages: String(items.length),
    image: metaSeed.image || firstImage,
    items: [],
  };
}

function upsertCollectionMeta(existingCollections, collectionMeta) {
  if (Array.isArray(existingCollections)) {
    const next = [];
    let inserted = false;
    for (const entry of existingCollections) {
      if (!entry || typeof entry !== 'object') {
        next.push(entry);
        continue;
      }
      if (entry.id === collectionMeta.id) {
        if (!inserted) {
          next.push(collectionMeta);
          inserted = true;
        }
        continue;
      }
      next.push(entry);
    }
    if (!inserted) next.push(collectionMeta);
    return next;
  }

  return {
    ...(existingCollections && typeof existingCollections === 'object' ? existingCollections : {}),
    [collectionMeta.id]: collectionMeta,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const collectionId = args.collection;
  if (!collectionId) {
    throw new Error('Missing required --collection argument.');
  }

  const projectRoot = path.resolve(__dirname, '..', '..');
  const dataPath = args.data
    ? path.resolve(String(args.data))
    : path.join(projectRoot, 'temp', 'data', `${collectionId}.json`);
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Collection data file not found: ${dataPath}`);
  }

  const excludePrefixes = asArray(args['exclude-image-prefix']).map((v) => String(v).trim()).filter(Boolean);
  const deleteDetailKeys = asArray(args['delete-detail-key']).map((v) => String(v).trim()).filter(Boolean);
  const deleteStoragePrefixes = asArray(args['delete-storage-prefix']).map((v) => String(v).trim()).filter(Boolean);

  const serviceAccountPath = path.join(projectRoot, 'indian-heritage-gallery-firebase-adminsdk-fbsvc-1c3ae1c07a.json');
  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error(`Firebase service account key not found: ${serviceAccountPath}`);
  }

  const credential = admin.credential.cert(require(serviceAccountPath));
  admin.initializeApp({
    credential,
    databaseURL: 'https://indian-heritage-gallery-default-rtdb.firebaseio.com/',
    storageBucket: 'indian-heritage-gallery-bucket',
  });

  const db = admin.database();
  const storage = new Storage({ keyFilename: serviceAccountPath });
  const bucket = storage.bucket('indian-heritage-gallery-bucket');

  const collectionDetail = readJson(dataPath);
  const originalItems = Array.isArray(collectionDetail.items) ? collectionDetail.items : [];
  const filteredItems = originalItems.filter((item) => {
    const image = String((item && item.image) || '');
    return !excludePrefixes.some((prefix) => image.startsWith(prefix));
  });
  collectionDetail.items = filteredItems;
  if (!collectionDetail.album_title) {
    collectionDetail.album_title = titleizeCollectionName(collectionId);
  }
  writeJson(dataPath, collectionDetail);

  const metaSeed = loadCollectionMetaSeed(projectRoot, collectionId);
  const collectionMeta = buildCollectionMeta(collectionId, collectionDetail, metaSeed);

  await db.ref(`collection_details/${collectionId}`).set(collectionDetail);
  const collectionsSnap = await db.ref('collections').once('value');
  const nextCollections = upsertCollectionMeta(collectionsSnap.val(), collectionMeta);
  await db.ref('collections').set(nextCollections);

  for (const detailKey of deleteDetailKeys) {
    await db.ref(`collection_details/${detailKey}`).remove();
  }

  let deletedFiles = 0;
  for (const prefix of deleteStoragePrefixes) {
    const [files] = await bucket.getFiles({ prefix });
    for (const file of files) {
      await file.delete({ ignoreNotFound: true });
      deletedFiles += 1;
    }
  }

  console.log(JSON.stringify({
    collectionId,
    dataPath,
    itemsBeforeFilter: originalItems.length,
    itemsAfterFilter: filteredItems.length,
    deletedDetailKeys: deleteDetailKeys,
    deletedStoragePrefixes: deleteStoragePrefixes,
    deletedFiles,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
