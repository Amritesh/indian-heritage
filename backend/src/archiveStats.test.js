const test = require('node:test');
const assert = require('node:assert/strict');

const { getArchiveStats } = require('./archiveStats');

function createFirestoreSnapshot(rows) {
  return {
    size: rows.length,
    docs: rows.map((data, index) => ({
      id: `doc-${index}`,
      data: () => data,
    })),
    forEach(callback) {
      this.docs.forEach(callback);
    },
  };
}

test('getArchiveStats prefers Supabase when server config is available', async () => {
  const calls = [];
  const httpClient = {
    async request(options) {
      calls.push({ method: options.method, url: options.url });

      if (options.method === 'HEAD' && options.url.includes('/rest/v1/items?')) {
        return {
          status: 200,
          headers: { 'content-range': '0-0/2' },
          data: null,
        };
      }

      if (options.method === 'HEAD' && options.url.includes('/rest/v1/collections?')) {
        return {
          status: 200,
          headers: { 'content-range': '0-0/3' },
          data: null,
        };
      }

      if (options.url.includes('/rest/v1/items?') && options.url.includes('select=attributes')) {
        return {
          status: 200,
          data: [
            { attributes: { material: 'Silver' } },
            { attributes: { materials: ['Gold', 'Silver'] } },
          ],
        };
      }

      if (options.url.includes('/rest/v1/items?') && options.url.includes('select=id')) {
        return {
          status: 200,
          data: [{ id: 'item-1' }, { id: 'item-2' }],
        };
      }

      if (options.url.includes('/rest/v1/numismatic_item_profiles?')) {
        return {
          status: 200,
          data: [
            { item_id: 'item-1', estimated_public_price_min: 100, estimated_public_price_max: 150 },
            { item_id: 'item-2', estimated_public_price_min: 50, estimated_public_price_max: null },
          ],
        };
      }

      throw new Error(`Unhandled request: ${options.method} ${options.url}`);
    },
  };

  const stats = await getArchiveStats({
    env: {
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
    },
    functionsConfig: {},
    httpClient,
    firestore: {
      collection() {
        throw new Error('Firestore fallback should not be used when Supabase is configured');
      },
    },
  });

  assert.deepEqual(stats, {
    items: 2,
    collections: 3,
    materials: 2,
    totalWorth: 175,
  });
  assert.equal(
    calls.some((entry) => entry.url.includes('/rest/v1/numismatic_item_profiles?')),
    true,
  );
});

test('getArchiveStats rejects when Supabase server config is missing', async () => {
  await assert.rejects(
    () => getArchiveStats({
      env: {},
      functionsConfig: {},
      httpClient: {
        async request() {
          throw new Error('Supabase HTTP client should not be used without config');
        },
      },
      firestore: {
        collection() {
          throw new Error('Firestore fallback should not be used');
        },
      },
    }),
    /Supabase archive configuration is required/i,
  );
});
