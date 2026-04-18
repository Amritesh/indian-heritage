import { z } from 'zod';

const stringLikeSchema = z.union([z.string(), z.number()]).transform((value) => String(value));

export const rawItemMetadataSchema = z.object({
  condition: stringLikeSchema.optional().default(''),
  confidence: stringLikeSchema.optional().default(''),
  denomination: stringLikeSchema.optional().default(''),
  estimated_price_inr: stringLikeSchema.optional().default(''),
  material: stringLikeSchema.optional().default(''),
  mint_or_place: stringLikeSchema.optional().default(''),
  ruler_or_issuer: stringLikeSchema.optional().default(''),
  series_or_catalog: stringLikeSchema.optional().default(''),
  type: stringLikeSchema.optional().default(''),
  weight_estimate: stringLikeSchema.optional().default(''),
  year_or_period: stringLikeSchema.optional().default(''),
});

export const rawItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional().default(''),
  image: z.string().optional().default(''),
  notes: z.array(z.string()).optional().default([]),
  period: z.string().optional().default(''),
  region: z.string().optional().default(''),
  materials: z.array(z.string()).optional().default([]),
  display_labels: z.array(z.string()).optional().default([]),
  metadata: rawItemMetadataSchema.optional().default({}),
  page: z.number().optional().default(0),
});

export const rawCollectionSchema = z.object({
  itemCollection: z.object({
    album_title: z.string(),
    items: z.array(rawItemSchema),
  }),
});

export type RawItem = z.infer<typeof rawItemSchema>;
export type RawCollectionResponse = z.infer<typeof rawCollectionSchema>;
