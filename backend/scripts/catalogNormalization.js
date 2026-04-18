const path = require('path');

const catalogNormalization = require(path.join(
  __dirname,
  '..',
  '..',
  'shared-data',
  'catalogNormalization.json',
));
const entityAliases = require(path.join(
  __dirname,
  '..',
  '..',
  'shared-data',
  'entityAliases.json',
));

function normalizeWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

const polityOnlyLabels = new Set([
  'bahmani',
  'delhi',
  'hyderabad',
  'indore',
  'kutch',
  'pratapgarh',
  'sikh',
  'suri',
  'turk',
]);

function stripTrailingQualifierPhrases(value) {
  return String(value || '')
    .replace(/\b(?:modern day|modern-day|now)\b.*$/i, ' ')
    .replace(/\b(?:based on|identified by|identifiable by|as inscribed|holder mentions|absence of|note:)\b.*$/i, ' ')
    .replace(/\b(?:regional mint|regional issue|regional issues)\b.*$/i, ' ')
    .replace(/\b(?:coin in holder|coin in 2x2 holder|coin in 2x2 cardboard holder)\b.*$/i, ' ')
    .replace(/\b(?:unable to determine|uncertain mint|no mint mark visible|no mint mark)\b.*$/i, ' ')
    .trim();
}

const genericMintGeoTokens = new Set(['india', 'gujarat', 'bihar', 'holder']);

function isBlankEntityToken(value) {
  return value === '' || value === 'unknown' || value === 'none' || value === 'n' || value === 'n a';
}

function normalizeAuthorityKey(value) {
  return normalizeWhitespace(
    String(value || '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/\([^)]*\)/g, ' ')
      .replace(/[/,]+/g, ' ')
      .replace(/[^a-z0-9\s-]+/g, ' ')
      .replace(/-/g, ' ')
      .replace(/\s+/g, ' '),
  );
}

function normalizeEntityKey(value) {
  return normalizeWhitespace(
    String(value || '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/\([^)]*\)/g, ' ')
      .replace(/[/,]+/g, ' ')
      .replace(/[^a-z0-9\s-]+/g, ' ')
      .replace(/-/g, ' ')
      .replace(/\btughluq\b/g, 'tughlaq')
      .replace(/\b(the|of|in the name of)\b/g, ' ')
      .replace(/\b(king emperor|king and emperor|king and empress|emperor)\b/g, ' ')
      .replace(/\b(maharaja|maharana|maharao|maharawal|maharawat|nawab|raja|rao|jam shri)\b/g, ' ')
      .replace(/\b(princely state|state|british india|british raj|british empire|mughal empire|mughal emperor|empire|dynasty|sultanate|kingdom)\b/g, ' ')
      .replace(/\s+/g, ' '),
  );
}

function hasPolityLanguage(value) {
  return /\b(state|empire|sultanate|kingdom|company|confederacy|presidency|princely)\b/.test(String(value || '').toLowerCase());
}

function isLikelyPolityLabel(value) {
  const normalized = normalizeEntityKey(value);
  return hasPolityLanguage(value) || polityOnlyLabels.has(normalized);
}

function titleCaseWords(value) {
  const romanNumerals = new Set(['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x']);
  return String(value || '')
    .split(' ')
    .filter(Boolean)
    .map((word) => (romanNumerals.has(word) ? word.toUpperCase() : `${word[0].toUpperCase()}${word.slice(1)}`))
    .join(' ');
}

function slugifyTag(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function resolveEntityAlias(value, aliases) {
  const normalized = normalizeEntityKey(value);
  if (!normalized || isBlankEntityToken(normalized) || normalized.length < 2) {
    return '';
  }
  return aliases[normalized] || titleCaseWords(normalized);
}

function extractLocalIssuerFragment(value) {
  const raw = String(value || '');
  const markerMatch = raw.match(/\b(?:in the name of|issued in the name of|under the suzerainty of|citing)\b/i);
  if (!markerMatch || typeof markerMatch.index !== 'number') {
    return '';
  }

  return normalizeEntityKey(raw.slice(0, markerMatch.index));
}

function buildRulerCandidates(value) {
  const raw = String(value || '').trim();
  if (!raw) return [];

  const candidates = new Set();
  const addCandidate = (candidate) => {
    const normalized = normalizeEntityKey(candidate);
    if (normalized) candidates.add(normalized);
  };

  addCandidate(raw);

  for (const match of raw.matchAll(/\(([^)]*)\)/g)) {
    addCandidate(match[1]);
  }

  for (const fragment of raw.split(/\s*[/;]\s*|\s*,\s*/g)) {
    addCandidate(fragment);
  }

  for (const fragment of raw.split(/\b(?:in the name of|issued in the name of|under the suzerainty of|citing)\b/i)) {
    addCandidate(fragment);
  }

  return Array.from(candidates);
}

function buildAuthorityCandidates(value) {
  const raw = String(value || '').trim();
  if (!raw) return [];

  const candidates = new Set();
  const addCandidate = (candidate) => {
    const cleaned = normalizeAuthorityKey(stripTrailingQualifierPhrases(candidate));
    if (cleaned) candidates.add(cleaned);
  };

  addCandidate(raw);
  for (const match of raw.matchAll(/\(([^)]*)\)/g)) {
    addCandidate(match[1]);
  }
  for (const fragment of raw.split(/\s*[/;]\s*|\s*,\s*/g)) {
    addCandidate(fragment);
  }
  return Array.from(candidates);
}

function buildMintCandidates(value) {
  const raw = String(value || '').trim();
  if (!raw) return [];

  const candidates = new Set();
  const addCandidate = (candidate) => {
    const cleaned = stripTrailingQualifierPhrases(candidate);
    const normalized = normalizeEntityKey(cleaned);
    if (normalized) candidates.add(normalized);
  };

  addCandidate(raw);
  addCandidate(raw.replace(/\([^)]*\)/g, ' '));
  for (const match of raw.matchAll(/\(([^)]*)\)/g)) {
    addCandidate(match[1]);
  }
  for (const fragment of raw.split(/\s*[/;]\s*|\s*,\s*|\s+\bor\b\s+/i)) {
    addCandidate(fragment);
  }
  return Array.from(candidates);
}

