export function parsePriceRangeInr(value: unknown) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return { min: null, max: null };
  }

  const matches = raw.match(/\d[\d,]*(?:\.\d+)?/g) ?? [];
  const numbers = matches
    .map((match) => Number(match.replace(/,/g, '')))
    .filter((entry) => Number.isFinite(entry) && entry >= 0);

  if (numbers.length === 0) {
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
