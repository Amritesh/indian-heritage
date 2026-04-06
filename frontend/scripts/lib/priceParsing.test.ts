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
});
