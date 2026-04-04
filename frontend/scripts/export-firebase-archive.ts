import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import admin from 'firebase-admin';
import { collectionRegistry } from '../src/shared/config/collections';
import { loadWorkspaceEnv } from './lib/loadEnv';

const TARGET_SLUGS = ['mughals', 'british', 'princely-states', 'sultanate'] as const;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');
const snapshotDir = path.resolve(projectRoot, 'backend-support', 'snapshots', 'firebase-archive');

type SerializableValue =
  | null
  | boolean
  | number
  | string
  | SerializableValue[]
  | { [key: string]: SerializableValue };

type FirebaseArchiveSnapshot = {
  exportedAt: string;
  source: 'firebase-firestore';
  collection: Record<string, SerializableValue>;
  items: Array<Record<string, SerializableValue>>;
  counts: {
    items: number;
    publishedItems: number;
  };
};

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

function serializeValue(value: unknown): SerializableValue {
  if (value == null) {
    return null;
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => serializeValue(entry));
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'object') {
    const maybeTimestamp = value as {
      toDate?: () => Date;
      seconds?: number;
      nanoseconds?: number;
    };

    if (typeof maybeTimestamp.toDate === 'function') {
      return maybeTimestamp.toDate().toISOString();
    }

    if (typeof maybeTimestamp.seconds === 'number') {
      const seconds = Number(maybeTimestamp.seconds ?? 0);
      const nanos = Number(maybeTimestamp.nanoseconds ?? 0);
      return new Date(seconds * 1000 + Math.floor(nanos / 1e6)).toISOString();
    }

    const entries = Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      serializeValue(entry),
    ]);
    return Object.fromEntries(entries) as Record<string, SerializableValue>;
  }

  return String(value);
}

function writeSnapshotFile(slug: string, snapshot: FirebaseArchiveSnapshot) {
  fs.mkdirSync(snapshotDir, { recursive: true });
  const filePath = path.join(snapshotDir, `${slug}.json`);
  fs.writeFileSync(filePath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  return filePath;
}

async function fetchCollectionSnapshot(firestore: ReturnType<typeof admin.firestore>, slug: string) {
  const registryEntry = collectionRegistry.find((entry) => entry.slug === slug);
  if (!registryEntry) {
    throw new Error(`Collection "${slug}" is not registered.`);
  }

  const bySlug = await firestore.collection('collections').where('slug', '==', slug).limit(1).get();
  const byId = bySlug.empty ? await firestore.collection('collections').doc(slug).get() : null;
  const snapshot = bySlug.empty && !byId?.exists ? null : (bySlug.empty ? byId : bySlug.docs[0]);

  if (!snapshot || !snapshot.exists) {
    throw new Error(`Collection "${slug}" was not found in Firebase Firestore.`);
  }

  const data = snapshot.data() as Record<string, unknown>;

  const itemsSnapshot = await firestore.collection('items').where('collectionSlug', '==', slug).get();
  const items = itemsSnapshot.docs
    .map((docSnapshot) => serializeValue(docSnapshot.data()) as Record<string, SerializableValue>)
    .sort((left, right) =>
      Number((left.pageNumber as number | undefined) ?? 0) - Number((right.pageNumber as number | undefined) ?? 0)
      || String(left.title ?? '').localeCompare(String(right.title ?? ''))
      || String(left.id ?? '').localeCompare(String(right.id ?? '')),
    );

  const collection = serializeValue({
    ...data,
    slug,
    id: String(data.id ?? registryEntry.id ?? slug),
    name: String(data.name ?? registryEntry.name),
    displayName: String(data.displayName ?? data.name ?? registryEntry.name),
  }) as Record<string, SerializableValue>;

  const publishedItems = items.filter((item) => Boolean(item.published)).length;

  return {
    exportedAt: new Date().toISOString(),
    source: 'firebase-firestore' as const,
    collection,
    items,
    counts: {
      items: items.length,
      publishedItems,
    },
  } satisfies FirebaseArchiveSnapshot;
}

async function main() {
  loadWorkspaceEnv(projectRoot);
  initializeAdmin();
  const firestore = admin.firestore();

  const target = process.argv[2];
  const slugs = target ? [target] : [...TARGET_SLUGS];

  const summaries: Array<{
    slug: string;
    snapshotFile: string;
    items: number;
    publishedItems: number;
  }> = [];

  for (const slug of slugs) {
    const snapshot = await fetchCollectionSnapshot(firestore, slug);
    const snapshotFile = writeSnapshotFile(slug, snapshot);
    summaries.push({
      slug,
      snapshotFile,
      items: snapshot.counts.items,
      publishedItems: snapshot.counts.publishedItems,
    });
  }

  console.log(
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        snapshotDir,
        summaries,
      },
      null,
      2,
    ),
  );
}

if (import.meta.url === `file://${__filename}`) {
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
}
