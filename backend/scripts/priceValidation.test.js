const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildValidatedPriceRecord,
  computeBullionRatesPerGram,
  detectPreciousMetal,
  inferPurityFromMaterials,
} = require('./priceValidation');

test('computeBullionRatesPerGram converts ounce quotes into gram rates', () => {
  const rates = computeBullionRatesPerGram({
    goldInrPerOunce: 436313.7854,
    silverInrPerOunce: 6822.9291029,
  });

  assert.equal(Math.round(rates.gold), 14028);
  assert.equal(Math.round(rates.silver), 219);
});

test('detectPreciousMetal and purity infer precious metal floor inputs', () => {
  assert.equal(detectPreciousMetal(['Gold', 'Copper']), 'gold');
  assert.equal(detectPreciousMetal(['Silver (0.917)']), 'silver');
  assert.equal(inferPurityFromMaterials(['Silver (0.917)']), 0.917);
  assert.equal(inferPurityFromMaterials(['Gold']), 0.99);
});

test('buildValidatedPriceRecord raises impossible gold prices above bullion floor', () => {
  const result = buildValidatedPriceRecord({
    item: {
      title: 'Gold Tanka - Ghiyath-al-din Tughluq',
      materials: ['Gold'],
      metadata: {
        weight_estimate: '11.0 g',
        estimated_price_inr: '75,000 - 90,000',
      },
    },
    bullionRates: {
      gold: 14027.8139,
      silver: 219.3622,
    },
  });

  assert.equal(result.adjusted, true);
  assert.equal(result.status, 'adjusted-below-metal-floor');
  assert.match(result.estimatedPriceInr, /^[\d,]+ - [\d,]+$/);
  assert.ok(result.estimatedPriceMin >= 150000);
  assert.ok(result.metalFloorInr >= 150000);
});

test('buildValidatedPriceRecord leaves non-precious items unchanged', () => {
  const result = buildValidatedPriceRecord({
    item: {
      title: 'Copper Falus',
      materials: ['Copper'],
      metadata: {
        weight_estimate: '12 g',
        estimated_price_inr: '600 - 900',
      },
    },
    bullionRates: {
      gold: 14027.8139,
      silver: 219.3622,
    },
  });

  assert.equal(result.adjusted, false);
  assert.equal(result.status, 'checked-non-precious');
  assert.equal(result.estimatedPriceInr, '600 - 900');
});
