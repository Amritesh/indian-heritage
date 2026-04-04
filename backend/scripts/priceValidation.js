const OUNCE_TO_GRAMS = 31.1034768;

function parseNumericValues(text) {
  return String(text || '')
    .match(/\d[\d,]*(?:\.\d+)?/g)
    ?.map((value) => Number(value.replace(/,/g, '')))
    .filter((value) => Number.isFinite(value) && value > 0) || [];
}

function parsePriceRange(text) {
  const values = parseNumericValues(text);
  if (values.length === 0) {
    return { min: 0, max: 0, avg: 0, text: '' };
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  return {
    min,
    max,
    avg: values.length === 1 ? values[0] : Math.round((min + max) / 2),
    text: String(text || '').trim(),
  };
}

function roundUp(value, step = 25) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.ceil(value / step) * step;
}

function formatInrRange(min, max) {
  const format = (value) => Math.round(value).toLocaleString('en-IN');
  if (!min && !max) return '';
  if (!max || min === max) return format(min || max);
  return `${format(min)} - ${format(max)}`;
}

function computeBullionRatesPerGram({ goldInrPerOunce, silverInrPerOunce }) {
  return {
    gold: Number(goldInrPerOunce) / OUNCE_TO_GRAMS,
    silver: Number(silverInrPerOunce) / OUNCE_TO_GRAMS,
  };
}

function inferPurityFromMaterials(materials) {
  const values = Array.isArray(materials) ? materials : [materials];
  let best = 0;

  for (const value of values) {
    const text = String(value || '').toLowerCase();
    let explicitPurity = 0;
    const explicit = text.match(/(?:^|[^0-9])((?:0?\.\d{3})|(?:\d{3}))(?:[^0-9]|$)/);
    if (explicit) {
      const raw = explicit[1];
      const parsed = raw.includes('.') ? Number(raw.replace(/^\./, '0.')) : Number(raw) / 1000;
      if (parsed <= 1) {
        explicitPurity = parsed;
        best = Math.max(best, parsed);
      }
    }

    if (text.includes('gold-plated') || text.includes('debased') || text.includes('forgery')) {
      continue;
    }

    if (text.includes('gold') && explicitPurity === 0) best = Math.max(best, 0.99);
    if (text.includes('silver') && explicitPurity === 0) best = Math.max(best, 0.95);
  }

  return best;
}

function detectPreciousMetal(materials) {
  const text = (Array.isArray(materials) ? materials : [materials]).join(' ').toLowerCase();
  if (text.includes('gold-plated') || text.includes('debased') || text.includes('forgery')) {
    return null;
  }
  if (text.includes('gold')) return 'gold';
  if (text.includes('silver')) return 'silver';
  return null;
}

function buildValidatedPriceRecord({ item, bullionRates }) {
  const metadata = item.metadata || {};
  const materials = [...(item.materials || []), metadata.material].filter(Boolean);
  const metal = detectPreciousMetal(materials);
  const purity = inferPurityFromMaterials(materials);
  const weightGrams = parseNumericValues(metadata.weight_estimate || metadata.weightEstimate)[0] || 0;
  const parsedPrice = parsePriceRange(metadata.estimated_price_inr || metadata.estimatedPriceInr);

  if (!metal || !purity || !weightGrams) {
    return {
      adjusted: false,
      status: 'checked-non-precious',
      estimatedPriceInr: parsedPrice.text,
      estimatedPriceMin: parsedPrice.min,
      estimatedPriceMax: parsedPrice.max,
      estimatedPriceAvg: parsedPrice.avg,
      metalFloorInr: 0,
      metal,
      purity,
      weightGrams,
    };
  }

  const rate = metal === 'gold' ? bullionRates.gold : bullionRates.silver;
  const metalFloorInr = weightGrams * purity * rate;

  if (parsedPrice.max > 0 && parsedPrice.max < metalFloorInr * 0.98) {
    const minFactor = metal === 'gold' ? 1.05 : 1.03;
    const maxFactor = metal === 'gold' ? 1.18 : 1.12;
    const estimatedPriceMin = roundUp(Math.max(parsedPrice.min || 0, metalFloorInr * minFactor));
    const estimatedPriceMax = roundUp(Math.max(parsedPrice.max || 0, metalFloorInr * maxFactor, estimatedPriceMin));

    return {
      adjusted: true,
      status: 'adjusted-below-metal-floor',
      estimatedPriceInr: formatInrRange(estimatedPriceMin, estimatedPriceMax),
      estimatedPriceMin,
      estimatedPriceMax,
      estimatedPriceAvg: Math.round((estimatedPriceMin + estimatedPriceMax) / 2),
      metalFloorInr: roundUp(metalFloorInr, 1),
      metal,
      purity,
      weightGrams,
    };
  }

  return {
    adjusted: false,
    status: 'checked-precious-ok',
    estimatedPriceInr: parsedPrice.text,
    estimatedPriceMin: parsedPrice.min,
    estimatedPriceMax: parsedPrice.max,
    estimatedPriceAvg: parsedPrice.avg,
    metalFloorInr: roundUp(metalFloorInr, 1),
    metal,
    purity,
    weightGrams,
  };
}

module.exports = {
  buildValidatedPriceRecord,
  computeBullionRatesPerGram,
  detectPreciousMetal,
  formatInrRange,
  inferPurityFromMaterials,
  parsePriceRange,
};
