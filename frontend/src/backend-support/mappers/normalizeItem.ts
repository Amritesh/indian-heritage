import { FirestoreItemInput, firestoreItemSchema } from '../schemas/firestore';
import { RawItem } from '../schemas/source';
import { getCollectionRegistryEntry } from '../../shared/config/collections';
import { resolveDenomination } from '../../shared/config/denominations';
import {
  buildCanonicalKeywords,
  buildCanonicalTags,
  canonicalizeMint,
  canonicalizeRulerOrIssuer,
} from '../../shared/lib/catalogNormalization';
import { buildFirebaseMediaUrl, parseGsUrl } from '../../shared/lib/storage';

function normalizeText(value?: string | null) {
  return String(value ?? '').trim();
}

function uniqueStrings(values: Array<string | undefined | null>) {
  return Array.from(
    new Set(values.map((value) => normalizeText(value)).filter(Boolean)),
  );
}

function parseNumericValues(text?: string | null) {
  const matches = String(text ?? '').matchAll(
    /(\d[\d,]*(?:\.\d+)?)\s*(k|thousand|lakh|lac|crore|cr|million|mn)?/gi,
  );

  return Array.from(matches)
    .map((match) => {
      const numericValue = Number(match[1].replace(/,/g, ''));
      const suffix = String(match[2] ?? '').toLowerCase();
      if (!Number.isFinite(numericValue) || numericValue <= 0) {
        return null;
      }

      const multiplier =
        suffix === 'k' || suffix === 'thousand'
          ? 1_000
          : suffix === 'lakh' || suffix === 'lac'
            ? 100_000
            : suffix === 'crore' || suffix === 'cr'
              ? 10_000_000
              : suffix === 'million' || suffix === 'mn'
                ? 1_000_000
                : 1;

      return numericValue * multiplier;
    })
    .filter((value): value is number => value != null && Number.isFinite(value) && value > 0);
}

function expandYearRange(startText: string, endText: string) {
  const start = Number(startText);
  const end = Number(endText);

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return null;
  }

  if (endText.length < startText.length) {
    const prefix = startText.slice(0, startText.length - endText.length);
    return [start, Number(`${prefix}${endText}`)] as const;
  }

  return [start, end] as const;
}

function filterHistoricalYears(values: number[]) {
  return Array.from(new Set(values.filter((year) => year !== 0 && year >= -2500 && year <= 2100)));
}

function applyEra(year: number, era: string) {
  const normalizedEra = era.toUpperCase();
  if (/^(BC|BCE)$/.test(normalizedEra)) {
    return -Math.abs(year);
  }
  if (normalizedEra === 'AH') {
    // Hijri to Gregorian approximation: AD = AH * (32/33) + 622
    return Math.floor((year * 32) / 33) + 622;
  }
  return Math.abs(year);
}

function normalizeYearRange(start: number, end: number) {
  const years = filterHistoricalYears([start, end]);
  if (years.length === 0) {
    return { sortYearStart: null, sortYearEnd: null };
  }

  if (years.length === 1) {
    return { sortYearStart: years[0], sortYearEnd: null };
  }

  return {
    sortYearStart: Math.min(...years),
    sortYearEnd: Math.max(...years),
  };
}

function parseEraYearRange(startText: string, endText: string, era: string) {
  const expanded = expandYearRange(startText, endText);
  if (!expanded) return null;
  const [start, end] = expanded;
  return [applyEra(start, era), applyEra(end, era)] as const;
}

function parseEraYear(yearText: string, era: string) {
  const year = Number(yearText);
  if (!Number.isFinite(year)) return null;
  const signedYear = applyEra(year, era);
  return [signedYear, signedYear] as const;
}

