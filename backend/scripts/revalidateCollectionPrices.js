const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { DATA_FILE_MAP, DATA_DIR } = require('./importToFirestore');
const {
  buildValidatedPriceRecord,
  computeBullionRatesPerGram,
} = require('./priceValidation');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const PROGRESS_PATH = path.join(PROJECT_ROOT, 'temp', 'output', 'price-revalidation-progress.json');
const REPORT_PATH = path.join(PROJECT_ROOT, 'temp', 'output', 'price-revalidation-report.json');

function nowIso() {
  return new Date().toISOString();
}

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.json();
}

async function fetchBullionRates() {
  const [gold, silver] = await Promise.all([
    fetchJson('https://api.gold-api.com/price/XAU/INR'),
    fetchJson('https://api.gold-api.com/price/XAG/INR'),
  ]);

  return {
    snapshotAt: nowIso(),
    source: 'https://api.gold-api.com',
    ounceQuotes: {
      goldInrPerOunce: gold.price,
      silverInrPerOunce: silver.price,
    },
    perGram: computeBullionRatesPerGram({
      goldInrPerOunce: gold.price,
      silverInrPerOunce: silver.price,
    }),
  };
}

function updateProgress(progress) {
  progress.updatedAt = nowIso();
  writeJson(PROGRESS_PATH, progress);
}

async function main() {
  const bullion = await fetchBullionRates();
  const progress = {
    startedAt: nowIso(),
    updatedAt: nowIso(),
    status: 'running',
    bullion,
    collections: [],
    totals: {
      collections: 0,
      items: 0,
      adjusted: 0,
      preciousChecked: 0,
    },
  };

  const report = {
    generatedAt: nowIso(),
    bullion,
    adjustedItems: [],
  };

  updateProgress(progress);

  for (const [fileName, slug] of Object.entries(DATA_FILE_MAP)) {
    const dataPath = path.join(DATA_DIR, fileName);
    const payload = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const items = Array.isArray(payload.items) ? payload.items : [];
    const collectionSummary = {
      slug,
      fileName,
      totalItems: items.length,
      processedItems: 0,
      adjustedItems: 0,
      preciousChecked: 0,
      status: 'running',
    };
    progress.collections.push(collectionSummary);
    progress.totals.collections += 1;

    for (const item of items) {
      const metadata = item.metadata || {};
      const result = buildValidatedPriceRecord({
        item,
        bullionRates: bullion.perGram,
      });

      if (result.metal) {
        collectionSummary.preciousChecked += 1;
        progress.totals.preciousChecked += 1;
      }

      if (result.adjusted) {
        collectionSummary.adjustedItems += 1;
        progress.totals.adjusted += 1;
        if (!metadata.original_estimated_price_inr) {
          metadata.original_estimated_price_inr = metadata.estimated_price_inr || '';
        }
        metadata.estimated_price_inr = result.estimatedPriceInr;
        report.adjustedItems.push({
          collection: slug,
          id: item.id,
          title: item.title,
          originalEstimatedPriceInr: metadata.original_estimated_price_inr,
          validatedEstimatedPriceInr: result.estimatedPriceInr,
          metalFloorInr: result.metalFloorInr,
          sourcePage: metadata.source_page_path || '',
        });
      }

      metadata.price_validation_status = result.status;
      metadata.price_validation_metal_floor_inr = result.metalFloorInr;
      metadata.price_validation_updated_at = nowIso();
      metadata.price_validation_source = bullion.source;
      item.metadata = metadata;
      collectionSummary.processedItems += 1;
      progress.totals.items += 1;

      if (collectionSummary.processedItems % 25 === 0) {
        updateProgress(progress);
      }
    }

    collectionSummary.status = 'completed';
    fs.writeFileSync(dataPath, JSON.stringify(payload, null, 2));
    updateProgress(progress);
  }

  progress.status = 'completed';
  writeJson(REPORT_PATH, report);
  updateProgress(progress);

  console.log(`Validated ${progress.totals.items} items across ${progress.totals.collections} collections`);
  console.log(`Adjusted ${progress.totals.adjusted} items below metal floor`);
  console.log(`Progress: ${PROGRESS_PATH}`);
  console.log(`Report: ${REPORT_PATH}`);
}

main().catch((error) => {
  const failed = {
    status: 'failed',
    updatedAt: nowIso(),
    error: error.message || String(error),
  };
  writeJson(PROGRESS_PATH, failed);
  console.error(error);
  process.exit(1);
});
