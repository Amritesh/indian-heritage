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
const {
  buildCanonicalKeywords,
  buildCanonicalTags,
  canonicalizeMint,
  canonicalizeRulerOrIssuer,
  resolveDenomination,
} = require('./catalogNormalization');

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
  sultanate: {
    slug: 'sultanate',
    name: 'Sultanate',
    displayName: 'Delhi Sultanate',
    description:
      'A structured archive of Sultanate coinage across Delhi, Bengal, Bahmani, and related polities, normalized for collector-friendly browsing and sorting.',
    longDescription:
      'The Sultanate collection documents front-view coin issues from the Delhi Sultanate and related successor states, preserving ruler, mint, denomination, material, and estimated value with stable public tags and sorting metadata for collectors.',
    heroEyebrow: 'Sultanate Numismatics',
    culture: 'Delhi Sultanate',
    periodLabel: 'c. 1193–1545 CE',
    heroImagePath: 'images/sultanate/page-7/coin_1.png',
    sortOrder: 4,
  },
  'early-coinage': {
    slug: 'early-coinage',
    name: 'Early Coinage',
    displayName: 'Early Coinage',
    description:
      'A catalog of early Indian coinage, including Gupta-era and related issues, with item-level provenance and price metadata preserved for archival browsing.',
    longDescription:
      'The Early Coinage collection brings together the earliest pages of the archive into a searchable, price-aware public record. It preserves ruler, mint, denomination, material, and estimated value data so the collection can be explored alongside the rest of the numismatic archive.',
    heroEyebrow: 'Ancient Indian Coinage',
    culture: 'Early Indian Coinage',
    periodLabel: 'c. 4th to 6th century CE',
    sourceUrl: 'https://us-central1-indian-heritage-gallery.cloudfunctions.net/app/api/items/early-coinage',
    sortOrder: 6,
  },
};

// Map of data file → collection slug
const DATA_FILE_MAP = {
  'mughals.json': 'mughals',
  'british.json': 'british',
  'princely-states.json': 'princely-states',
  'sultanate.json': 'sultanate',
  'early-coinage.json': 'early-coinage',
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
  const args = { collection: null, dryRun: false, batchSize: 50 };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--collection' && argv[i + 1]) args.collection = argv[++i];
    if (argv[i] === '--dry-run') args.dryRun = true;
    if (argv[i] === '--batch-size' && argv[i + 1]) {
      const value = Number(argv[++i]);
      if (Number.isFinite(value) && value > 0) {
        args.batchSize = Math.floor(value);
      }
    }
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
  return Array.from(
    String(text || '').matchAll(/(\d[\d,]*(?:\.\d+)?)\s*(k|thousand|lakh|lac|crore|cr|million|mn)?/gi),
  )
    .map((match) => {
      const numericValue = Number(match[1].replace(/,/g, ''));
      const suffix = String(match[2] || '').toLowerCase();
      if (!Number.isFinite(numericValue) || numericValue <= 0) {
        return null;
      }

      const multiplier =
        suffix === 'k' || suffix === 'thousand'
          ? 1000
          : suffix === 'lakh' || suffix === 'lac'
            ? 100000
            : suffix === 'crore' || suffix === 'cr'
              ? 10000000
              : suffix === 'million' || suffix === 'mn'
                ? 1000000
                : 1;

      return numericValue * multiplier;
    })
    .filter((value) => Number.isFinite(value) && value > 0);
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
  return buildCanonicalTags({
    culture,
    rulerOrIssuer: meta.rulerOrIssuer,
    denomination: meta.denomination,
    mintOrPlace: meta.mintOrPlace || item.region,
    materials: item.materials || [],
  });
}

function transformItem(rawItem, collectionConfig, collectionDocId, pageNumber) {
  const rawMeta = rawItem.metadata || {};
  const canonicalRuler = canonicalizeRulerOrIssuer(rawMeta.ruler_or_issuer || '');
  const canonicalMint = canonicalizeMint(rawMeta.mint_or_place || rawItem.region || '');
  const meta = {
    type: rawMeta.type || 'coin',
    denomination: rawMeta.denomination || '',
    rulerOrIssuer: canonicalRuler || rawMeta.ruler_or_issuer || '',
    mintOrPlace: canonicalMint || rawMeta.mint_or_place || rawItem.region || '',
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
  const canonicalTags = buildTags(rawItem, meta, collectionConfig.culture);

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
    location: canonicalMint || meta.mintOrPlace || rawItem.region || '',
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
    tags: canonicalTags,
    notes: Array.isArray(rawItem.notes) ? rawItem.notes : [],
    pageNumber,
    searchText: buildSearchText(rawItem, meta, collectionName),
    searchKeywords: buildCanonicalKeywords([
      buildSearchText(rawItem, meta, collectionName),
      ...canonicalTags,
    ]),
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
  console.log(`  Batch size: ${args.batchSize}`);
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

    const heroImageUrl = config.heroImagePath
      ? gsUrlToHttps(`gs://indian-heritage-gallery-bucket/${config.heroImagePath}`)
      : '';
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
      sourceUrl: config.sourceUrl || '',
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
    const BATCH_SIZE = args.batchSize;
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

if (require.main === module) {
  main().catch((err) => {
    console.error('\n❌ Import failed:', err.message || err);
    process.exit(1);
  });
}

module.exports = {
  COLLECTION_CONFIGS,
  DATA_DIR,
  DATA_FILE_MAP,
  buildCollectionData: null,
  derivePriceRange,
  deriveWeightGrams,
  deriveYearRange,
  transformItem,
};