function canonicalizeRulerOrIssuer(value) {
  const candidates = buildRulerCandidates(value);
  if (candidates.length === 0) return '';

  const localIssuerFragment = extractLocalIssuerFragment(value);
  if (localIssuerFragment && isLikelyPolityLabel(localIssuerFragment)) {
    return '';
  }
  if (localIssuerFragment && !isBlankEntityToken(localIssuerFragment) && !isLikelyPolityLabel(localIssuerFragment)) {
    return resolveEntityAlias(localIssuerFragment, entityAliases.rulers);
  }

  for (const candidate of candidates) {
    if (
      isBlankEntityToken(candidate)
      || candidate.length < 2
      || isLikelyPolityLabel(candidate)
    ) {
      continue;
    }
    const canonical = entityAliases.rulers[candidate];
    if (canonical) return canonical;
  }

  const fallback = candidates
    .filter((candidate) => !['unknown', 'none', 'n a', 'n'].includes(candidate) && candidate.length >= 2)
    .filter((candidate) => !entityAliases.authorities[candidate])
    .filter((candidate) => !entityAliases.mints[candidate])
    .filter((candidate) => !isLikelyPolityLabel(candidate))
    .sort((a, b) => b.split(' ').length - a.split(' ').length || b.length - a.length)[0];
  return fallback ? resolveEntityAlias(fallback, entityAliases.rulers) : '';
}

function canonicalizeAuthority(value) {
  const normalized = normalizeAuthorityKey(value);
  if (!normalized || isBlankEntityToken(normalized)) return '';
  return entityAliases.authorities[normalized] || titleCaseWords(normalized);
}

function canonicalizeLocalAuthority(value) {
  const candidates = buildAuthorityCandidates(value);
  if (candidates.length === 0) return '';

  for (const candidate of candidates) {
    if (entityAliases.authorities[candidate]) return entityAliases.authorities[candidate];
  }

  const polityCandidate = candidates.find((candidate) => isLikelyPolityLabel(candidate));
  return polityCandidate ? titleCaseWords(polityCandidate) : '';
}

function canonicalizeMint(value) {
  let fallback = '';
  const candidates = buildMintCandidates(value);
  for (const candidate of candidates) {
    if (!candidate || isBlankEntityToken(candidate) || candidate.length < 2) {
      continue;
    }
    if (entityAliases.mints[candidate]) return entityAliases.mints[candidate];
    if (!/\b(likely|unable|various|regional|unknown|uncertain)\b/i.test(candidate)) {
      const titled = titleCaseWords(candidate);
      if (!fallback && !/\bIndia\b/.test(titled) && !genericMintGeoTokens.has(candidate)) {
        fallback = titled;
      }
    }
  }
  return fallback;
}

function normalizeDenominationText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function resolveDenomination(value) {
  if (!value) return null;
  const normalizedValue = normalizeDenominationText(value);
  const candidates = catalogNormalization.denominations.flatMap((entry) =>
    [entry.key, entry.label, ...(entry.aliases || [])].map((candidate) => ({
      entry,
      normalizedCandidate: normalizeDenominationText(candidate),
    })),
  );

  for (const candidate of candidates) {
    if (candidate.normalizedCandidate === normalizedValue) {
      return candidate.entry;
    }
  }

  const matchingEntries = candidates.filter((candidate) =>
    new RegExp(`(^| )${escapeRegExp(candidate.normalizedCandidate)}( |$)`).test(normalizedValue),
  );
  matchingEntries.sort((a, b) => b.normalizedCandidate.length - a.normalizedCandidate.length);
  return matchingEntries[0]?.entry || null;
}

function buildCanonicalTags({ culture, rulerOrIssuer, denomination, mintOrPlace, materials }) {
  const tags = [
    canonicalizeAuthority(culture),
    canonicalizeLocalAuthority(rulerOrIssuer),
    canonicalizeRulerOrIssuer(rulerOrIssuer),
    canonicalizeMint(mintOrPlace),
    normalizeWhitespace(denomination),
    ...(materials || []).map((value) => titleCaseWords(normalizeEntityKey(value))),
  ].filter(Boolean);

  return Array.from(new Set(tags));
}

function buildCanonicalKeywords(values) {
  const tokens = values
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .split(/\s+/)
    .filter((value) => value.length >= 2);
  return Array.from(new Set(tokens)).sort();
}

module.exports = {
  buildCanonicalKeywords,
  buildCanonicalTags,
  canonicalizeAuthority,
  canonicalizeLocalAuthority,
  canonicalizeMint,
  canonicalizeRulerOrIssuer,
  normalizeEntityKey,
  resolveDenomination,
  slugifyTag,
  titleCaseWords,
};
