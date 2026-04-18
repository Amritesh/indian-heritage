const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const DATA_DIR = path.join(PROJECT_ROOT, 'temp', 'data');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'temp', 'output');
const PROGRESS_PATH = path.join(OUTPUT_DIR, 'price-revalidation-progress.json');
const REPORT_PATH = path.join(OUTPUT_DIR, 'price-revalidation-report.json');
const SERVICE_ACCOUNT_PATHS = [
  path.join(PROJECT_ROOT, 'indian-heritage-gallery-firebase-adminsdk-fbsvc-1c3ae1c07a.json'),
  path.join(PROJECT_ROOT, 'temp', 'serviceAccountKey.json'),
];
const DATA_FILE_MAP = {
  british: 'british.json',
  mughals: 'mughals.json',
  'princely-states': 'princely-states.json',
  sultanate: 'sultanate.json',
};

function parseArgs() {
  const args = {
    collections: Object.keys(DATA_FILE_MAP),
    ratesFile: path.join(DATA_DIR, 'price-validation-rates-2026-04-03.json'),
    dryRun: false,
  };

  const argv = process.argv.slice(2);
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--collections' && argv[index + 1]) {
      args.collections = argv[index + 1].split(',').map((value) => value.trim()).filter(Boolean);
      index += 1;
    }
    if (argv[index] === '--rates-file' && argv[index + 1]) {
      args.ratesFile = path.resolve(argv[index + 1]);
      index += 1;
    }
    if (argv[index] === '--dry-run') {
      args.dryRun = true;
    }
  }

  return args;
}

function findServiceAccountPath() {
  return SERVICE_ACCOUNT_PATHS.find((candidate) => fs.existsSync(candidate)) || null;
}

function loadJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function parseNumericValues(text) {
  return Array.from(
    String(text || '').matchAll(/(\d[\d,]*(?:\.\d+)?)\s*(k|thousand|lakh|lac|crore|cr|million|mn)?/gi),
  )
    .map((match) => {
      const numericValue = Number(match[1].replace(/,/g, ''));
      const suffix = String(match[2] || '').toLowerCase();
      if (!Number.isFinite(numericValue) || numericValue <= 0) return null;
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

function derivePriceRange(priceText) {
  const matches = parseNumericValues(priceText);
  if (matches.length === 0) {
    return { estimatedPriceMin: 0, estimatedPriceMax: 0, estimatedPriceAvg: 0 };
  }
  const estimatedPriceMin = Math.min(...matches);
  const estimatedPriceMax = Math.max(...matches);
  return {
    estimatedPriceMin,
    estimatedPriceMax,
    estimatedPriceAvg:
      matches.length === 1 ? matches[0] : Math.round((estimatedPriceMin + estimatedPriceMax) / 2),
  };
}

function deriveWeightGrams(weightText, fallbackWeightGrams = null) {
  const matches = parseNumericValues(weightText);
  if (matches.length > 0) return matches[0];
  return Number.isFinite(fallbackWeightGrams) && fallbackWeightGrams > 0 ? fallbackWeightGrams : null;
}

function roundToHundreds(value) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value / 100) * 100;
}

function formatCurrencyRange(min, max) {
  if (!Number.isFinite(min) || min <= 0) return '';
  const formatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
  if (!Number.isFinite(max) || max <= 0 || Math.abs(max - min) < 1) {
    return `₹${formatter.format(roundToHundreds(min))}`;
  }
  return `₹${formatter.format(roundToHundreds(min))} - ₹${formatter.format(roundToHundreds(max))}`;
}

function extractPurity(text, defaultPurity) {
  const normalized = String(text || '').toLowerCase();
  const decimalMatch = normalized.match(/0\.(\d{3})/);
  if (decimalMatch) return Number(`0.${decimalMatch[1]}`);
  const finenessMatch = normalized.match(/\b(999|995|916|900|818|750|585|500)\b/);
  if (finenessMatch) return Number(finenessMatch[1]) / 1000;
  const percentMatch = normalized.match(/\b(\d{1,3})\s*%\b/);
  if (percentMatch) return Number(percentMatch[1]) / 100;
  if (normalized.includes('quaternary silver')) return 0.5;
  return defaultPurity;
}

function classifyPreciousMetal(item) {
  const materialText = [
    ...(Array.isArray(item.materials) ? item.materials : []),
    item.metadata?.material,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (!materialText || /plated|debased|forgery|none detected|unable to determine|n\/a|none\b/.test(materialText)) {
    return null;
  }
  if (materialText.includes('gold')) {
    return { metal: 'gold', purity: extractPurity(materialText, 0.9) };
  }
  if (materialText.includes('silver') && !materialText.includes('billon')) {
    return { metal: 'silver', purity: extractPurity(materialText, 0.75) };
  }
  return null;
}

function buildValidation(item, rates) {
  const currentPriceText = String(item.metadata?.estimatedPriceInr || '').trim();
  const currentPriceRange = derivePriceRange(currentPriceText || item.estimatedPriceAvg);
  const weightGrams = deriveWeightGrams(item.metadata?.weightEstimate, item.weightGrams);
  const preciousMetal = classifyPreciousMetal(item);
  const flags = [];
  const notes = [];

  if (!preciousMetal || !weightGrams) {
    if (!currentPriceText && currentPriceRange.estimatedPriceAvg === 0) {
      flags.push('missing_price');
    }
    if (!weightGrams) {
      flags.push('missing_weight');
    }
    return {
      status: flags.length > 0 ? 'needs_manual_review' : 'validated_without_metal_floor',
      flags,
      notes,
      validatedPriceText: currentPriceText,
      validatedPriceMin: currentPriceRange.estimatedPriceMin,
      validatedPriceMax: currentPriceRange.estimatedPriceMax,
      validatedPriceAvg: currentPriceRange.estimatedPriceAvg,
      bullionFloorInr: null,
      preciousMetal,
      weightGrams,
      changed: false,
    };
  }

  const ratePerGram = preciousMetal.metal === 'gold' ? rates.gold999PerGramInr : rates.silver999PerGramInr;
  const bullionFloorInr = Math.round(weightGrams * ratePerGram * preciousMetal.purity);
  const conservativeMin =
    preciousMetal.metal === 'gold'
      ? roundToHundreds(bullionFloorInr * 1.1)
      : roundToHundreds(bullionFloorInr * 1.0);
  const conservativeMax =
    preciousMetal.metal === 'gold'
      ? roundToHundreds(bullionFloorInr * 1.35)
      : roundToHundreds(bullionFloorInr * 1.2);

  let validatedPriceMin = currentPriceRange.estimatedPriceMin;
  let validatedPriceMax = currentPriceRange.estimatedPriceMax;
  let validatedPriceAvg = currentPriceRange.estimatedPriceAvg;
  let validatedPriceText = currentPriceText;
  let status = 'validated_against_bullion_floor';
  let changed = false;

  if (!validatedPriceAvg) {
    flags.push('missing_price');
    notes.push('Filled missing price from conservative bullion-floor range.');
    validatedPriceMin = conservativeMin;
    validatedPriceMax = conservativeMax;
    validatedPriceAvg = Math.round((validatedPriceMin + validatedPriceMax) / 2);
    validatedPriceText = formatCurrencyRange(validatedPriceMin, validatedPriceMax);
    status = 'filled_from_bullion_floor';
    changed = true;
  } else if (validatedPriceMax < bullionFloorInr * 0.98) {
    flags.push('below_bullion_floor');
    notes.push('Existing estimate was below conservative bullion floor and has been repriced upward.');
    validatedPriceMin = conservativeMin;
    validatedPriceMax = Math.max(conservativeMax, roundToHundreds(validatedPriceMax * 1.5));
    validatedPriceAvg = Math.round((validatedPriceMin + validatedPriceMax) / 2);
    validatedPriceText = formatCurrencyRange(validatedPriceMin, validatedPriceMax);
    status = 'repriced_below_bullion_floor';
    changed = true;
  } else if (validatedPriceMin < bullionFloorInr * 0.98) {
    flags.push('min_price_below_bullion_floor');
    notes.push('Raised the lower bound to a conservative bullion-aware floor.');
    validatedPriceMin = conservativeMin;
    validatedPriceMax = Math.max(validatedPriceMax, conservativeMax);
    validatedPriceAvg = Math.round((validatedPriceMin + validatedPriceMax) / 2);
    validatedPriceText = formatCurrencyRange(validatedPriceMin, validatedPriceMax);
    status = 'raised_min_to_bullion_floor';
    changed = true;
  }

  return {
    status,
    flags,
    notes,
    validatedPriceText,
    validatedPriceMin,
    validatedPriceMax,
    validatedPriceAvg,
    bullionFloorInr,
    preciousMetal,
    weightGrams,
    changed,
  };
}

function createProgressPayload({ args, rates, summaries, startedAt, status, current }) {
  const totals = Object.values(summaries).reduce(
    (accumulator, summary) => {
      accumulator.totalItems += summary.totalItems;
      accumulator.processedItems += summary.processedItems;
      accumulator.updatedItems += summary.updatedItems;
      accumulator.flaggedItems += summary.flaggedItems;
      return accumulator;
    },
    { totalItems: 0, processedItems: 0, updatedItems: 0, flaggedItems: 0 },
  );

  return {
    status,
    startedAt,
    updatedAt: new Date().toISOString(),
    collections: args.collections,
    rates,
    totals,
    summaries,
    current,
  };
}

function syncLocalData(collectionSlug, updatesById) {
  const fileName = DATA_FILE_MAP[collectionSlug];
  if (!fileName) return;
  const filePath = path.join(DATA_DIR, fileName);
  const payload = loadJson(filePath);
  if (!payload || !Array.isArray(payload.items)) return;

  for (const item of payload.items) {
    const update = updatesById.get(item.id);
    if (!update) continue;
    item.metadata = item.metadata || {};
    item.metadata.estimated_price_inr = update.metadataEstimatedPriceInr;
    item.metadata.price_validation = update.localValidationPayload;
  }

  writeJson(filePath, payload);
}

async function main() {
  const args = parseArgs();
  const rates = loadJson(args.ratesFile);
  if (!rates) {
    throw new Error(`Rates file not found: ${args.ratesFile}`);
  }

  const serviceAccountPath = findServiceAccountPath();
  if (!serviceAccountPath) {
    throw new Error('Firebase service account key not found.');
  }

  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath)),
  });
  const db = admin.firestore();
  const startedAt = new Date().toISOString();
  const summaries = {};
  const report = {
    rates,
    startedAt,
    finishedAt: null,
    collections: {},
    flaggedItems: [],
  };

  for (const collectionSlug of args.collections) {
    console.log(`Revalidating ${collectionSlug}...`);
    const snapshot = await db.collection('items').where('collectionSlug', '==', collectionSlug).get();
    const items = snapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }));
    const updatesById = new Map();
    const summary = {
      totalItems: items.length,
      processedItems: 0,
      updatedItems: 0,
      flaggedItems: 0,
      status: 'running',
    };
    summaries[collectionSlug] = summary;

    let batch = db.batch();
    let batchCount = 0;

    for (const item of items) {
      const validation = buildValidation(item, rates);
      const current = { collectionSlug, itemId: item.id, title: item.title };
      summary.processedItems += 1;
      if (validation.flags.length > 0) {
        summary.flaggedItems += 1;
        report.flaggedItems.push({
          collectionSlug,
          itemId: item.id,
          title: item.title,
          status: validation.status,
          flags: validation.flags,
          currentPrice: item.metadata?.estimatedPriceInr || '',
          validatedPrice: validation.validatedPriceText,
          bullionFloorInr: validation.bullionFloorInr,
        });
      }

      const priceValidation = {
        status: validation.status,
        flags: validation.flags,
        notes: validation.notes,
        bullionFloorInr: validation.bullionFloorInr,
        metalType: validation.preciousMetal?.metal || null,
        metalPurity: validation.preciousMetal?.purity || null,
        weightGrams: validation.weightGrams,
        validatedPriceMin: validation.validatedPriceMin,
        validatedPriceMax: validation.validatedPriceMax,
        validatedPriceAvg: validation.validatedPriceAvg,
        validatedPriceText: validation.validatedPriceText,
        ratesAsOf: rates.asOf,
        ratesSource: rates.sources,
        methodology: 'deterministic-bullion-floor-v1',
        updatedAt: new Date().toISOString(),
      };

      const updatePayload = {
        estimatedPriceMin: validation.validatedPriceMin,
        estimatedPriceMax: validation.validatedPriceMax,
        estimatedPriceAvg: validation.validatedPriceAvg,
        metadata: {
          ...(item.metadata || {}),
          estimatedPriceInr: validation.validatedPriceText || item.metadata?.estimatedPriceInr || '',
        },
        priceValidation,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      updatesById.set(item.id, {
        metadataEstimatedPriceInr: updatePayload.metadata.estimatedPriceInr,
        localValidationPayload: {
          status: validation.status,
          flags: validation.flags,
          bullion_floor_inr: validation.bullionFloorInr,
          validated_price_min: validation.validatedPriceMin,
          validated_price_max: validation.validatedPriceMax,
          validated_price_avg: validation.validatedPriceAvg,
          validated_price_text: validation.validatedPriceText,
          rates_as_of: rates.asOf,
        },
      });

      if (validation.changed) {
        summary.updatedItems += 1;
      }

      if (!args.dryRun) {
        const docRef = db.collection('items').doc(item.id);
        batch.set(docRef, updatePayload, { merge: true });
        batchCount += 1;
      }

      if (batchCount >= 300) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }

      if (summary.processedItems % 25 === 0 || summary.processedItems === summary.totalItems) {
        writeJson(
          PROGRESS_PATH,
          createProgressPayload({
            args,
            rates,
            summaries,
            startedAt,
            status: 'running',
            current,
          }),
        );
        console.log(
          `  ${collectionSlug}: ${summary.processedItems}/${summary.totalItems} processed, ${summary.updatedItems} repriced, ${summary.flaggedItems} flagged`,
        );
      }
    }

    if (!args.dryRun && batchCount > 0) {
      await batch.commit();
    }

    if (!args.dryRun) {
      syncLocalData(collectionSlug, updatesById);
    }

    summary.status = 'completed';
    report.collections[collectionSlug] = summary;
  }

  report.finishedAt = new Date().toISOString();
  writeJson(REPORT_PATH, report);
  writeJson(
    PROGRESS_PATH,
    createProgressPayload({
      args,
      rates,
      summaries,
      startedAt,
      status: 'completed',
      current: null,
    }),
  );

  console.log(`Progress written to ${PROGRESS_PATH}`);
  console.log(`Report written to ${REPORT_PATH}`);
}

main().catch((error) => {
  writeJson(
    PROGRESS_PATH,
    {
      status: 'failed',
      updatedAt: new Date().toISOString(),
      error: error.message || String(error),
    },
  );
  console.error(error.message || error);
  process.exit(1);
});
