import { describe, expect, it } from 'vitest';
import {
  buildCanonicalKeywords,
  buildCanonicalTags,
  buildPublicTags,
  canonicalizeAuthority,
  canonicalizeEntityLabel,
  canonicalizeMint,
  canonicalizeRuler,
  canonicalizeRulerOrIssuer,
  slugifyTag,
} from '@/shared/lib/catalogCanonicalization';

describe('catalogCanonicalization', () => {
  it('collapses ruler aliases into a single canonical label', () => {
    expect(canonicalizeRuler('Jalal-ud-din Muhammad Akbar')).toBe('Akbar');
    expect(canonicalizeRuler('Akbar The Great')).toBe('Akbar');
    expect(canonicalizeRuler('Mir Mahbub Ali Khan II, Nizam of Hyderabad')).toBe('Mir Mahbub Ali Khan');
    expect(canonicalizeRulerOrIssuer('George V, King Emperor')).toBe('George V');
  });

  it('canonicalizes entity, authority, and mint labels', () => {
    expect(canonicalizeEntityLabel('Mughal Empire')).toBe('Mughal Empire');
    expect(canonicalizeAuthority('British India')).toBe('British India');
    expect(canonicalizeMint('Bombay Mint')).toBe('Bombay');
  });

  it('builds canonical public tags and keeps them deduplicated', () => {
    const tags = buildPublicTags({
      authority: 'Mughal Empire',
      ruler: 'Jalal-ud-din Muhammad Akbar',
      mint: 'Lahore Mint',
      denomination: 'Rupee',
      materials: ['silver', 'Silver'],
    });

    expect(tags).toEqual(['Mughal Empire', 'Akbar', 'Lahore', 'Rupee', 'Silver']);
    expect(buildCanonicalTags({
      culture: 'Mughal Empire',
      rulerOrIssuer: 'Jalal-ud-din Muhammad Akbar',
      mintOrPlace: 'Lahore Mint',
      denomination: 'Rupee',
      materials: ['silver'],
    })).toEqual(['Mughal Empire', 'Akbar', 'Lahore', 'Rupee', 'Silver']);
    expect(buildCanonicalKeywords(tags)).toContain('akbar');
    expect(slugifyTag('Muhammad bin Tughlaq')).toBe('muhammad-bin-tughlaq');
  });

  it('prefers the local issuer fragment for composite ruler strings when aliases do not match', () => {
    expect(canonicalizeRulerOrIssuer('X in the name of Queen Victoria')).toBe('X');
    expect(
      canonicalizeRulerOrIssuer('Ram Singh II (Jaipur State) in the name of Queen Victoria'),
    ).toBe('Ram Singh II');
  });
});
