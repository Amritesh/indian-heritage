import catalogNormalization from '../../../../shared-data/catalogNormalization.json';
import {
  buildCanonicalKeywords,
  buildCanonicalTags,
  buildPublicTags,
  canonicalizeAuthority,
  canonicalizeEntityLabel,
  canonicalizeMint,
  canonicalizeRuler,
  canonicalizeRulerOrIssuer,
  normalizeAuthorityKey,
  normalizeEntityKey,
  slugifyTag,
  titleCaseWords,
} from './catalogCanonicalization';

export {
  buildCanonicalKeywords,
  buildCanonicalTags,
  buildPublicTags,
  canonicalizeAuthority,
  canonicalizeEntityLabel,
  canonicalizeMint,
  canonicalizeRuler,
  canonicalizeRulerOrIssuer,
  normalizeAuthorityKey,
  normalizeEntityKey,
  slugifyTag,
  titleCaseWords,
};

function normalizeDenominationText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const SHARED_DENOMINATIONS = catalogNormalization.denominations as Array<{
  key: string;
  label: string;
  rank: number;
  baseValue?: number;
  aliases?: string[];
}>;

export function resolveDenomination(value?: string | null) {
  if (!value) {
    return null;
  }

  const normalizedValue = normalizeDenominationText(value);
  const candidateEntries = SHARED_DENOMINATIONS.flatMap((entry) => {
    const candidates = [entry.key, entry.label, ...(entry.aliases ?? [])];

    return candidates.map((candidate) => ({
      entry,
      normalizedCandidate: normalizeDenominationText(candidate),
    }));
  });

  for (const candidate of candidateEntries) {
    if (candidate.normalizedCandidate === normalizedValue) {
      return candidate.entry;
    }
  }

  const matchingEntries = candidateEntries.filter((candidate) =>
    new RegExp(`(^| )${escapeRegExp(candidate.normalizedCandidate)}( |$)`).test(normalizedValue),
  );

  matchingEntries.sort((a, b) => b.normalizedCandidate.length - a.normalizedCandidate.length);

  return matchingEntries[0]?.entry ?? null;
}
