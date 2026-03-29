import { MediaRecord } from '@/entities/media/model/types';

export type ItemRecord = {
  id: string;
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
  notes: string[];
  pageNumber: number;
  searchText: string;
  searchKeywords: string[];
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
};

export type ItemSort = 'featured' | 'title' | 'recent';

export type CollectionItemQuery = {
  collectionSlug: string;
  limit?: number;
  sort?: ItemSort;
  material?: string;
  search?: string;
};
