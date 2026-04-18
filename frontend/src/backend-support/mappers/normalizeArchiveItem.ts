import {
  ArchiveItemRow,
  ArchivePrivateItemProfileRow,
  archiveItemSchema,
  archivePrivateItemProfileSchema,
} from '../schemas/archive';
import { ItemRecord } from '@/entities/item/model/types';
import { MediaRecord } from '@/entities/media/model/types';

export function normalizeArchivePrivateItemProfile(input: ArchivePrivateItemProfileRow | null | undefined) {
  if (!input) return null;
  const row = archivePrivateItemProfileSchema.parse(input);
  return {
    yearBought: row.year_bought ?? null,
    purchasePrice: row.purchase_price ?? null,
    purchaseCurrency: row.purchase_currency ?? null,
    estimatedValueMin: row.estimated_value_min ?? null,
    estimatedValueMax: row.estimated_value_max ?? null,
    estimatedValueAvg: row.estimated_value_avg ?? null,
    acquisitionSource: row.acquisition_source ?? null,
    acquisitionDate: row.acquisition_date ?? null,
    internalNotes: row.internal_notes ?? null,
    privateTags: row.private_tags ?? [],
    privateAttributes: row.private_attributes ?? {},
  };
}

export function normalizeArchiveItem(
  input: ArchiveItemRow,
  options?: {
    collectionSlug?: string;
    collectionName?: string;
    privateProfile?: ArchivePrivateItemProfileRow | null;
    media?: MediaRecord[];
    numismaticProfile?: {
      estimated_public_price_min?: number | null;
      estimated_public_price_max?: number | null;
    } | null;
  },
): ItemRecord {
  const row = archiveItemSchema.parse(input);
  const attributes = row.attributes ?? {};
  const media = options?.media ?? [];
  const primaryMedia = media[0] ?? null;
  const estimatedPriceMin = Number(options?.numismaticProfile?.estimated_public_price_min ?? 0) || 0;
  const estimatedPriceMax = Number(options?.numismaticProfile?.estimated_public_price_max ?? 0) || 0;
  const estimatedPriceAvg = estimatedPriceMin && estimatedPriceMax
    ? Math.round((estimatedPriceMin + estimatedPriceMax) / 2)
    : estimatedPriceMax || estimatedPriceMin || 0;
  const tags = Array.isArray(attributes.tags) ? (attributes.tags as string[]) : [];
  const publicTags = Array.isArray(attributes.publicTags) ? (attributes.publicTags as string[]) : [];
  const entityBadges = Array.isArray(attributes.entityBadges) ? (attributes.entityBadges as string[]) : [];
  const searchKeywords = Array.from(new Set([
    ...tags,
    ...publicTags,
    ...entityBadges,
    String(attributes.rulerOrIssuer ?? ''),
    String(attributes.mintOrPlace ?? ''),
    String(attributes.denomination ?? ''),
    String(attributes.seriesOrCatalog ?? ''),
    row.title,
    row.subtitle ?? '',
  ].map((value) => String(value).trim()).filter(Boolean)));
  const searchText = [
    row.title,
    row.subtitle ?? '',
    row.description ?? '',
    row.short_description ?? '',
    row.display_date ?? '',
    String(attributes.culture ?? ''),
    String(attributes.location ?? ''),
    ...searchKeywords,
  ]
    .filter(Boolean)
    .join(' ');

  return {
    id: row.id,
    canonicalId: row.canonical_id,
    domainId: row.domain_id,
    domainSlug: '',
    collectionId: row.collection_id,
    collectionSlug: options?.collectionSlug ?? '',
    collectionName: options?.collectionName ?? '',
    title: row.title,
    subtitle: row.subtitle ?? '',
    period: row.era_label ?? '',
    dateText: row.display_date ?? '',
    culture: String(attributes.culture ?? ''),
    location: String(attributes.location ?? ''),
    description: row.description ?? '',
    shortDescription: row.short_description ?? row.description ?? '',
    imageUrl: primaryMedia?.downloadUrl || row.primary_image_path || '',
    imageAlt: row.primary_image_alt ?? row.title,
    primaryMedia,
    gallery: media,
    materials: Array.isArray(attributes.materials) ? (attributes.materials as string[]) : [],
    tags,
    publicTags,
    entityBadges,
    relatedReasons: Array.isArray(attributes.relatedReasons) ? (attributes.relatedReasons as string[]) : [],
    notes: Array.isArray(attributes.notes) ? (attributes.notes as string[]) : [],
    pageNumber: row.source_page_number ?? 0,
    searchText,
    searchKeywords,
    denominationSystem: String(attributes.denominationSystem ?? ''),
    denominationKey: attributes.denominationKey == null ? null : String(attributes.denominationKey),
    denominationRank: Number(attributes.denominationRank ?? 0),
    denominationBaseValue: attributes.denominationBaseValue == null ? null : Number(attributes.denominationBaseValue),
    sortYearStart: row.sort_year_start ?? row.date_start ?? 0,
    sortYearEnd: row.sort_year_end ?? row.date_end ?? null,
    estimatedPriceMin,
    estimatedPriceMax,
    estimatedPriceAvg,
    weightGrams: attributes.weightGrams == null ? null : Number(attributes.weightGrams),
    sortYear: row.sort_year_start ?? row.date_start ?? 0,
    importedAt: undefined,
    updatedAt: undefined,
    metadata: {
      type: row.item_type,
      denomination: attributes.denomination == null ? undefined : String(attributes.denomination),
      rulerOrIssuer: attributes.rulerOrIssuer == null ? undefined : String(attributes.rulerOrIssuer),
      mintOrPlace: attributes.mintOrPlace == null ? undefined : String(attributes.mintOrPlace),
      seriesOrCatalog: attributes.seriesOrCatalog == null ? undefined : String(attributes.seriesOrCatalog),
      weightEstimate: attributes.weightEstimate == null ? undefined : String(attributes.weightEstimate),
      condition: attributes.condition == null ? undefined : String(attributes.condition),
      estimatedPriceInr: estimatedPriceAvg ? String(estimatedPriceAvg) : undefined,
      confidence: attributes.confidence == null ? undefined : String(attributes.confidence),
    },
    visibility: row.visibility,
    reviewStatus: row.review_status,
    itemType: row.item_type,
    privateProfile: normalizeArchivePrivateItemProfile(options?.privateProfile),
  };
}
