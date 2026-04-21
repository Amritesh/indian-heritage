// Sentinel tokens seen in snapshots that represent "no estimate" rather than ₹0.
// Kept as a closed list so any new sentinel shows up in snapshot audits first.
const ABSENT_SENTINELS = new Set([
  '', 'n/a', 'na', 'none', 'tbd', 'unknown', 'unclear', 'unreadable', 'not available',
]);

export function parsePriceRangeInr(value: unknown) {
  const raw = String(value ?? '').trim();
  if (!raw || ABSENT_SENTINELS.has(raw.toLowerCase())) {
    return { min: null, max: null };
  }

  const matches = raw.match(/\d[\d,]*(?:\.\d+)?/g) ?? [];
  const numbers = matches
    .map((match) => Number(match.replace(/,/g, '')))
    .filter((entry) => Number.isFinite(entry) && entry >= 0);

  if (numbers.length === 0) {
    return { min: null, max: null };
  }

  // Collapse a sole zero (or "0 - 0") to null so aggregate SUM() is not polluted
  // by items that were never priced. Keep one-sided zeros like "0-500" as-is.
  if (numbers.every((n) => n === 0)) {
    return { min: null, max: null };
  }

  if (numbers.length === 1) {
    return { min: numbers[0], max: numbers[0] };
  }

  const [first, second] = numbers;
  return {
    min: Math.min(first, second),
    max: Math.max(first, second),
  };
}
