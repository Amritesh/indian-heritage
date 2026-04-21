import { describe, expect, it } from 'vitest';
import { parsePriceRangeInr } from './priceParsing';

describe('parsePriceRangeInr', () => {
  it('parses a min-max range with commas and currency symbols', () => {
    expect(parsePriceRangeInr('₹1,500 - 3,500')).toEqual({ min: 1500, max: 3500 });
  });

  it('parses a single estimate into identical min and max', () => {
    expect(parsePriceRangeInr('5000')).toEqual({ min: 5000, max: 5000 });
  });

  it('returns nulls for empty or non-numeric values', () => {
    expect(parsePriceRangeInr('')).toEqual({ min: null, max: null });
    expect(parsePriceRangeInr('unknown')).toEqual({ min: null, max: null });
  });

  it('treats "N/A"-style sentinels as absent estimates, not zero', () => {
    expect(parsePriceRangeInr('N/A')).toEqual({ min: null, max: null });
    expect(parsePriceRangeInr('n/a')).toEqual({ min: null, max: null });
    expect(parsePriceRangeInr('na')).toEqual({ min: null, max: null });
    expect(parsePriceRangeInr('none')).toEqual({ min: null, max: null });
    expect(parsePriceRangeInr('TBD')).toEqual({ min: null, max: null });
  });

  it('treats a bare zero (or zero range) as absent estimate rather than a ₹0 total', () => {
    // This matters for aggregated totals: we don't want to pollute SUM() with real-zero rows.
    expect(parsePriceRangeInr('0')).toEqual({ min: null, max: null });
    expect(parsePriceRangeInr('0 - 0')).toEqual({ min: null, max: null });
    expect(parsePriceRangeInr('₹0')).toEqual({ min: null, max: null });
  });

  it('keeps one-sided zeros like "0-500" as genuine ranges (the max is positive)', () => {
    expect(parsePriceRangeInr('0-500')).toEqual({ min: 0, max: 500 });
  });
});
