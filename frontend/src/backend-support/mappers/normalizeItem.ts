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
  return Array.from(new Set(values.filter((year) => year >= 500 && year <= 2100)));
}

function extractAdYearRange(normalized: string) {
  const parenthesizedSegments = normalized.match(/\([^)]*\)/g) ?? [];
  for (const segment of parenthesizedSegments) {
    if (!/\b(AD|CE)\b/i.test(segment)) continue;
    const rangeMatch = segment.match(/\b(1[5-9]\d{2}|20\d{2})\b\s*(?:-|–|—|to)\s*\b(\d{2,4})\b/i);
    if (rangeMatch) {
      return expandYearRange(rangeMatch[1], rangeMatch[2]);
    }
    const yearMatch = segment.match(/\b(1[5-9]\d{2}|20\d{2})\b/i);
    if (yearMatch) {
      const year = Number(yearMatch[1]);
      return [year, year] as const;
    }
  }

  const adRangeMatch = normalized.match(
    /(?:\b(AD|CE)\b\s*)?\b(1[5-9]\d{2}|20\d{2})\b\s*(?:-|–|—|to)\s*\b(\d{2,4})\b(?:\s*\b(AD|CE)\b)?/i,
  );
  if (adRangeMatch && (adRangeMatch[1] || adRangeMatch[4] || /\b(AD|CE)\b/i.test(normalized))) {
    return expandYearRange(adRangeMatch[2], adRangeMatch[3]);
  }

  const adMatch = normalized.match(/\b(1[5-9]\d{2}|20\d{2})\b(?=[^)]*(?:\bAD\b|\bCE\b|$))/i);
  if (adMatch && /\b(AD|CE)\b/i.test(normalized)) {
    const year = Number(adMatch[1]);
    return [year, year] as const;
  }

  return null;
}

export function deriveYearRange(dateText?: string | null) {
  const normalized = String(dateText ?? '');
  const adRange = extractAdYearRange(normalized);
  if (adRange) {
    const [start, end] = adRange;
    const years = filterHistoricalYears([start, end]);
    if (years.length === 0) {
      return { sortYearStart: 0, sortYearEnd: null };
    }

    if (years.length === 1) {
      return { sortYearStart: years[0], sortYearEnd: null };
    }

    return {
      sortYearStart: Math.min(...years),
      sortYearEnd: Math.max(...years),
    };
  }

  if (/\b(AD|CE)\b/i.test(normalized)) {
    return { sortYearStart: 0, sortYearEnd: null };
  }

  const explicitRangeMatch = normalized.match(
    /\b(1[5-9]\d{2}|20\d{2}|\d{3,4})\b\s*(?:-|–|—|to)\s*\b(1[5-9]\d{2}|20\d{2}|\d{3,4})\b/i,
  );

  if (explicitRangeMatch) {
    const start = Number(explicitRangeMatch[1]);
    const end = Number(explicitRangeMatch[2]);
    const years = filterHistoricalYears([start, end]);
    if (years.length === 0) {
      return { sortYearStart: 0, sortYearEnd: null };
    }

    if (years.length === 1) {
      return { sortYearStart: years[0], sortYearEnd: null };
    }

    return {
      sortYearStart: Math.min(...years),
      sortYearEnd: Math.max(...years),
    };
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