function extractEraYearRangeFromSegment(segment: string) {
  // We prefer AD/CE/BC/BCE over AH for accuracy if both are present
  const patterns: Array<{ regex: RegExp; handler: (match: RegExpMatchArray) => readonly [number, number] | null }> = [
    {
      // Range with eras on both ends: 100 BC - 100 AD
      regex: /\b(\d{1,4})\b\s*(BC|BCE|AD|CE|AH)\b\s*(?:-|–|—|to)\s*\b(\d{1,4})\b\s*(BC|BCE|AD|CE|AH)\b/i,
      handler: (m) => [applyEra(Number(m[1]), m[2]), applyEra(Number(m[3]), m[4])] as const,
    },
    {
      // Range with era at end: 500-400 BC
      regex: /(?:c(?:irca)?\.?\s*)?\b(\d{1,4})\b\s*(?:-|–|—|to)\s*\b(\d{1,4})\b\s*(AD|CE|BC|BCE|AH)\b/i,
      handler: (m) => parseEraYearRange(m[1], m[2], m[3]),
    },
    {
      // Range with era at start: AD 1600-1700
      regex: /\b(AD|CE|BC|BCE|AH)\b\s*(\d{1,4})\b\s*(?:-|–|—|to)\s*\b(\d{1,4})\b/i,
      handler: (m) => parseEraYearRange(m[2], m[3], m[1]),
    },
    {
      // Single year with era
      regex: /(?:c(?:irca)?\.?\s*)?\b(\d{1,4})\b\s*(AD|CE|BC|BCE|AH)\b/i,
      handler: (m) => parseEraYear(m[1], m[2]),
    },
    {
      // Single year with era at start
      regex: /\b(AD|CE|BC|BCE|AH)\b\s*(\d{1,4})\b/i,
      handler: (m) => parseEraYear(m[2], m[1]),
    },
  ];

  for (const { regex, handler } of patterns) {
    const match = segment.match(regex);
    if (match) {
      const result = handler(match);
      if (result) return result;
    }
  }

  return null;
}

function extractEraYearRange(normalized: string) {
  const parenthesizedSegments = normalized.match(/\([^)]*\)/g) ?? [];
  for (const segment of parenthesizedSegments) {
    const parsed = extractEraYearRangeFromSegment(segment);
    if (parsed) return parsed;
  }

  return extractEraYearRangeFromSegment(normalized);
}

function expandCenturyRange(century: number, qualifier?: string | null, era?: string | null) {
  const normalizedEra = String(era ?? 'AD').toUpperCase();
  const isBc = normalizedEra === 'BC' || normalizedEra === 'BCE';

  let start = isBc ? -(century * 100) + 1 : (century - 1) * 100 + 1;
  let end = isBc
    ? (century === 1 ? -1 : -((century - 1) * 100))
    : century * 100;

  const normalizedQualifier = String(qualifier ?? '').toLowerCase();
  const span = end - start;
  const quarter = Math.floor(span / 4);
  if (normalizedQualifier === 'early') {
    end = start + quarter;
  } else if (normalizedQualifier === 'mid') {
    start = start + quarter;
    end = end - quarter;
  } else if (normalizedQualifier === 'late') {
    start = end - quarter;
  }

  return [start, end] as const;
}

function extractCenturyRange(normalized: string) {
  const ordinalEraRangeMatch = normalized.match(
    /(?:c(?:irca)?\.?\s*)?(\d{1,2})(?:st|nd|rd|th)\s*(BC|BCE|AD|CE)\s*(?:-|–|—|to)\s*(\d{1,2})(?:st|nd|rd|th)\s*(BC|BCE|AD|CE)/i,
  );
  if (ordinalEraRangeMatch) {
    const startRange = expandCenturyRange(Number(ordinalEraRangeMatch[1]), null, ordinalEraRangeMatch[2]);
    const endRange = expandCenturyRange(Number(ordinalEraRangeMatch[3]), null, ordinalEraRangeMatch[4]);
    return [Math.min(...startRange, ...endRange), Math.max(...startRange, ...endRange)] as const;
  }

  const compactRangeMatch = normalized.match(
    /(?:c(?:irca)?\.?\s*)?(early|mid|late)?\s*(\d{1,2})(?:st|nd|rd|th)\s*(?:-|–|—|to)\s*(early|mid|late)?\s*(\d{1,2})(?:st|nd|rd|th)\s*century\s*(BC|BCE|AD|CE)?/i,
  );
  if (compactRangeMatch) {
    const era = compactRangeMatch[5] ?? 'AD';
    const startRange = expandCenturyRange(Number(compactRangeMatch[2]), compactRangeMatch[1], era);
    const endRange = expandCenturyRange(Number(compactRangeMatch[4]), compactRangeMatch[3], era);
    return [Math.min(...startRange, ...endRange), Math.max(...startRange, ...endRange)] as const;
  }

  const repeatedRangeMatch = normalized.match(
    /(?:c(?:irca)?\.?\s*)?(early|mid|late)?\s*(\d{1,2})(?:st|nd|rd|th)\s*century(?:\s*(BC|BCE|AD|CE))?\s*(?:-|–|—|to)\s*(early|mid|late)?\s*(\d{1,2})(?:st|nd|rd|th)\s*century(?:\s*(BC|BCE|AD|CE))?/i,
  );
  if (repeatedRangeMatch) {
    const startEra = repeatedRangeMatch[3] ?? repeatedRangeMatch[6] ?? 'AD';
    const endEra = repeatedRangeMatch[6] ?? repeatedRangeMatch[3] ?? 'AD';
    const startRange = expandCenturyRange(Number(repeatedRangeMatch[2]), repeatedRangeMatch[1], startEra);
    const endRange = expandCenturyRange(Number(repeatedRangeMatch[5]), repeatedRangeMatch[4], endEra);
    return [Math.min(...startRange, ...endRange), Math.max(...startRange, ...endRange)] as const;
  }

  const singleCenturyMatch = normalized.match(
    /(?:c(?:irca)?\.?\s*)?(early|mid|late)?\s*(\d{1,2})(?:st|nd|rd|th)\s*century\s*(BC|BCE|AD|CE)?/i,
  );
  if (singleCenturyMatch) {
    return expandCenturyRange(Number(singleCenturyMatch[2]), singleCenturyMatch[1], singleCenturyMatch[3] ?? 'AD');
  }

  return null;
}

