const axios = require('axios');

const DEFAULT_SELECT_PAGE_SIZE = 1000;

function chunkValues(values, size = 150) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function extractMaterial(attributes = {}) {
  const direct = attributes.material;
  if (typeof direct === 'string' && direct.trim()) return direct.trim();

  const materials = attributes.materials;
  if (Array.isArray(materials)) {
    const first = materials.find((entry) => typeof entry === 'string' && entry.trim());
    if (typeof first === 'string') return first.trim();
  }

  return '';
}

function averageEstimate(row) {
  const min = row.estimated_public_price_min ?? null;
  const max = row.estimated_public_price_max ?? null;
  if (min != null && max != null) return (Number(min) + Number(max)) / 2;
  return Number(min ?? max ?? 0);
}

function resolveSupabaseConfig({ env = process.env, functionsConfig = {} } = {}) {
  const supabaseFunctionsConfig = functionsConfig.supabase ?? {};
  const url =
    env.SUPABASE_URL ??
    supabaseFunctionsConfig.url ??
    env.VITE_SUPABASE_URL ??
    '';
  const key =
    env.SUPABASE_SERVICE_ROLE_KEY ??
    env.SUPABASE_SERVICE_ROLE ??
    supabaseFunctionsConfig.service_role_key ??
    supabaseFunctionsConfig.service_role ??
    env.VITE_SUPABASE_ANON_KEY ??
    supabaseFunctionsConfig.anon_key ??
    '';

  if (!url || !key) return null;
  return { url, key };
}

function buildHeaders(config) {
  return {
    apikey: config.key,
    Authorization: `Bearer ${config.key}`,
    'Content-Type': 'application/json',
  };
}

function buildUrl(config, path, query) {
  const url = new URL(`${config.url.replace(/\/+$/, '')}/rest/v1/${path}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value != null) {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

function hasExplicitWindow(query = {}) {
  return query.limit != null || query.offset != null;
}

async function supabaseSelectPage(config, httpClient, path, query) {
  const response = await httpClient.request({
    method: 'GET',
    url: buildUrl(config, path, query),
    headers: buildHeaders(config),
    validateStatus: (status) => status >= 200 && status < 300,
  });

  return Array.isArray(response.data) ? response.data : [];
}

async function supabaseSelect(config, httpClient, path, query) {
  if (hasExplicitWindow(query)) {
    return supabaseSelectPage(config, httpClient, path, query);
  }

  const rows = [];
  let offset = 0;

  while (true) {
    const batch = await supabaseSelectPage(config, httpClient, path, {
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

async function supabaseCount(config, httpClient, path, query) {
  const response = await httpClient.request({
    method: 'HEAD',
    url: buildUrl(config, path, query),
    headers: {
      ...buildHeaders(config),
      Prefer: 'count=exact',
    },
    validateStatus: (status) => status >= 200 && status < 300,
  });

  const contentRange =
    response.headers?.['content-range'] ??
    response.headers?.['Content-Range'] ??
    '';
  const total = Number(String(contentRange).split('/')[1] ?? 0);
  return Number.isFinite(total) ? total : 0;
}

async function getPublishedItemIds(config, httpClient) {
  const rows = await supabaseSelect(config, httpClient, 'items', {
    select: 'id',
    review_status: 'eq.published',
    visibility: 'eq.public',
  });
  return rows.map((row) => row.id).filter(Boolean);
}

async function getPublishedWorth(config, httpClient, itemIds) {
  if (itemIds.length === 0) return 0;

  const profiles = [];
  for (const chunk of chunkValues(itemIds)) {
    const rows = await supabaseSelect(config, httpClient, 'numismatic_item_profiles', {
      select: 'item_id,estimated_public_price_min,estimated_public_price_max',
      item_id: `in.(${chunk.join(',')})`,
    });
    profiles.push(...rows);
  }

  return profiles.reduce((sum, row) => sum + averageEstimate(row), 0);
}

async function getArchiveStatsFromSupabase(config, httpClient) {
  const [items, collections, materialRows, publishedItemIds] = await Promise.all([
    supabaseCount(config, httpClient, 'items', {
      select: 'id',
      review_status: 'eq.published',
      visibility: 'eq.public',
    }),
    supabaseCount(config, httpClient, 'collections', {
      select: 'id',
    }),
    supabaseSelect(config, httpClient, 'items', {
      select: 'attributes',
      review_status: 'eq.published',
      visibility: 'eq.public',
    }),
    getPublishedItemIds(config, httpClient),
  ]);

  const materials = new Set(
    materialRows
      .map((row) => extractMaterial(row.attributes))
      .filter(Boolean),
  );

  return {
    items,
    collections,
    materials: materials.size,
    totalWorth: await getPublishedWorth(config, httpClient, publishedItemIds),
  };
}

function snapshotSize(snapshot) {
  if (typeof snapshot?.size === 'number') return snapshot.size;
  if (Array.isArray(snapshot?.docs)) return snapshot.docs.length;
  return 0;
}

async function getArchiveStatsFromFirestore(firestore) {
  const [collectionsSnap, itemsSnap] = await Promise.all([
    firestore.collection('collections').get(),
    firestore.collection('items').where('published', '==', true).get(),
  ]);

  const materials = new Set();
  let totalWorth = 0;

  collectionsSnap.forEach((docSnap) => {
    const data = docSnap.data() || {};
    totalWorth += Number(data.estimatedWorth ?? 0);
    const rowMaterials = Array.isArray(data.filterableMaterials) ? data.filterableMaterials : [];
    rowMaterials.forEach((material) => {
      if (typeof material === 'string' && material.trim()) {
        materials.add(material.trim());
      }
    });
  });

  return {
    items: snapshotSize(itemsSnap),
    collections: snapshotSize(collectionsSnap),
    materials: materials.size,
    totalWorth,
  };
}

async function getArchiveStats({
  env = process.env,
  functionsConfig = {},
  firestore,
  httpClient = axios,
} = {}) {
  const supabaseConfig = resolveSupabaseConfig({ env, functionsConfig });
  if (supabaseConfig) {
    return getArchiveStatsFromSupabase(supabaseConfig, httpClient);
  }

  return getArchiveStatsFromFirestore(firestore);
}

module.exports = {
  getArchiveStats,
  resolveSupabaseConfig,
  getArchiveStatsFromFirestore,
  getArchiveStatsFromSupabase,
};
