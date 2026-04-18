import { z } from 'zod';

export const archiveDomainSchema = z.object({
  id: z.string(),
  canonical_id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  sort_order: z.number().optional().default(0),
  hero_image_path: z.string().nullish(),
});

export const archiveCategorySchema = z.object({
  id: z.string(),
  canonical_id: z.string(),
  slug: z.string(),
  title: z.string(),
  summary: z.string().nullish(),
  hero_image_path: z.string().nullish(),
  item_count: z.number().optional().default(0),
  status: z.string(),
  page_type: z.string(),
  source_kind: z.string(),
});

export const archiveCollectionSchema = z.object({
  id: z.string(),
  canonical_id: z.string(),
  slug: z.string(),
  title: z.string(),
  subtitle: z.string().nullish(),
  description: z.string(),
  long_description: z.string().nullish(),
  era_label: z.string().nullish(),
  country_code: z.string().nullish(),
  cover_image_path: z.string().nullish(),
  status: z.string(),
  sort_order: z.number().optional().default(0),
  domain_id: z.string().nullish(),
});

export const archiveItemSchema = z.object({
  id: z.string(),
  canonical_id: z.string(),
  collection_id: z.string(),
  domain_id: z.string(),
  conceptual_item_id: z.string().nullish(),
  item_type: z.string(),
  title: z.string(),
  subtitle: z.string().nullish(),
  description: z.string().nullish(),
  short_description: z.string().nullish(),
  era_label: z.string().nullish(),
  date_start: z.number().nullish(),
  date_end: z.number().nullish(),
  display_date: z.string().nullish(),
  country_code: z.string().nullish(),
  primary_image_path: z.string().nullish(),
  primary_image_alt: z.string().nullish(),
  attributes: z.record(z.string(), z.unknown()).optional().default({}),
  sort_title: z.string().nullish(),
  sort_year_start: z.number().nullish(),
  sort_year_end: z.number().nullish(),
  review_status: z.string(),
  visibility: z.string(),
  source_page_number: z.number().nullish(),
  source_page_label: z.string().nullish(),
  source_batch: z.string().nullish(),
  source_reference: z.string().nullish(),
});

export const archivePrivateItemProfileSchema = z.object({
  id: z.string(),
  item_id: z.string(),
  owner_user_id: z.string(),
  year_bought: z.number().nullish(),
  purchase_price: z.number().nullish(),
  purchase_currency: z.string().nullish(),
  estimated_value_min: z.number().nullish(),
  estimated_value_max: z.number().nullish(),
  estimated_value_avg: z.number().nullish(),
  acquisition_source: z.string().nullish(),
  acquisition_date: z.string().nullish(),
  internal_notes: z.string().nullish(),
  private_tags: z.array(z.string()).optional().default([]),
  private_attributes: z.record(z.string(), z.unknown()).optional().default({}),
});

export type ArchiveDomainRow = z.infer<typeof archiveDomainSchema>;
export type ArchiveCategoryRow = z.infer<typeof archiveCategorySchema>;
export type ArchiveCollectionRow = z.infer<typeof archiveCollectionSchema>;
export type ArchiveItemRow = z.infer<typeof archiveItemSchema>;
export type ArchivePrivateItemProfileRow = z.infer<typeof archivePrivateItemProfileSchema>;
