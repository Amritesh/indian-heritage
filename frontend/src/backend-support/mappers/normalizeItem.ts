import { FirestoreItemInput, firestoreItemSchema } from '../schemas/firestore';
import { RawItem } from '../schemas/source';
import { getCollectionRegistryEntry } from '../../shared/config/collections';
import { resolveDenomination } from '../../shared/config/denominations';
import { buildFirebaseMediaUrl, parseGsUrl } from '../../shared/lib/storage';

function normalizeText(value?: string | null) {
  return String(value ?? '').trim();
}

function uniqueStrings(values: Array<string | undefined | null>) {
  return Array.from(
    new Set(values.map((value) => normalizeText(value)).filter(Boolean)),
  );
}

function buildKeywords(values: string[]) {
  const tokens = values
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .split(/\s+/)
    .filter((value) => value.length >= 2);

  return Array.from(new Set(tokens)).sort();
}

function parseNumericValues(text?: string | null) {
  return String(text ?? '')
    .match(/\d[\d,]*(?:\.\d+)?/g)
    ?.map((value) => Number(value.replace(/,/g, '')))
    .filter((value) => Number.isFinite(value) && value > 0) ?? [];
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
  const parenthesizedRangeMatch = normalized.match(
    /\((?:[^)]*\b(1[5-9]\d{2}|20\d{2})\s*(?:-|–|—)\s*(\d{2,4})\s*AD[^)]*)\)/i,
  );
  if (parenthesizedRangeMatch) {
    return expandYearRange(parenthesizedRangeMatch[1], parenthesizedRangeMatch[2]);
  }

  const adRangeMatch = normalized.match(/\b(1[5-9]\d{2}|20\d{2})\s*(?:-|–|—)\s*(\d{2,4})\s*AD\b/i);
  if (adRangeMatch) {
    return expandYearRange(adRangeMatch[1], adRangeMatch[2]);
  }

  const adMatch = normalized.match(/\b(1[5-9]\d{2}|20\d{2})\b(?=[^)]*(?:\bAD\b|$))/i);
  if (adMatch) {
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
      return { sortYearStart: 0, sortYearEnd: 0 };
    }

    if (years.length === 1) {
      return { sortYearStart: years[0], sortYearEnd: null };
    }

    return {
      sortYearStart: Math.min(...years),
      sortYearEnd: Math.max(...years),
    };
  }

  const explicitRangeMatch = normalized.match(
    /\b(1[5-9]\d{2}|20\d{2}|\d{3,4})\b\s*(?:-|–|—|to)\s*\b(1[5-9]\d{2}|20\d{2}|\d{3,4})\b/i,
  );

  if (explicitRangeMatch) {
    const start = Number(explicitRangeMatch[1]);
    const end = Number(explicitRangeMatch[2]);
    const years = filterHistoricalYears([start, end]);
    if (years.length === 0) {
      return { sortYearStart: 0, sortYearEnd: 0 };
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

  return { sortYearStart: 0, sortYearEnd: 0 };
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

  const subtitle = normalizeText(rawItem.metadata.ruler_or_issuer)
    || normalizeText(rawItem.metadata.denomination)
    || registryEntry.culture;
  const shortDescription =
    normalizeText(rawItem.description).split('. ').slice(0, 2).join('. ').trim()
    || normalizeText(rawItem.description);
  const tags = uniqueStrings([
    rawItem.metadata.material,
    rawItem.metadata.denomination,
    rawItem.metadata.ruler_or_issuer,
    rawItem.metadata.mint_or_place,
    registryEntry.culture,
  ]);

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
    location: rawItem.region || rawItem.metadata.mint_or_place || '',
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
    searchKeywords: buildKeywords(searchFields),
    metadata: {
      type: rawItem.metadata.type,
      denomination: rawItem.metadata.denomination,
      rulerOrIssuer: rawItem.metadata.ruler_or_issuer,
      mintOrPlace: rawItem.metadata.mint_or_place,
      seriesOrCatalog: rawItem.metadata.series_or_catalog,
      weightEstimate: rawItem.metadata.weight_estimate,
      condition: rawItem.metadata.condition,
      estimatedPriceInr: rawItem.metadata.estimated_price_inr,
      confidence: rawItem.metadata.confidence,
    },
    pageNumber: rawItem.page,
    denominationSystem: 'shared-indic',
    denominationKey: denomination?.key ?? '',
    denominationRank,
    denominationBaseValue: denomination?.baseValue ?? 0,
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
