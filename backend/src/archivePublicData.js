const axios = require('axios');

const { resolveSupabaseConfig } = require('./archiveStats');

const DEFAULT_SELECT_PAGE_SIZE = 1000;
const COLLECTION_SELECT =
  'id,canonical_id,slug,title,subtitle,description,long_description,era_label,country_code,cover_image_path,status,sort_order,domain_id';
const ITEM_SELECT =
  'id,canonical_id,collection_id,domain_id,conceptual_item_id,item_type,slug,title,subtitle,description,short_description,era_label,date_start,date_end,display_date,country_code,primary_image_path,primary_image_alt,attributes,sort_title,sort_year_start,sort_year_end,review_status,visibility,source_page_number,source_page_label,source_batch,source_reference';

function buildHeaders(config) {
  return {
    apikey: config.key,
    Authorization: `Bearer ${config.key}`,
    'Content-Type': 'application/json',
  };
}

function buildUrl(config, path, query) {
  const url = new URL(`${config.url.replace(/\/+$/, '')}/rest/v1/${path}`);
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value != null) {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

function hasExplicitWindow(query = {}) {
  return query.limit != null || query.offset != null;
}

async function supabaseSelectPage(config, httpClient, routePath, query) {
  const response = await httpClient.request({
    method: 'GET',
    url: buildUrl(config, routePath, query),
    headers: buildHeaders(config),
    validateStatus: (status) => status >= 200 && status < 300,
  });

  return Array.isArray(response.data) ? response.data : [];
}

async function supabaseSelect(config, httpClient, routePath, query) {
  if (hasExplicitWindow(query)) {
    return supabaseSelectPage(config, httpClient, routePath, query);
  }

  const rows = [];
  let offset = 0;
  while (true) {
    const batch = await supabaseSelectPage(config, httpClient, routePath, {
      ...(query ?? {}),
      limit: DEFAULT_SELECT_PAGE_SIZE,
      offset,
    });
    rows.push(...batch);
    if (batch.length < DEFAULT_SELECT_PAGE_SIZE) break;
    offset += DEFAULT_SELECT_PAGE_SIZE;
  }

  return rows;
}

async function supabaseMaybeSingle(config, httpClient, routePath, query) {
  const rows = await supabaseSelect(config, httpClient, routePath, {
    ...(query ?? {}),
    limit: 1,
  });
  return rows[0] ?? null;
}

function averageEstimate(row) {
  const min = row.estimated_public_price_min ?? null;
  const max = row.estimated_public_price_max ?? null;
  if (min != null && max != null) return (Number(min) + Number(max)) / 2;
  return Number(min ?? max ?? 0);
}

function chunkValues(values, size = 150) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function asStringArray(value) {
  return Array.isArray(value) ? value.map((entry) => String(entry).trim()).filter(Boolean) : [];
}

async function getNumismaticProfileMap(config, httpClient, itemIds) {
  const ids = Array.from(new Set(itemIds.filter(Boolean)));
  const rows = [];

  for (const chunk of chunkValues(ids)) {
    const chunkRows = await supabaseSelect(config, httpClient, 'numismatic_item_profiles', {
      select: 'item_id,estimated_public_price_min,estimated_public_price_max',
      item_id: `in.(${chunk.join(',')})`,
    });
    rows.push(...chunkRows);
  }

  return new Map(rows.map((row) => [row.item_id, row]));
}

async function getMediaMap(config, httpClient, itemIds) {
  const ids = Array.from(new Set(itemIds.filter(Boolean)));
  const rows = [];

  for (const chunk of chunkValues(ids)) {
    const chunkRows = await supabaseSelect(config, httpClient, 'media_assets', {
      select: 'target_id,storage_path,public_url,asset_role,alt_text,caption,sort_order',
      target_kind: 'eq.item',
      target_id: `in.(${chunk.join(',')})`,
      order: 'sort_order.asc',
    });
    rows.push(...chunkRows);
  }

  const mediaMap = new Map();
  rows.forEach((row) => {
    const media = {
      gsUrl: typeof row.storage_path === 'string' && row.storage_path.startsWith('gs://') ? row.storage_path : '',
      storagePath: row.storage_path,
      downloadUrl: row.public_url ?? row.storage_path,
      alt: row.alt_text ?? '',
      caption: row.caption ?? undefined,
    };
    const existing = mediaMap.get(row.target_id) ?? [];
    existing.push(media);
    mediaMap.set(row.target_id, existing);
  });

  return mediaMap;
}

function normalizeCollection(row, options = {}) {
  return {
    id: row.id,
    canonicalId: row.canonical_id,
    slug: row.slug,
    name: row.title,
    displayName: row.title,
    description: row.description,
    longDescription: row.long_description ?? row.description,
    heroEyebrow: row.era_label ?? '',
    culture: row.country_code ?? 'IN',
    periodLabel: row.era_label ?? '',
    sourceUrl: '',
    heroImage: row.cover_image_path ?? '',
    thumbnailImage: row.cover_image_path ?? '',
    itemCount: options.itemCount ?? 0,
    filterableMaterials: options.filterableMaterials ?? [],
    estimatedWorth: Math.round(options.estimatedWorth ?? 0),
    sortOrder: row.sort_order,
    status: row.status,
    enabled: row.status !== 'archived',
    lastSyncedAt: null,
    domainId: row.domain_id ?? '',
    domainSlug: '',
    domainName: '',
  };
}

function normalizeItem(row, options = {}) {
  const attributes = row.attributes ?? {};
  const media = options.media ?? [];
  const primaryMedia = media[0] ?? null;
  const min = Number(options.numismaticProfile?.estimated_public_price_min ?? 0) || 0;
  const max = Number(options.numismaticProfile?.estimated_public_price_max ?? 0) || 0;
  const avg = min && max ? Math.round((min + max) / 2) : max || min || 0;
  const tags = asStringArray(attributes.tags);
  const publicTags = asStringArray(attributes.publicTags);
  const entityBadges = asStringArray(attributes.entityBadges);
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

  return {
    id: row.id,
    canonicalId: row.canonical_id,
    domainId: row.domain_id,
    domainSlug: '',
    collectionId: row.collection_id,
    collectionSlug: options.collectionSlug ?? '',
    collectionName: options.collectionName ?? '',
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
    materials: asStringArray(attributes.materials),
    tags,
    publicTags,
    entityBadges,
    relatedReasons: asStringArray(attributes.relatedReasons),
    notes: asStringArray(attributes.notes),
    pageNumber: row.source_page_number ?? 0,
    searchText: [
      row.title,
      row.subtitle ?? '',
      row.description ?? '',
      row.short_description ?? '',
      row.display_date ?? '',
      String(attributes.culture ?? ''),
      String(attributes.location ?? ''),
      ...searchKeywords,
    ].filter(Boolean).join(' '),
    searchKeywords,
    denominationSystem: String(attributes.denominationSystem ?? ''),
    denominationKey: attributes.denominationKey == null ? null : String(attributes.denominationKey),
    denominationRank: Number(attributes.denominationRank ?? 0),
    denominationBaseValue: attributes.denominationBaseValue == null ? null : Number(attributes.denominationBaseValue),
    sortYearStart: row.sort_year_start ?? row.date_start ?? 0,
    sortYearEnd: row.sort_year_end ?? row.date_end ?? null,
    estimatedPriceMin: min,
    estimatedPriceMax: max,
    estimatedPriceAvg: avg,
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
      estimatedPriceInr: avg ? String(avg) : undefined,
      confidence: attributes.confidence == null ? undefined : String(attributes.confidence),
    },
    visibility: row.visibility,
    reviewStatus: row.review_status,
    itemType: row.item_type,
  };
}

