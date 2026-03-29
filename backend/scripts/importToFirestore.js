/**
 * importToFirestore.js
 * Migrates collection data from local JSON files → Cloud Firestore
 *
 * Usage:
 *   node backend/scripts/importToFirestore.js
 *   node backend/scripts/importToFirestore.js --collection mughals
 *   node backend/scripts/importToFirestore.js --dry-run
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// ── Config ────────────────────────────────────────────────────────────────────
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const SERVICE_ACCOUNT_PATHS = [
  path.join(PROJECT_ROOT, 'indian-heritage-gallery-firebase-adminsdk-fbsvc-1c3ae1c07a.json'),
  path.join(PROJECT_ROOT, 'temp', 'serviceAccountKey.json'),
];
const DATA_DIR = path.join(PROJECT_ROOT, 'temp', 'data');

// Collections to import and their Firestore metadata
const COLLECTION_CONFIGS = {
  mughals: {
    slug: 'mughals',
    name: 'Mughals',
    displayName: 'Mughal Empire',
    description:
      'A close reading of Mughal silver issues centered on Jahangir-era rupees, preserving metadata for period, mint, denomination, market range, and historical notes.',
    longDescription:
      'The Mughal Empire (1526–1857 CE) produced one of the most sophisticated coinage systems in Indian history. This collection showcases silver rupees and related issues primarily from the reign of Jahangir (1605–1627 CE), featuring exquisite calligraphic inscriptions in Persian, regnal year dating in both the Islamic Hijri and Elahi solar calendars, and detailed mint marks identifying production centres across the subcontinent.',
    heroEyebrow: 'Indian Numismatic Heritage',
    culture: 'Mughal Empire',
    periodLabel: 'c. 1526–1857 CE',
    heroImagePath: 'images/mughals/page-1.png',
    sortOrder: 1,
  },
  british: {
    slug: 'british',
    name: 'British India',
    displayName: 'British India',
    description:
      'A comprehensive archive of British India coinage spanning East India Company issues to the final years of the British Raj.',
    longDescription:
      'British India coinage represents a critical chapter in Indian numismatic history, spanning over three centuries from the establishment of the East India Company (1757) to independence in 1947. This collection documents the evolution of colonial monetary policy through bronze, copper, silver, and nickel issues from mints in Calcutta, Bombay, and Madras — each coin a material witness to empire and resistance.',
    heroEyebrow: 'Colonial Numismatic Archive',
    culture: 'British India',
    periodLabel: 'c. 1757–1947 CE',
    heroImagePath: 'images/british/page-10-11/coin_1.png',
    sortOrder: 2,
  },
};

// Map of data file → collection slug
const DATA_FILE_MAP = {
  'mughals.json': 'mughals',
  'british.json': 'british',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function gsUrlToHttps(gsUrl) {
  if (!gsUrl || !gsUrl.startsWith('gs://')) return gsUrl || '';
  const withoutProto = gsUrl.replace('gs://', '');
  const slashIdx = withoutProto.indexOf('/');
  if (slashIdx === -1) return gsUrl;
  const bucket = withoutProto.substring(0, slashIdx);
  const filePath = withoutProto.substring(slashIdx + 1);
  return `https://storage.googleapis.com/${bucket}/${filePath}`;
}

function parseArgs() {
  const args = { collection: null, dryRun: false };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--collection' && argv[i + 1]) args.collection = argv[++i];
    if (argv[i] === '--dry-run') args.dryRun = true;
  }
  return args;
}

function slugify(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function parsePriceRange(priceStr) {
  if (!priceStr) return 0;
  const nums = String(priceStr).replace(/,/g, '').match(/\d+/g);
  if (!nums || nums.length === 0) return 0;
  const vals = nums.map(Number);
  return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
}

function buildSearchText(item, meta, collectionName) {
  return [
    item.title,
    meta.rulerOrIssuer,
    meta.denomination,
    meta.mintOrPlace,
    meta.seriesOrCatalog,
    item.period,
    item.region,
    collectionName,
    (item.materials || []).join(' '),
    (item.notes || []).join(' '),
    item.description,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function buildTags(item, meta, culture) {
  const tags = new Set();
  if (culture) tags.add(slugify(culture));
  (item.materials || []).forEach((m) => tags.add(slugify(m)));
  if (meta.denomination) tags.add(slugify(meta.denomination));
  if (meta.rulerOrIssuer) {
    meta.rulerOrIssuer
      .split(/[\s,]+/)
      .slice(0, 2)
      .forEach((w) => w.length > 2 && tags.add(slugify(w)));
  }
  if (item.region) tags.add(slugify(item.region));
  return [...tags].filter(Boolean).slice(0, 8);
}

function transformItem(rawItem, collectionConfig, collectionDocId, pageNumber) {
  const rawMeta = rawItem.metadata || {};
  const meta = {
    type: rawMeta.type || 'coin',
    denomination: rawMeta.denomination || '',
    rulerOrIssuer: rawMeta.ruler_or_issuer || '',
    mintOrPlace: rawMeta.mint_or_place || rawItem.region || '',
    seriesOrCatalog: rawMeta.series_or_catalog || '',
    weightEstimate: rawMeta.weight_estimate || '',
    condition: rawMeta.condition || '',
    estimatedPriceInr: rawMeta.estimated_price_inr || '',
    confidence: rawMeta.confidence || '',
  };

  const imageUrl = gsUrlToHttps(rawItem.image || '');
  const collectionName = collectionConfig.displayName;

  return {
    id: rawItem.id || `${collectionConfig.slug}-item-${pageNumber}`,
    collectionId: collectionDocId,
    collectionSlug: collectionConfig.slug,
    collectionName,
    title: rawItem.title || 'Untitled',
    subtitle: meta.rulerOrIssuer
      ? `${meta.denomination ? meta.denomination + ', ' : ''}${meta.rulerOrIssuer}`
      : meta.denomination || '',
    period: rawItem.period || meta.year_or_period || '',
    dateText: rawItem.period || '',
    culture: collectionConfig.culture,
    location: meta.mintOrPlace || rawItem.region || '',
    description: rawItem.description || '',
    shortDescription: rawItem.description
      ? rawItem.description.substring(0, 160).trim()
      : '',
    imageUrl,
    imageAlt: rawItem.title || 'Heritage artifact',
    primaryMedia: null,
    gallery: [],
    materials: Array.isArray(rawItem.materials) && rawItem.materials.length > 0
      ? rawItem.materials
      : ['Unknown'],
    tags: buildTags(rawItem, meta, collectionConfig.culture),
    notes: Array.isArray(rawItem.notes) ? rawItem.notes : [],
    pageNumber,
    searchText: buildSearchText(rawItem, meta, collectionName),
    searchKeywords: buildTags(rawItem, meta, collectionConfig.culture),
    metadata: meta,
    estimatedPriceAvg: parsePriceRange(meta.estimatedPriceInr),
    published: true,
    importedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs();
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Firestore Import — Indian Heritage Gallery');
  console.log('═══════════════════════════════════════════════════════');
  if (args.dryRun) console.log('  [DRY RUN — no data will be written]');
  if (args.collection) console.log(`  Collection filter: ${args.collection}`);
  console.log();

  // Find service account key
  let serviceAccountPath = null;
  for (const p of SERVICE_ACCOUNT_PATHS) {
    if (fs.existsSync(p)) { serviceAccountPath = p; break; }
  }
  if (!serviceAccountPath) {
    console.error('❌ Firebase service account key not found. Tried:');
    SERVICE_ACCOUNT_PATHS.forEach((p) => console.error('   ', p));
    process.exit(1);
  }
  console.log('✓ Service account:', path.basename(serviceAccountPath));

  if (!args.dryRun) {
    admin.initializeApp({
      credential: admin.credential.cert(require(serviceAccountPath)),
    });
  }

  const db = args.dryRun ? null : admin.firestore();

  // Process each data file
  const filesToProcess = Object.entries(DATA_FILE_MAP).filter(([, slug]) =>
    !args.collection || slug === args.collection
  );

  let totalItems = 0;
  let totalCollections = 0;

  for (const [dataFile, slug] of filesToProcess) {
    const dataPath = path.join(DATA_DIR, dataFile);
    if (!fs.existsSync(dataPath)) {
      console.warn(`⚠️  Data file not found: ${dataFile}`);
      continue;
    }

    const config = COLLECTION_CONFIGS[slug];
    if (!config) {
      console.warn(`⚠️  No config for slug: ${slug}`);
      continue;
    }

    console.log(`\n── ${config.displayName} (${dataFile})`);

    const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const rawItems = Array.isArray(rawData.items) ? rawData.items : [];
    console.log(`   ${rawItems.length} items found in file`);

    // Calculate collection-level stats
    const materials = new Set();
    let totalWorth = 0;
    rawItems.forEach((item) => {
      (item.materials || []).forEach((m) => m && m !== 'Unknown' && materials.add(m));
      totalWorth += parsePriceRange(item.metadata?.estimated_price_inr);
    });

    const heroImageUrl = gsUrlToHttps(`gs://indian-heritage-gallery-bucket/${config.heroImagePath}`);
    // Use first item's image as hero fallback
    const firstImageUrl = rawItems[0]?.image ? gsUrlToHttps(rawItems[0].image) : '';

    const collectionData = {
      slug: config.slug,
      name: config.name,
      displayName: config.displayName,
      description: config.description,
      longDescription: config.longDescription,
      heroEyebrow: config.heroEyebrow,
      culture: config.culture,
      periodLabel: config.periodLabel,
      sourceUrl: '',
      heroImage: heroImageUrl || firstImageUrl,
      thumbnailImage: heroImageUrl || firstImageUrl,
      itemCount: rawItems.length,
      filterableMaterials: [...materials].sort(),
      estimatedWorth: totalWorth,
      sortOrder: config.sortOrder,
      status: 'active',
      enabled: true,
      lastSyncedAt: new Date().toISOString(),
    };

    console.log(`   Materials: ${[...materials].join(', ')}`);
    console.log(`   Est. total worth: ₹${totalWorth.toLocaleString('en-IN')}`);

    if (args.dryRun) {
      console.log('   [DRY RUN] Would write collection document + items');
      totalCollections++;
      totalItems += rawItems.length;
      continue;
    }

    // Write collection document (use slug as document ID)
    const collectionRef = db.collection('collections').doc(slug);
    await collectionRef.set({ id: slug, ...collectionData }, { merge: true });
    console.log(`   ✓ Collection document written`);
    totalCollections++;

    // Batch-write items (Firestore batch limit = 500)
    const BATCH_SIZE = 400;
    let batch = db.batch();
    let batchCount = 0;
    let itemsWritten = 0;

    for (let i = 0; i < rawItems.length; i++) {
      const item = transformItem(rawItems[i], config, slug, i + 1);
      const itemRef = db.collection('items').doc(item.id);
      batch.set(itemRef, item, { merge: true });
      batchCount++;

      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        process.stdout.write(`   Writing items: ${itemsWritten + batchCount}/${rawItems.length}\r`);
        itemsWritten += batchCount;
        batch = db.batch();
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
      itemsWritten += batchCount;
    }

    totalItems += itemsWritten;
    console.log(`   ✓ ${itemsWritten} items written to Firestore      `);
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`  Done! ${totalCollections} collections, ${totalItems} items imported`);
  console.log('═══════════════════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('\n❌ Import failed:', err.message || err);
  process.exit(1);
});
