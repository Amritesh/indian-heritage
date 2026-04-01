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
    heroImagePath: 'images/mughals-1-1/page-1.png',
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
    heroImagePath: 'images/british-india-1-1/page-1.png',
    sortOrder: 2,
  },
  'princely-states': {
    slug: 'princely-states',
    name: 'Princely States',
    displayName: 'Princely States',
    description:
      'A broad archive of princely state coinage across the subcontinent, preserving ruler, mint, denomination, material, and estimated collector value.',
    longDescription:
      'The Princely States issued a remarkable diversity of coinage under local rulers across the Indian subcontinent. This collection brings together silver, copper, bronze, and gold issues from Hyderabad, Mysore, Travancore, Gwalior, and many other states, combining visual identification with structured metadata and estimated market value for each piece.',
    heroEyebrow: 'Indian Numismatic Heritage',
    culture: 'Princely States of India',
    periodLabel: 'c. 16th–20th century',
    heroImagePath: 'images/princely-states/page-5/coin_1.png',
    sortOrder: 3,
  },
};

// Map of data file → collection slug
const DATA_FILE_MAP = {
  'mughals.json': 'mughals',
  'british.json': 'british',
  'princely-states.json': 'princely-states',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function gsUrlToHttps(gsUrl) {
  if (!gsUrl || !gsUrl.startsWith('gs://')) return gsUrl || '';
  const withoutProto = gsUrl.replace('gs://', '');
  const slashIdx = withoutProto.indexOf('/');
  if (slashIdx === -1) return gsUrl;
  const bucket = withoutProto.substring(0, slashIdx);
  const filePath = withoutProto.substring(slashIdx + 1);
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(filePath)}?alt=media`;
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

function parseNumericValues(text) {
  return String(text || '')
    .match(/\d[\d,]*(?:\.\d+)?/g)
    ?.map((value) => Number(value.replace(/,/g, '')))
    .filter((value) => Number.isFinite(value) && value > 0) ?? [];
}

function expandYearRange(startText, endText) {
  const start = Number(startText);
  const end = Number(endText);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  if (String(endText).length < String(startText).length) {
    const prefix = String(startText).slice(0, String(startText).length - String(endText).length);
    return [start, Number(`${prefix}${endText}`)];
  }
  return [start, end];
}

function filterHistoricalYears(values) {
  return Array.from(new Set(values.filter((year) => year >= 500 && year <= 2100)));
}

function extractAdYearRange(text) {
  const normalized = String(text || '');
  const parenthesizedSegments = normalized.match(/\([^)]*\)/g) || [];
  for (const segment of parenthesizedSegments) {
    if (!/\b(AD|CE)\b/i.test(segment)) continue;
    const rangeMatch = segment.match(/\b(1[5-9]\d{2}|20\d{2})\b\s*(?:-|–|—|to)\s*\b(\d{2,4})\b/i);
    if (rangeMatch) return expandYearRange(rangeMatch[1], rangeMatch[2]);
    const yearMatch = segment.match(/\b(1[5-9]\d{2}|20\d{2})\b/i);
    if (yearMatch) return [Number(yearMatch[1]), Number(yearMatch[1])];
  }
  const adRangeMatch = normalized.match(
    /(?:\b(AD|CE)\b\s*)?\b(1[5-9]\d{2}|20\d{2})\b\s*(?:-|–|—|to)\s*\b(\d{2,4})\b(?:\s*\b(AD|CE)\b)?/i,
  );
  if (adRangeMatch && (adRangeMatch[1] || adRangeMatch[4] || /\b(AD|CE)\b/i.test(normalized))) {
    return expandYearRange(adRangeMatch[2], adRangeMatch[3]);
  }
  return null;
}

function deriveYearRange(period) {
  const adRange = extractAdYearRange(period);
  if (adRange) {
    const years = filterHistoricalYears(adRange);
    if (years.length === 1) return { sortYearStart: years[0], sortYearEnd: null };
    if (years.length >= 2) return { sortYearStart: Math.min(...years), sortYearEnd: Math.max(...years) };
    return { sortYearStart: 0, sortYearEnd: null };
  }

  if (/\b(AD|CE)\b/i.test(String(period || ''))) {
    return { sortYearStart: 0, sortYearEnd: null };
  }

  const explicitRangeMatch = String(period || '').match(
    /\b(1[5-9]\d{2}|20\d{2}|\d{3,4})\b\s*(?:-|–|—|to)\s*\b(1[5-9]\d{2}|20\d{2}|\d{3,4})\b/i,
  );
  if (explicitRangeMatch) {
    const years = filterHistoricalYears([Number(explicitRangeMatch[1]), Number(explicitRangeMatch[2])]);
    if (years.length === 1) return { sortYearStart: years[0], sortYearEnd: null };
    if (years.length >= 2) return { sortYearStart: Math.min(...years), sortYearEnd: Math.max(...years) };
  }

  const allYears = filterHistoricalYears(
    (String(period || '').match(/\b(\d{3,4})\b/g) || []).map((value) => Number(value)),
  );
  if (allYears.length > 0) {
    const start = Math.min(...allYears);
    const end = Math.max(...allYears);
    return { sortYearStart: start, sortYearEnd: start === end ? null : end };
  }

  return { sortYearStart: 0, sortYearEnd: null };
}

function derivePriceRange(priceText) {
  const matches = parseNumericValues(priceText);
  if (matches.length === 0) return { estimatedPriceMin: 0, estimatedPriceMax: 0, estimatedPriceAvg: 0 };
  const estimatedPriceMin = Math.min(...matches);
  const estimatedPriceMax = Math.max(...matches);
  return {
    estimatedPriceMin,
    estimatedPriceMax,
    estimatedPriceAvg: matches.length === 1 ? matches[0] : Math.round((estimatedPriceMin + estimatedPriceMax) / 2),
  };
}

function deriveWeightGrams(weightText) {
  const [weightGrams] = parseNumericValues(weightText);
  return weightGrams ?? null;
}

function resolveDenomination(value) {
  const normalized = String(value || '').toLowerCase();
  if (!normalized) return null;
  if (normalized.includes('1/2 rupee') || normalized.includes('half rupee')) {
    return { key: 'half-rupee', rank: 9, baseValue: 0.5 };
  }
  if (normalized.includes('rupee')) return { key: 'rupee', rank: 10, baseValue: 1 };
  if (normalized.includes('8 anna')) return { key: 'eight-anna', rank: 8, baseValue: 8 / 16 };
  if (normalized.includes('4 anna')) return { key: 'four-anna', rank: 7, baseValue: 4 / 16 };
  if (normalized.includes('2 anna')) return { key: 'two-anna', rank: 6, baseValue: 2 / 16 };
  if (normalized.includes('1/2 anna') || normalized.includes('half anna')) {
    return { key: 'half-anna', rank: 4, baseValue: 1 / 32 };
  }
  if (normalized.includes('anna')) return { key: 'anna', rank: 5, baseValue: 1 / 16 };
  if (normalized.includes('paisa')) return { key: 'paisa', rank: 3, baseValue: 1 / 64 };
  if (normalized.includes('pice') || normalized.includes('pie')) return { key: 'pice', rank: 2, baseValue: 1 / 192 };
  if (normalized.includes('dam') || normalized.includes('daam')) return { key: 'dam', rank: 1, baseValue: 1 / 512 };
  if (normalized.includes('mohur')) return { key: 'mohur', rank: 11, baseValue: 1 };
  return null;
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
  const denomination = resolveDenomination(meta.denomination);
  const yearRange = deriveYearRange(rawItem.period || meta.year_or_period || '');
  const priceRange = derivePriceRange(meta.estimatedPriceInr);

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
    denominationSystem: 'shared-indic',
    denominationKey: denomination?.key ?? null,
    denominationRank: denomination?.rank ?? 9999,
    denominationBaseValue: denomination?.baseValue ?? null,
    sortYearStart: yearRange.sortYearStart,
    sortYearEnd: yearRange.sortYearEnd,
    estimatedPriceMin: priceRange.estimatedPriceMin,
    estimatedPriceMax: priceRange.estimatedPriceMax,
    estimatedPriceAvg: priceRange.estimatedPriceAvg,
    weightGrams: deriveWeightGrams(meta.weightEstimate),
    sortYear: yearRange.sortYearStart,
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
      totalWorth += derivePriceRange(item.metadata?.estimated_price_inr).estimatedPriceAvg;
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