function extractDecadeRange(normalized: string) {
  const decadeRangeMatch = normalized.match(/\b((?:1[0-9]|20)\d0)s\b\s*(?:-|–|—|to)\s*\b((?:1[0-9]|20)\d0)s\b/i);
  if (decadeRangeMatch) {
    return [Number(decadeRangeMatch[1]), Number(decadeRangeMatch[2]) + 9] as const;
  }

  return null;
}

export function deriveYearRange(dateText?: string | null) {
  const normalized = String(dateText ?? '')
    .replace(/\s+/g, ' ')
    .trim();

  const eraRange = extractEraYearRange(normalized);
  if (eraRange) {
    return normalizeYearRange(eraRange[0], eraRange[1]);
  }

  const decadeRange = extractDecadeRange(normalized);
  if (decadeRange) {
    return normalizeYearRange(decadeRange[0], decadeRange[1]);
  }

  const centuryRange = extractCenturyRange(normalized);
  if (centuryRange) {
    return normalizeYearRange(centuryRange[0], centuryRange[1]);
  }

  if (/\b(AD|CE|BC|BCE)\b/i.test(normalized)) {
    return { sortYearStart: null, sortYearEnd: null };
  }

  const explicitRangeMatch = normalized.match(
    /\b(1[5-9]\d{2}|20\d{2}|\d{3,4})\b\s*(?:-|–|—|to)\s*\b(1[5-9]\d{2}|20\d{2}|\d{3,4})\b/i,
  );

  if (explicitRangeMatch) {
    const start = Number(explicitRangeMatch[1]);
    const end = Number(explicitRangeMatch[2]);
    return normalizeYearRange(start, end);
  }

  const allYears = normalized.match(/\b(\d{3,4})\b/g) ?? [];
  const years = filterHistoricalYears(allYears.map((value) => Number(value)));
  if (years.length > 0) {
    const start = Math.min(...years);
    const end = Math.max(...years);
    return {
      sortYearStart: start,
      sortYearEnd: start === end ? null : end,
    };
  }

  return { sortYearStart: 0, sortYearEnd: null };
}

export function derivePriceRange(priceText?: string | null) {
  const matches = parseNumericValues(priceText);

  if (matches.length === 0) {
    return { estimatedPriceMin: 0, estimatedPriceMax: 0, estimatedPriceAvg: 0 };
  }

  const estimatedPriceMin = Math.min(...matches);
  const estimatedPriceMax = Math.max(...matches);

  return {
    estimatedPriceMin,
    estimatedPriceMax,
    estimatedPriceAvg:
      matches.length === 1 ? matches[0] : Math.round((estimatedPriceMin + estimatedPriceMax) / 2),
  };
}

export function deriveWeightGrams(weightText?: string | null) {
  const [weightGrams] = parseNumericValues(weightText);
  return weightGrams ?? null;
}

