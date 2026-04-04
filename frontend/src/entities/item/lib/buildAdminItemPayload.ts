import { ItemRecord } from '@/entities/item/model/types';
import { resolveDenomination } from '@/shared/config/denominations';
import {
  buildCanonicalKeywords,
  buildCanonicalTags,
  canonicalizeMint,
  canonicalizeRulerOrIssuer,
} from '@/shared/lib/catalogNormalization';
import { deriveWeightGrams, deriveYearRange } from '@/backend-support/mappers/normalizeItem';

export type AdminItemPayloadInput = {
  title: string;
  subtitle: string;
  description: string;
  shortDescription: string;
  period: string;
  dateText: string;
  culture: string;
  location: string;
  imageUrl: string;
  imageAlt: string;
  materials: string[];
  tags: string[];
  notes: string[];
  collectionId: string;
  collectionSlug: string;
  collectionName: string;
  metadata: ItemRecord['metadata'];
};

function normalizeText(value?: string | null) {
  return String(value ?? '').trim();
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => normalizeText(value)).filter(Boolean)));
}

function deriveAdminPriceRange(value?: string | null) {
  const matches = Array.from(
    String(value ?? '').toLowerCase().matchAll(/(\d[\d,]*(?:\.\d+)?)\s*(lakh|lac|crore|cr)?/g),
  )
    .map((match) => {
      const numeric = Number(match[1].replace(/,/g, ''));
      if (!Number.isFinite(numeric) || numeric <= 0) return null;
      const unit = match[2] ?? '';
      const multiplier =
        unit === 'lakh' || unit === 'lac' ? 100000
          : unit === 'crore' || unit === 'cr' ? 10000000
            : 1;
      return numeric * multiplier;
    })
    .filter((entry): entry is number => entry != null && Number.isFinite(entry) && entry > 0);

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

export function buildAdminItemPayload(data: AdminItemPayloadInput) {
  const metadata = data.metadata ?? {};
  const materials = uniqueStrings(data.materials);
  const notes = uniqueStrings(data.notes);
  const canonicalRuler = canonicalizeRulerOrIssuer(metadata.rulerOrIssuer);
  const canonicalMint = canonicalizeMint(metadata.mintOrPlace || data.location);
  const canonicalTags = buildCanonicalTags({
    culture: data.culture || data.collectionName,
    rulerOrIssuer: canonicalRuler || metadata.rulerOrIssuer,
    denomination: metadata.denomination,
    mintOrPlace: canonicalMint || metadata.mintOrPlace || data.location,
    materials,
  });
  const tags = uniqueStrings([...data.tags, ...canonicalTags]);
  if (canonicalRuler && !tags.includes(canonicalRuler)) {
    tags.push(canonicalRuler);
  }
  const searchFields = uniqueStrings([
    data.title,
    data.subtitle,
    data.description,
    data.shortDescription,
    data.period,
    data.dateText,
    data.culture,
    data.location,
    metadata.denomination,
    canonicalRuler || metadata.rulerOrIssuer,
    canonicalMint || metadata.mintOrPlace,
    metadata.seriesOrCatalog,
    ...materials,
    ...tags,
    ...notes,
  ]);
  const denomination = resolveDenomination(metadata.denomination);
  const yearRange = deriveYearRange(data.dateText || data.period);
  const priceRange = deriveAdminPriceRange(metadata.estimatedPriceInr);

  return {
    ...data,
    location: canonicalMint || data.location,
    materials,
    tags,
    notes,
    searchText: searchFields.join(' ').toLowerCase(),
    searchKeywords: buildCanonicalKeywords(searchFields),
    metadata: {
      ...metadata,
      rulerOrIssuer: canonicalRuler || metadata.rulerOrIssuer,
      mintOrPlace: canonicalMint || metadata.mintOrPlace,
    },
    denominationSystem: 'shared-indic',
    denominationKey: denomination?.key ?? null,
    denominationRank: denomination?.rank ?? 9999,
    denominationBaseValue: denomination?.baseValue ?? null,
    sortYearStart: yearRange.sortYearStart,
    sortYearEnd: yearRange.sortYearEnd,
    estimatedPriceMin: priceRange.estimatedPriceMin,
    estimatedPriceMax: priceRange.estimatedPriceMax,
    estimatedPriceAvg: priceRange.estimatedPriceAvg,
    weightGrams: deriveWeightGrams(metadata.weightEstimate),
    sortYear: yearRange.sortYearStart,
  };
}
