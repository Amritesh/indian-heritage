const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getPublicCollections,
  getPublicCollectionBySlug,
  getPublicItemsByCollectionSlug,
} = require('./archivePublicData');

function createHttpClient() {
  return {
    async request(options) {
      const url = decodeURIComponent(options.url);

      if (url.includes('/rest/v1/collections?') && url.includes('slug=eq.mughals')) {
        return {
          status: 200,
          data: [
            {
              id: 'collection-1',
              canonical_id: 'ahg:collection:coins:mughals',
              slug: 'mughals',
              title: 'Mughals',
              subtitle: null,
              description: 'Imperial coinage',
              long_description: 'Imperial coinage',
              era_label: 'c. 1613 to 1619',
              country_code: 'IN',
              cover_image_path: 'images/mughals/cover.png',
              status: 'published',
              sort_order: 2,
              domain_id: 'domain-1',
            },
          ],
        };
      }

      if (url.includes('/rest/v1/collections?') && url.includes('status=eq.published')) {
        return {
          status: 200,
          data: [
            {
              id: 'collection-1',
              canonical_id: 'ahg:collection:coins:mughals',
              slug: 'mughals',
              title: 'Mughals',
              subtitle: null,
              description: 'Imperial coinage',
              long_description: 'Imperial coinage',
              era_label: 'c. 1613 to 1619',
              country_code: 'IN',
              cover_image_path: 'images/mughals/cover.png',
              status: 'published',
              sort_order: 2,
              domain_id: 'domain-1',
            },
          ],
        };
      }

      if (url.includes('/rest/v1/items?') && url.includes('collection_id=eq.collection-1')) {
        return {
          status: 200,
          data: [
            {
              id: 'item-1',
              canonical_id: 'ahg:item:coin:mughals:1',
              collection_id: 'collection-1',
              domain_id: 'domain-1',
              conceptual_item_id: 'concept-1',
              item_type: 'coin',
              slug: 'item-1',
              title: 'Silver Rupee',
              subtitle: 'Jahangir',
              description: 'Imperial silver rupee',
              short_description: 'Imperial silver rupee',
              era_label: 'AH 1028 / 1618-1619 AD',
              date_start: 1618,
              date_end: 1619,
              display_date: 'AH 1028 / 1618-1619 AD',
              country_code: 'IN',
              primary_image_path: 'images/mughals/item-1.png',
              primary_image_alt: 'Silver Rupee',
              attributes: {
                culture: 'Mughal Empire',
                location: 'Patna',
                denomination: 'Rupee',
                denominationRank: 1,
                tags: ['silver'],
                publicTags: ['Mughals'],
                entityBadges: ['Jahangir'],
                materials: ['Silver'],
              },
              sort_title: 'silver rupee',
              sort_year_start: 1618,
              sort_year_end: 1619,
              review_status: 'published',
              visibility: 'public',
              source_page_number: 1,
              source_page_label: 'page-1',
              source_batch: 'mughals-1',
              source_reference: 'page-1',
            },
          ],
        };
      }

      if (url.includes('/rest/v1/media_assets?') && url.includes('target_id=in.(item-1)')) {
        return {
          status: 200,
          data: [
            {
              target_id: 'item-1',
              storage_path: 'gs://indian-heritage-gallery-bucket/images/mughals/item-1.png',
              public_url: 'https://example.com/item-1.png',
              asset_role: 'primary',
              alt_text: 'Silver Rupee',
              caption: 'Imperial silver rupee',
              sort_order: 0,
            },
          ],
        };
      }

      if (url.includes('/rest/v1/numismatic_item_profiles?') && url.includes('item_id=in.(item-1)')) {
        return {
          status: 200,
          data: [
            {
              item_id: 'item-1',
              estimated_public_price_min: 1000,
              estimated_public_price_max: 1500,
            },
          ],
        };
      }

      throw new Error(`Unhandled request: ${options.method} ${options.url}`);
    },
  };
}

test('getPublicCollections returns published collections from Supabase', async () => {
  const collections = await getPublicCollections({
    env: {
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
    },
    functionsConfig: {},
    httpClient: createHttpClient(),
  });

  assert.equal(collections.length, 1);
  assert.equal(collections[0].slug, 'mughals');
  assert.equal(collections[0].itemCount, 1);
});

test('getPublicCollectionBySlug returns one published collection from Supabase', async () => {
  const collection = await getPublicCollectionBySlug({
    env: {
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
    },
    functionsConfig: {},
    httpClient: createHttpClient(),
    slug: 'mughals',
  });

  assert.equal(collection.slug, 'mughals');
  assert.equal(collection.estimatedWorth, 1250);
});

test('getPublicItemsByCollectionSlug returns published public items from Supabase', async () => {
  const items = await getPublicItemsByCollectionSlug({
    env: {
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
    },
    functionsConfig: {},
    httpClient: createHttpClient(),
    slug: 'mughals',
  });

  assert.equal(items.length, 1);
  assert.equal(items[0].collectionSlug, 'mughals');
  assert.equal(items[0].estimatedPriceAvg, 1250);
});
