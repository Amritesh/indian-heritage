import { describe, expect, it } from 'vitest';
import { deriveYearRange, normalizeItem } from '@/backend-support/mappers/normalizeItem';
import { rawItemSchema } from '@/backend-support/schemas/source';

describe('normalizeItem', () => {
  it('maps source payloads into Firestore item records', () => {
    const rawItem = rawItemSchema.parse({
      id: 'coin-1',
      title: 'Silver Rupee - Jahangir',
      description: 'Silver Rupee issued by Jahangir. Mint: Patna.',
      image: 'gs://indian-heritage-gallery-bucket/images/mughals-auto/coin_1.png',
      notes: ['Obverse note', 'Reverse note'],
      period: 'AH 1028 / 1618-1619 AD',
      region: 'Patna',
      materials: ['Silver'],
      display_labels: ['Wt: 11.4 grams', 'Very Fine (VF)'],
      metadata: {
        denomination: 'Silver Rupee',
        ruler_or_issuer: 'Jahangir',
        mint_or_place: 'Patna',
        estimated_price_inr: '4,500 - 7,500',
        confidence: 92,
      },
      page: 1,
    });

    const normalized = normalizeItem(rawItem, 'mughals', '2026-03-29T00:00:00.000Z');

    expect(normalized.id).toBe('mughals-coin-1');
    expect(normalized.collectionSlug).toBe('mughals');
    expect(normalized.imageUrl).toContain('firebasestorage.googleapis.com');
    expect(normalized.metadata.rulerOrIssuer).toBe('Jahangir');
    expect(normalized.metadata.confidence).toBe('92');
    expect(normalized.denominationSystem).toBe('shared-indic');
    expect(normalized.denominationKey).toBe('rupee');
    expect(normalized.denominationRank).toBe(18);
    expect(normalized.denominationBaseValue).toBe(1);
    expect(normalized.sortYearStart).toBe(1618);
    expect(normalized.sortYearEnd).toBe(1619);
    expect(normalized.estimatedPriceMin).toBe(4500);
    expect(normalized.estimatedPriceMax).toBe(7500);
    expect(normalized.estimatedPriceAvg).toBe(6000);
    expect(normalized.weightGrams).toBeNull();
    expect(normalized.searchKeywords).toContain('jahangir');
    expect(normalized.tags).toContain('Mughal Empire');
    expect(normalized.tags).toContain('Jahangir');
  });

  it('derives numeric fields used by Firestore sorting', () => {
    const rawItem = rawItemSchema.parse({
      id: 'coin-2',
      title: 'Silver Rupee - Aurangzeb',
      description: 'Silver Rupee issued by Aurangzeb. Mint: Patna.',
      image: 'gs://indian-heritage-gallery-bucket/images/mughals-auto/coin_2.png',
      notes: ['Catalogued from pair'],
      period: 'AH 1079 (c. 1668-1669 AD)',
      region: 'Patna',
      materials: ['Silver'],
      metadata: {
        denomination: 'Silver Rupee',
        ruler_or_issuer: 'Aurangzeb',
        mint_or_place: 'Patna',
        estimated_price_inr: '2,000 - 3,500',
      },
      page: 2,
    });

    const normalized = normalizeItem(rawItem, 'mughals', '2026-04-01T00:00:00.000Z');

    expect(normalized.estimatedPriceMin).toBe(2000);
    expect(normalized.estimatedPriceMax).toBe(3500);
    expect(normalized.estimatedPriceAvg).toBe(2750);
    expect(normalized.sortYearStart).toBe(1668);
    expect(normalized.sortYearEnd).toBe(1669);
    expect(normalized.sortYear).toBe(1668);
  });

  it('prefers AD shorthand ranges and sorts unknown denominations last', () => {
    const rawItem = rawItemSchema.parse({
      id: 'coin-3',
      title: 'Silver Token',
      description: 'Silver token with mixed period notation.',
      image: 'gs://indian-heritage-gallery-bucket/images/mughals-auto/coin_3.png',
      notes: [],
      period: 'AH 991 (1582-83 AD)',
      region: 'Patna',
      materials: ['Silver'],
      metadata: {
        denomination: 'Mystery Token',
        ruler_or_issuer: 'Jahangir',
        mint_or_place: 'Patna',
      },
      page: 3,
    });

    const normalized = normalizeItem(rawItem, 'mughals', '2026-04-01T00:00:00.000Z');

    expect(normalized.denominationSystem).toBe('shared-indic');
    expect(normalized.denominationKey).toBeNull();
    expect(normalized.denominationRank).toBe(9999);
    expect(normalized.sortYearStart).toBe(1582);
    expect(normalized.sortYearEnd).toBe(1583);
    expect(normalized.sortYear).toBe(1582);
  });

  it('derives weight only from explicit weight metadata', () => {
    const rawItem = rawItemSchema.parse({
      id: 'coin-4',
      title: 'Silver Rupee - Weight Source',
      description: 'Silver rupee with explicit weight metadata.',
      image: 'gs://indian-heritage-gallery-bucket/images/mughals-auto/coin_4.png',
      notes: [],
      period: 'AH 1100 / 1688 AD',
      region: 'Patna',
      materials: ['Silver'],
      display_labels: ['Wt: 11.4 grams', 'Very Fine (VF)'],
      metadata: {
        denomination: 'Silver Rupee',
        ruler_or_issuer: 'Aurangzeb',
        mint_or_place: 'Patna',
        weight_estimate: '11.4 grams',
      },
      page: 4,
    });

    const normalized = normalizeItem(rawItem, 'mughals', '2026-04-01T00:00:00.000Z');

    expect(normalized.weightGrams).toBe(11.4);
    expect(normalized.sortYearStart).toBe(1688);
    expect(normalized.sortYearEnd).toBeNull();
  });

  it('canonicalizes british ruler variants into stable tags and metadata', () => {
    const rawItem = rawItemSchema.parse({
      id: 'coin-5',
      title: 'One Rupee - George V',
      description: 'British India rupee.',
      image: 'gs://indian-heritage-gallery-bucket/images/british/coin_5.png',
      notes: [],
      period: '1918 AD',
      region: 'Bombay Mint',
      materials: ['Silver'],
      metadata: {
        denomination: 'One Rupee',
        ruler_or_issuer: 'George V, King Emperor',
        mint_or_place: 'Bombay Mint',
        estimated_price_inr: '2,500 - 3,000',
      },
      page: 5,
    });

    const normalized = normalizeItem(rawItem, 'british', '2026-04-03T00:00:00.000Z');

    expect(normalized.metadata.rulerOrIssuer).toBe('George V');
    expect(normalized.metadata.mintOrPlace).toBe('Bombay');
    expect(normalized.tags).toContain('George V');
    expect(normalized.denominationKey).toBe('rupee');
    expect(normalized.estimatedPriceAvg).toBe(2750);
  });

  it('parses ancient AD ranges with circa prefixes', () => {
    expect(deriveYearRange('c. 415-455 AD')).toEqual({
      sortYearStart: 415,
      sortYearEnd: 455,
    });
  });

  it('parses parenthesized medieval AD ranges that accompany AH dates', () => {
    expect(deriveYearRange('AH 720-725 (1320-1325 AD)')).toEqual({
      sortYearStart: 1320,
      sortYearEnd: 1325,
    });
  });

  it('parses century-based BC ranges into signed sortable years', () => {
    expect(deriveYearRange('Late 2nd Century BC - 1st Century BC')).toEqual({
      sortYearStart: -124,
      sortYearEnd: -1,
    });
  });

  it('parses fuzzy century labels without explicit AD markers', () => {
    expect(deriveYearRange('Late 18th to 19th Century')).toEqual({
      sortYearStart: 1776,
      sortYearEnd: 1900,
    });
  });

  it('parses explicit decade hints embedded in approximate notes', () => {
    expect(deriveYearRange('VS 194x (Vikram Samvat 1940s / approx. 1880s-1890s)')).toEqual({
      sortYearStart: 1880,
      sortYearEnd: 1899,
    });
  });

  it('parses ordinal BC shorthand ranges that omit the word century', () => {
    expect(deriveYearRange('3rd BC - 2nd BC')).toEqual({
      sortYearStart: -299,
      sortYearEnd: -100,
    });
  });

  it('handles AH dates by converting to AD', () => {
    expect(deriveYearRange('AH 1028')).toEqual({
      sortYearStart: 1618,
      sortYearEnd: null,
    });
  });

  it('handles mixed BC/AD ranges', () => {
    expect(deriveYearRange('100 BC - 100 AD')).toEqual({
      sortYearStart: -100,
      sortYearEnd: 100,
    });
  });

  it('does not produce an end year that is earlier than the start year', () => {
    // Regression for a Mughal snapshot that fed "c. 1713 AD (Regnal Year 1 / AH 1124-1125)"
    // and derived [1711, 1712] via AH conversion while the explicit start was 1713.
    const r = deriveYearRange('c. 1713 AD (Regnal Year 1 / AH 1124-1125)');
    expect(r.sortYearStart).not.toBeNull();
    if (r.sortYearStart != null && r.sortYearEnd != null) {
      expect(r.sortYearEnd).toBeGreaterThanOrEqual(r.sortYearStart);
    }
  });
});
