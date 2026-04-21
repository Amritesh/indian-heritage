const HOMEPAGE_API_CACHE_CONTROL = 'public, max-age=300, s-maxage=900, stale-while-revalidate=1800';

function setHomepageApiCache(res) {
  res.set('Cache-Control', HOMEPAGE_API_CACHE_CONTROL);
}

module.exports = {
  HOMEPAGE_API_CACHE_CONTROL,
  setHomepageApiCache,
};
