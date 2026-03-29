import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import admin from 'firebase-admin';
import { normalizeCollection } from '../src/backend-support/mappers/normalizeCollection';
import { normalizeItem } from '../src/backend-support/mappers/normalizeItem';
import { rawCollectionSchema } from '../src/backend-support/schemas/source';
import { collectionRegistry } from '../src/shared/config/collections';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

function loadLocalEnvFile() {
  const envPath = path.resolve(projectRoot, 'frontend', '.env');
  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

function resolveServiceAccountPath() {
  const explicitPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH;
  if (explicitPath) {
    return path.resolve(projectRoot, explicitPath);
  }

  return path.resolve(projectRoot, 'indian-heritage-gallery-firebase-adminsdk-fbsvc-1c3ae1c07a.json');
}

function initializeAdmin() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const serviceAccountPath = resolveServiceAccountPath();
  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error(`Firebase service account not found at ${serviceAccountPath}`);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

async function fetchCollectionPayload(sourceUrl: string) {
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${sourceUrl}: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  return rawCollectionSchema.parse(payload);
}

async function importCollection(slug: string) {
  const registryEntry = collectionRegistry.find((entry) => entry.slug === slug);
  if (!registryEntry) {
    throw new Error(`Collection "${slug}" is not registered.`);
  }

  initializeAdmin();
  const firestore = admin.firestore();
  const timestamp = new Date().toISOString();

  const payload = await fetchCollectionPayload(registryEntry.sourceUrl);
  const rawItems = payload.itemCollection.items;
  const normalizedItems = rawItems.map((rawItem) => normalizeItem(rawItem, slug, timestamp));
  const normalizedCollection = normalizeCollection({
    slug,
    itemCount: normalizedItems.length,
    heroImage: normalizedItems[0]?.imageUrl ?? '',
    filterableMaterials: Array.from(
      new Set(normalizedItems.flatMap((item) => item.materials).filter(Boolean)),
    ).sort(),
    timestamp,
  });

  const batch = firestore.batch();

  batch.set(firestore.collection('collections').doc(normalizedCollection.id), normalizedCollection, {
    merge: true,
  });

  normalizedItems.forEach((item) => {
    batch.set(firestore.collection('items').doc(item.id), item, { merge: true });
  });

  await batch.commit();

  const snapshotDir = path.resolve(projectRoot, 'backend-support', 'snapshots');
  fs.mkdirSync(snapshotDir, { recursive: true });
  fs.writeFileSync(
    path.join(snapshotDir, `${slug}.json`),
    `${JSON.stringify(payload.itemCollection, null, 2)}\n`,
    'utf8',
  );

  return {
    slug,
    importedCollection: normalizedCollection.id,
    importedItems: normalizedItems.length,
    snapshotFile: path.join(snapshotDir, `${slug}.json`),
  };
}

async function main() {
  loadLocalEnvFile();
  const target = process.argv[2];
  const slugs = target ? [target] : collectionRegistry.filter((entry) => entry.enabled).map((entry) => entry.slug);

  const summaries = [];
  for (const slug of slugs) {
    summaries.push(await importCollection(slug));
  }

  console.log(JSON.stringify({ importedAt: new Date().toISOString(), summaries }, null, 2));
}

main().catch((error) => {
  if (error instanceof Error) {
    console.error(
      JSON.stringify(
        {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        null,
        2,
      ),
    );
  } else {
    console.error(String(error));
  }
  process.exitCode = 1;
});
