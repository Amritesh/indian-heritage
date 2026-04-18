const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const {
  COLLECTION_CONFIGS,
  DATA_DIR,
  DATA_FILE_MAP,
  transformItem,
} = require('./importToFirestore');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const SERVICE_ACCOUNT_PATHS = [
  path.join(PROJECT_ROOT, 'indian-heritage-gallery-firebase-adminsdk-fbsvc-1c3ae1c07a.json'),
  path.join(PROJECT_ROOT, 'temp', 'serviceAccountKey.json'),
];

function parseArgs() {
  const args = { collection: null, dryRun: false };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--collection' && argv[i + 1]) args.collection = argv[i + 1];
    if (argv[i] === '--dry-run') args.dryRun = true;
  }
  return args;
}

function findServiceAccountPath() {
  return SERVICE_ACCOUNT_PATHS.find((candidate) => fs.existsSync(candidate)) || null;
}

async function main() {
  const args = parseArgs();
  const filesToProcess = Object.entries(DATA_FILE_MAP).filter(([, slug]) =>
    !args.collection || slug === args.collection,
  );

  if (!filesToProcess.length) {
    throw new Error(`No matching collection found for "${args.collection}"`);
  }

  let db = null;
  if (!args.dryRun) {
    const serviceAccountPath = findServiceAccountPath();
    if (!serviceAccountPath) {
      throw new Error('Firebase service account key not found for repair run.');
    }
    admin.initializeApp({
      credential: admin.credential.cert(require(serviceAccountPath)),
    });
    db = admin.firestore();
  }

  for (const [dataFile, slug] of filesToProcess) {
    const config = COLLECTION_CONFIGS[slug];
    const dataPath = path.join(DATA_DIR, dataFile);
    if (!fs.existsSync(dataPath) || !config) continue;

    const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const rawItems = Array.isArray(rawData.items) ? rawData.items : [];
    const timestamp = new Date().toISOString();

    console.log(`Repairing ${slug}: ${rawItems.length} local items`);

    let repaired = 0;
    let batch = db ? db.batch() : null;
    let batchCount = 0;

    for (const [index, rawItem] of rawItems.entries()) {
      if (!rawItem?.metadata) {
        rawItem.metadata = {};
      }
      const transformed = transformItem(rawItem, config, slug, index + 1);
      repaired += 1;

      if (db) {
        const itemRef = db.collection('items').doc(transformed.id);
        batch.set(itemRef, transformed, { merge: true });
        batchCount += 1;

        if (batchCount >= 400) {
          await batch.commit();
          batch = db.batch();
          batchCount = 0;
        }
      }
    }

    if (db && batchCount > 0) {
      await batch.commit();
    }

    console.log(
      args.dryRun
        ? `  [DRY RUN] would repair ${repaired} items`
        : `  repaired ${repaired} items in Firestore`,
    );
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
