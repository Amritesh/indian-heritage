const test = require('node:test');
const assert = require('node:assert/strict');

const { setHomepageApiCache } = require('./httpCache');

test('setHomepageApiCache applies browser and shared cache headers', () => {
  const headers = {};
  const res = {
    set(name, value) {
      headers[name] = value;
    },
  };

  setHomepageApiCache(res);

  assert.equal(headers['Cache-Control'], 'public, max-age=300, s-maxage=900, stale-while-revalidate=1800');
});