export function normalizeItem(rawItem: RawItem, collectionSlug: string, timestamp: string): FirestoreItemInput {
  const registryEntry = getCollectionRegistryEntry(collectionSlug);
  if (!registryEntry) {
    throw new Error(`Unknown collection slug "${collectionSlug}".`);
  }

  const storage = parseGsUrl(rawItem.image);
  const imageUrl = buildFirebaseMediaUrl(rawItem.image);
  const denomination = resolveDenomination(rawItem.metadata.denomination);
  const yearRange = deriveYearRange(rawItem.metadata.year_or_period || rawItem.period);
  const priceRange = derivePriceRange(rawItem.metadata.estimated_price_inr);
  const denominationRank = denomination?.rank ?? 9999;
  const materials = uniqueStrings(rawItem.materials);
  const notes = uniqueStrings(rawItem.notes);
  const searchFields = [
    normalizeText(rawItem.title),
    normalizeText(rawItem.description),
    normalizeText(rawItem.period),
    normalizeText(rawItem.region),
    normalizeText(rawItem.metadata.ruler_or_issuer),
    normalizeText(rawItem.metadata.denomination),
    normalizeText(rawItem.metadata.series_or_catalog),
    normalizeText(rawItem.metadata.mint_or_place),
    ...materials,
    ...uniqueStrings(rawItem.display_labels),
    ...notes,
  ];

  const canonicalRuler = canonicalizeRulerOrIssuer(rawItem.metadata.ruler_or_issuer);
  const canonicalMint = canonicalizeMint(rawItem.metadata.mint_or_place || rawItem.region);
  const subtitle = canonicalRuler
    || normalizeText(rawItem.metadata.denomination)
    || registryEntry.culture;
  const shortDescription =
    normalizeText(rawItem.description).split('. ').slice(0, 2).join('. ').trim()
    || normalizeText(rawItem.description);
  const tags = buildCanonicalTags({
    culture: registryEntry.culture,
    rulerOrIssuer: canonicalRuler || rawItem.metadata.ruler_or_issuer,
    denomination: rawItem.metadata.denomination,
    mintOrPlace: canonicalMint || rawItem.metadata.mint_or_place,
    materials,
  });
  const searchKeywords = buildCanonicalKeywords([...searchFields, ...tags]);

  const primaryMedia = storage
    ? {
        gsUrl: rawItem.image,
        storagePath: storage.path,
        downloadUrl: imageUrl,
        alt: rawItem.title,
        caption: rawItem.description,
      }
    : null;

  return firestoreItemSchema.parse({
    id: `${collectionSlug}-${rawItem.id}`,
    collectionId: registryEntry.id,
    collectionSlug,
    collectionName: registryEntry.name,
    title: rawItem.title,
    subtitle,
    period: rawItem.period || rawItem.metadata.year_or_period || '',
    dateText: rawItem.metadata.year_or_period || rawItem.period || '',
    culture: registryEntry.culture,
    location: canonicalMint || rawItem.region || rawItem.metadata.mint_or_place || '',
    description: rawItem.description,
    shortDescription,
    imageUrl,
    imageAlt: rawItem.title,
    primaryMedia,
    gallery: primaryMedia ? [primaryMedia] : [],
    materials,
    tags,
    notes,
    searchText: searchFields.join(' ').toLowerCase(),
    searchKeywords,
    metadata: {
      type: rawItem.metadata.type,
      denomination: rawItem.metadata.denomination,
      rulerOrIssuer: canonicalRuler || rawItem.metadata.ruler_or_issuer,
      mintOrPlace: canonicalMint || rawItem.metadata.mint_or_place,
      seriesOrCatalog: rawItem.metadata.series_or_catalog,
      weightEstimate: rawItem.metadata.weight_estimate,
      condition: rawItem.metadata.condition,
      estimatedPriceInr: rawItem.metadata.estimated_price_inr,
      confidence: rawItem.metadata.confidence,
    },
    pageNumber: rawItem.page,
    denominationSystem: 'shared-indic',
    denominationKey: denomination?.key ?? null,
    denominationRank,
    denominationBaseValue: denomination?.baseValue ?? null,
    sortYearStart: yearRange.sortYearStart,
    sortYearEnd: yearRange.sortYearEnd,
    estimatedPriceMin: priceRange.estimatedPriceMin,
    estimatedPriceMax: priceRange.estimatedPriceMax,
    estimatedPriceAvg: priceRange.estimatedPriceAvg,
    weightGrams: deriveWeightGrams(rawItem.metadata.weight_estimate),
    sortYear: yearRange.sortYearStart,
    sortTitle: rawItem.title.toLowerCase(),
    published: true,
    sourceUrl: registryEntry.sourceUrl,
    sourceRawRef: `${collectionSlug}:${rawItem.id}`,
    importedAt: timestamp,
    updatedAt: timestamp,
  });
}
