import {
  ArchiveItemRow,
  ArchivePrivateItemProfileRow,
  archiveItemSchema,
  archivePrivateItemProfileSchema,
} from '../schemas/archive';
import { ItemRecord } from '@/entities/item/model/types';

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
  },
): ItemRecord {
  const row = archiveItemSchema.parse(input);
  const attributes = row.attributes ?? {};

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
    imageUrl: row.primary_image_path ?? '',
    imageAlt: row.primary_image_alt ?? row.title,
    primaryMedia: null,
    gallery: [],
    materials: Array.isArray(attributes.materials) ? (attributes.materials as string[]) : [],
    tags: Array.isArray(attributes.tags) ? (attributes.tags as string[]) : [],
    publicTags: Array.isArray(attributes.publicTags) ? (attributes.publicTags as string[]) : [],
    entityBadges: Array.isArray(attributes.entityBadges) ? (attributes.entityBadges as string[]) : [],
    relatedReasons: Array.isArray(attributes.relatedReasons) ? (attributes.relatedReasons as string[]) : [],
    notes: Array.isArray(attributes.notes) ? (attributes.notes as string[]) : [],
    pageNumber: row.source_page_number ?? 0,
    searchText: '',
    searchKeywords: [],
    denominationSystem: String(attributes.denominationSystem ?? ''),
    denominationKey: attributes.denominationKey == null ? null : String(attributes.denominationKey),
    denominationRank: Number(attributes.denominationRank ?? 0),
    denominationBaseValue: attributes.denominationBaseValue == null ? null : Number(attributes.denominationBaseValue),
    sortYearStart: row.sort_year_start ?? row.date_start ?? 0,
    sortYearEnd: row.sort_year_end ?? row.date_end ?? null,
    estimatedPriceMin: 0,
    estimatedPriceMax: 0,
    estimatedPriceAvg: 0,
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
      estimatedPriceInr: undefined,
      confidence: attributes.confidence == null ? undefined : String(attributes.confidence),
    },
    visibility: row.visibility,
    reviewStatus: row.review_status,
    itemType: row.item_type,
    privateProfile: normalizeArchivePrivateItemProfile(options?.privateProfile),
  };
}
