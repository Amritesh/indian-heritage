import entityAliases from '../../../../shared-data/entityAliases.json';

type AliasMap = Record<string, string>;

type EntityAliases = {
  rulers: AliasMap;
  authorities: AliasMap;
  mints: AliasMap;
};

const aliases = entityAliases as EntityAliases;

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

export function normalizeEntityKey(value?: string | null) {
  return normalizeWhitespace(
    String(value ?? '')
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

export function normalizeAuthorityKey(value?: string | null) {
  return normalizeWhitespace(
    String(value ?? '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/\([^)]*\)/g, ' ')
      .replace(/[/,]+/g, ' ')
      .replace(/[^a-z0-9\s-]+/g, ' ')
      .replace(/-/g, ' ')
      .replace(/\s+/g, ' '),
  );
}

export function titleCaseWords(value: string) {
  const romanNumerals = new Set(['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x']);
  return value
    .split(' ')
    .filter(Boolean)
    .map((word) => {
      if (romanNumerals.has(word)) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

export function slugifyTag(value: string) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isBlankEntityToken(value: string) {
  return value === '' || value === 'unknown' || value === 'none' || value === 'n' || value === 'n a';
}

function resolveAlias(value: string, aliasesMap: AliasMap) {
  return aliasesMap[value] ?? '';
}

function normalizeEntityLabelKey(value?: string | null) {
  return normalizeAuthorityKey(value);
}

function canonicalizeEntity(value?: string | null) {
  const normalized = normalizeEntityLabelKey(value);
  if (!normalized || isBlankEntityToken(normalized) || normalized.length < 2) {
    return '';
  }

  return (
    resolveAlias(normalized, aliases.rulers)
    || resolveAlias(normalized, aliases.authorities)
    || resolveAlias(normalized, aliases.mints)
    || titleCaseWords(normalized)
  );
}

function extractLocalIssuerFragment(value?: string | null) {
  const raw = String(value ?? '');
  const markerMatch = raw.match(/\b(?:in the name of|issued in the name of|under the suzerainty of|citing)\b/i);
  if (!markerMatch || typeof markerMatch.index !== 'number') {
    return '';
  }

  return normalizeEntityKey(raw.slice(0, markerMatch.index));
}

function buildRulerCandidates(value?: string | null) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return [];
  }

  const candidates = new Set<string>();
  const addCandidate = (candidate: string) => {
    const normalized = normalizeEntityKey(candidate);
    if (normalized) {
      candidates.add(normalized);
    }
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

  return [...candidates];
}

export function canonicalizeEntityLabel(value?: string | null) {
  return canonicalizeEntity(value);
}

export function canonicalizeRuler(value?: string | null) {
  const candidates = buildRulerCandidates(value);
  if (candidates.length === 0) {
    return '';
  }

  const localIssuerFragment = extractLocalIssuerFragment(value);
  if (localIssuerFragment && !isBlankEntityToken(localIssuerFragment)) {
    return canonicalizeEntityLabel(localIssuerFragment);
  }

  for (const candidate of candidates) {
    if (isBlankEntityToken(candidate) || candidate.length < 2) {
      continue;
    }

    const canonical = resolveAlias(candidate, aliases.rulers);
    if (canonical) {
      return canonical;
    }
  }

  const fallback = [...candidates]
    .filter((candidate) => !isBlankEntityToken(candidate) && candidate.length >= 2)
    .sort((a, b) => a.split(' ').length - b.split(' ').length || a.length - b.length)[0];
  return fallback ? canonicalizeEntityLabel(fallback) : '';
}

export function canonicalizeRulerOrIssuer(value?: string | null) {
  return canonicalizeRuler(value);
}

export function canonicalizeAuthority(value?: string | null) {
  const normalized = normalizeAuthorityKey(value);
  if (!normalized || isBlankEntityToken(normalized)) {
    return '';
  }

  return resolveAlias(normalized, aliases.authorities) || titleCaseWords(normalized);
}

export function canonicalizeMint(value?: string | null) {
  const normalized = normalizeEntityKey(value);
  if (!normalized || isBlankEntityToken(normalized) || normalized.length < 2) {
    return '';
  }

  return resolveAlias(normalized, aliases.mints) || titleCaseWords(normalized);
}

function normalizePublicTagValue(value?: string | null) {
  return normalizeWhitespace(String(value ?? ''));
}

type PublicTagInput = {
  authority?: string | null;
  culture?: string | null;
  ruler?: string | null;
  rulerOrIssuer?: string | null;
  denomination?: string | null;
  mint?: string | null;
  mintOrPlace?: string | null;
  materials?: Array<string | null | undefined>;
};

export function buildPublicTags({
  authority,
  culture,
  ruler,
  rulerOrIssuer,
  denomination,
  mint,
  mintOrPlace,
  materials,
}: PublicTagInput) {
  const tags = [
    canonicalizeAuthority(authority ?? culture),
    canonicalizeRuler(ruler ?? rulerOrIssuer),
    canonicalizeMint(mint ?? mintOrPlace),
    normalizePublicTagValue(denomination),
    ...(materials ?? []).map((value) => canonicalizeEntityLabel(value)),
  ].filter(Boolean);

  return Array.from(new Set(tags));
}

export function buildCanonicalTags(input: PublicTagInput) {
  return buildPublicTags(input);
}

export function buildCanonicalKeywords(values: string[]) {
  const tokens = values
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .split(/\s+/)
    .filter((value) => value.length >= 2);

  return Array.from(new Set(tokens)).sort();
}
