import { MediaRecord } from '@/entities/media/model/types';

export type ItemRecord = {
  id: string;
  canonicalId?: string;
  domainId?: string;
  domainSlug?: string;
  collectionId: string;
  collectionSlug: string;
  collectionName: string;
  title: string;
  subtitle: string;
  period: string;
  dateText: string;
  culture: string;
  location: string;
  description: string;
  shortDescription: string;
  imageUrl: string;
  imageAlt: string;
  primaryMedia: MediaRecord | null;
  gallery: MediaRecord[];
  materials: string[];
  tags: string[];
  publicTags?: string[];
  entityBadges?: string[];
  relatedReasons?: string[];
  notes: string[];
  pageNumber: number;
  searchText: string;
  searchKeywords: string[];
  denominationSystem: string;
  denominationKey: string | null;
  denominationRank: number;
  denominationBaseValue: number | null;
  sortYearStart: number;
  sortYearEnd: number | null;
  estimatedPriceMin: number;
  estimatedPriceMax: number;
  estimatedPriceAvg: number;
  weightGrams: number | null;
  sortYear: number;
  importedAt?: string;
  updatedAt?: string;
  metadata: {
    type?: string;
    denomination?: string;
    rulerOrIssuer?: string;
    mintOrPlace?: string;
    seriesOrCatalog?: string;
    weightEstimate?: string;
    condition?: string;
    estimatedPriceInr?: string;
    confidence?: string;
  };
  visibility?: string;
  reviewStatus?: string;
  itemType?: string;
  privateProfile?: {
    yearBought?: number | null;
    purchasePrice?: number | null;
    purchaseCurrency?: string | null;
    estimatedValueMin?: number | null;
    estimatedValueMax?: number | null;
    estimatedValueAvg?: number | null;
    acquisitionSource?: string | null;
    acquisitionDate?: string | null;
    internalNotes?: string | null;
    privateTags?: string[];
    privateAttributes?: Record<string, unknown>;
  } | null;
};

export type ItemSort =
  | 'featured'
  | 'title'
  | 'recent'
  | 'price_asc'
  | 'price_desc'
  | 'year_asc'
  | 'year_desc'
  | 'denomination_asc';

export type CollectionItemQuery = {
  collectionSlug: string;
  limit?: number;
  sort?: ItemSort;
  search?: string;
  tag?: string;
};