async function getCollectionAggregateRows(config, httpClient, collectionId) {
  const rows = await supabaseSelect(config, httpClient, 'items', {
    select: 'id,collection_id,attributes',
    collection_id: `eq.${collectionId}`,
    review_status: 'eq.published',
    visibility: 'eq.public',
  });

  const numismaticProfileMap = await getNumismaticProfileMap(config, httpClient, rows.map((row) => row.id));
  const materials = new Set();
  let estimatedWorth = 0;

  rows.forEach((row) => {
    asStringArray(row.attributes?.materials).forEach((material) => materials.add(material));
    const directMaterial = row.attributes?.material;
    if (directMaterial != null && String(directMaterial).trim()) {
      materials.add(String(directMaterial).trim());
    }
    estimatedWorth += averageEstimate(numismaticProfileMap.get(row.id) ?? {});
  });

  return {
    itemCount: rows.length,
    filterableMaterials: Array.from(materials).sort((left, right) => left.localeCompare(right)),
    estimatedWorth,
  };
}

function requireSupabaseConfig(options) {
  const config = resolveSupabaseConfig({ env: options.env, functionsConfig: options.functionsConfig });
  if (!config) {
    throw new Error('Supabase archive configuration is required for public archive data.');
  }
  return config;
}

async function getPublishedCollectionRow(config, httpClient, slug) {
  return supabaseMaybeSingle(config, httpClient, 'collections', {
    select: COLLECTION_SELECT,
    slug: `eq.${slug}`,
    status: 'eq.published',
  });
}

async function getPublicCollections({
  env = process.env,
  functionsConfig = {},
  httpClient = axios,
} = {}) {
  const config = requireSupabaseConfig({ env, functionsConfig });
  const rows = await supabaseSelect(config, httpClient, 'collections', {
    select: COLLECTION_SELECT,
    status: 'eq.published',
    order: 'sort_order.asc',
  });

  const collections = [];
  for (const row of rows) {
    const aggregates = await getCollectionAggregateRows(config, httpClient, row.id);
    collections.push(normalizeCollection(row, aggregates));
  }

  return collections;
}

async function getPublicCollectionBySlug({
  env = process.env,
  functionsConfig = {},
  httpClient = axios,
  slug,
} = {}) {
  const config = requireSupabaseConfig({ env, functionsConfig });
  const row = await getPublishedCollectionRow(config, httpClient, slug);
  if (!row) return null;
  const aggregates = await getCollectionAggregateRows(config, httpClient, row.id);
  return normalizeCollection(row, aggregates);
}

async function getPublicItemsByCollectionSlug({
  env = process.env,
  functionsConfig = {},
  httpClient = axios,
  slug,
} = {}) {
  const config = requireSupabaseConfig({ env, functionsConfig });
  const collection = await getPublishedCollectionRow(config, httpClient, slug);
  if (!collection) return null;

  const rows = await supabaseSelect(config, httpClient, 'items', {
    select: ITEM_SELECT,
    collection_id: `eq.${collection.id}`,
    review_status: 'eq.published',
    visibility: 'eq.public',
    order: 'source_page_number.asc',
  });
  const [mediaMap, numismaticProfileMap] = await Promise.all([
    getMediaMap(config, httpClient, rows.map((row) => row.id)),
    getNumismaticProfileMap(config, httpClient, rows.map((row) => row.id)),
  ]);

  return rows.map((row) => normalizeItem(row, {
    collectionSlug: collection.slug,
    collectionName: collection.title,
    media: mediaMap.get(row.id) ?? [],
    numismaticProfile: numismaticProfileMap.get(row.id) ?? null,
  }));
}

module.exports = {
  getPublicCollections,
  getPublicCollectionBySlug,
  getPublicItemsByCollectionSlug,
};
