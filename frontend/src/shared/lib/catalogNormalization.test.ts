import { describe, expect, it } from 'vitest';
import {
  buildCanonicalKeywords,
  buildCanonicalTags,
  canonicalizeMint,
  canonicalizeRulerOrIssuer,
  slugifyTag,
} from '@/shared/lib/catalogNormalization';

describe('catalog normalization', () => {
  it('canonicalizes ruler aliases into a single label', () => {
    expect(canonicalizeRulerOrIssuer('George V, King Emperor')).toBe('George V');
    expect(canonicalizeRulerOrIssuer('George V (British India)')).toBe('George V');
    expect(canonicalizeRulerOrIssuer('Muhammad bin Tughluq')).toBe('Muhammad bin Tughlaq');
  });

  it('falls back to stable ruler labels for composite princely-state strings', () => {
    expect(
      canonicalizeRulerOrIssuer('Maharaja Ram Singh II (Jaipur State) in the name of Queen Victoria'),
    ).toBe('Ram Singh II');
    expect(
      canonicalizeRulerOrIssuer('Mir Mahbub Ali Khan II, Nizam of Hyderabad'),
    ).toBe('Mir Mahboob Ali Khan');
  });

  it('canonicalizes mint aliases and produces stable slugs', () => {
    expect(canonicalizeMint('Bombay Mint')).toBe('Bombay');
    expect(slugifyTag('Muhammad bin Tughlaq')).toBe('muhammad-bin-tughlaq');
  });

  it('builds canonical tags without duplicate ruler variants', () => {
    const tags = buildCanonicalTags({
      culture: 'British India',
      rulerOrIssuer: 'George V, King Emperor',
      denomination: 'One Rupee',
      mintOrPlace: 'Bombay Mint',
      materials: ['silver'],
    });

    expect(tags).toEqual(['British India', 'George V', 'One Rupee', 'Bombay', 'Silver']);
    expect(buildCanonicalKeywords(tags)).toContain('george');
  });
});
