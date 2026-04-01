export type DenominationEntry = {
  key: string;
  label: string;
  rank: number;
  baseValue?: number;
  aliases?: string[];
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

export const SHARED_DENOMINATIONS: DenominationEntry[] = [
  { key: 'dam', label: 'Dam', rank: 1, baseValue: 1 / 192, aliases: ['dam coin'] },
  { key: 'pice', label: 'Pice', rank: 2, baseValue: 1 / 64, aliases: ['pie'] },
  { key: 'paisa', label: 'Paisa', rank: 3, baseValue: 1 / 64 },
  { key: 'half-anna', label: 'Half-anna', rank: 4, baseValue: 1 / 32, aliases: ['half anna'] },
  { key: 'anna', label: 'Anna', rank: 5, baseValue: 1 / 16 },
  { key: 'two-anna', label: 'Two-anna', rank: 6, baseValue: 1 / 8, aliases: ['two anna'] },
  { key: 'four-anna', label: 'Four-anna', rank: 7, baseValue: 1 / 4, aliases: ['four anna'] },
  { key: 'eight-anna', label: 'Eight-anna', rank: 8, baseValue: 1 / 2, aliases: ['eight anna'] },
  { key: 'half-rupee', label: 'Half-rupee', rank: 9, baseValue: 1 / 2, aliases: ['half rupee'] },
  { key: 'rupee', label: 'Rupee', rank: 10, baseValue: 1, aliases: ['1 rupee', 'one rupee'] },
  { key: 'mohur', label: 'Mohur', rank: 11, baseValue: 15, aliases: ['mohar'] },
];

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
    new RegExp(
      `(^| )${escapeRegExp(candidate.normalizedCandidate)}( |$)`,
    ).test(normalizedValue),
  );

  matchingEntries.sort((a, b) => b.normalizedCandidate.length - a.normalizedCandidate.length);

  if (matchingEntries.length > 0) {
    return matchingEntries[0].entry;
  }

  return null;
}
