import React, { useEffect, useState, useMemo } from 'react';

// Dashboard — fetches collections from the backend and shows details
export default function Dashboard() {
  const neutral = '#7E7C76';
  const primary = '#332502';

  const [collections, setCollections] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  // UI: category & pagination state
  const [activeCategory, setActiveCategory] = useState('All');
  const [page, setPage] = useState(1);
  const pageSize = 6;

  // new: search state
  const [query, setQuery] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch('/api/collections')
      .then((r) => r.json())
      .then((data) => {
        const detectCategory = (c) => {
          // if backend already provides a valid category, keep it
          if (c.category) return c.category;

          const title = (c.title || '').toLowerCase();
          const desc = (c.description || '').toLowerCase();
          const items = Array.isArray(c.items) ? c.items : [];
          const itemTypeIncludes = (pat) => items.some(it => (it.type || '').toLowerCase().includes(pat));
          const itemTitleOrDescIncludes = (pat) => items.some(it => ((it.title || '') + ' ' + (it.desc || '')).toLowerCase().includes(pat));

          // Numismatics: coins, tokens, numismatic
          if (/coin|numisma|token/.test(title) || /coin|numisma|token/.test(desc) || itemTypeIncludes('coin') || itemTitleOrDescIncludes('coin')) {
            return 'Numismatics';
          }

          // Notaphily: banknotes, bills, currency notes
          if (/banknote|bank note|bill|note|currency/.test(title) || /banknote|bank note|bill|note|currency/.test(desc) || itemTypeIncludes('banknote') || itemTypeIncludes('bank note')) {
            return 'Notaphily';
          }

          // Scripophily: stock certificates, bonds, scrip
          if (/stock|scrip|certificate|bond/.test(title) || /stock|scrip|certificate|bond/.test(desc) || itemTypeIncludes('stock') || itemTypeIncludes('scrip') || itemTypeIncludes('certificate')) {
            return 'Scripophily';
          }

          // Philately: stamps
          if (/stamp/.test(title) || /stamp/.test(desc) || itemTypeIncludes('stamp') || itemTitleOrDescIncludes('stamp')) {
            return 'Philately';
          }

          // Ephemera: tickets, flyers, posters, postcards, pamphlets
          if (/ephem|ephemera|flyer|ticket|poster|postcard|pamphlet|brochure|handbill/.test(title) || /ephem|ephemera|flyer|ticket|poster|postcard|pamphlet|brochure|handbill/.test(desc) || itemTypeIncludes('ephemera') || itemTitleOrDescIncludes('ticket') ) {
            return 'Ephemera';
          }

          // Personal: diaries, letters, photos, memorabilia
          if (/personal|diary|letter|letters|photo|photos|memorabilia/.test(title) || /personal|diary|letter|letters|photo|photos|memorabilia/.test(desc) || itemTypeIncludes('personal') || itemTitleOrDescIncludes('diary')) {
            return 'Personal';
          }

          return 'Other';
        };

        const mapped = (data.collections || []).map((c) => ({
          ...c,
          category: detectCategory(c),
        }));

        setCollections(mapped);
      })
      .catch((err) => console.error('Failed to fetch collections', err))
      .finally(() => setLoading(false));
  }, []);

  // categories with counts derived from collections
  const categories = useMemo(() => {
    const map = { All: 0 };
    collections.forEach(c => {
      map.All = (map.All || 0) + 1;
      const cat = c.category || 'Other';
      map[cat] = (map[cat] || 0) + 1;
    });
    // ensure requested valid categories present in UI order
    const order = ['All', 'Numismatics', 'Notaphily', 'Scripophily', 'Philately', 'Ephemera', 'Personal'];
    const extra = Object.keys(map).filter(k => !order.includes(k));
    return [...order.filter(k => map[k]), ...extra].map(name => ({ name, count: map[name] || 0 }));
  }, [collections]);

  // filtered + paginated collections (includes search)
  const filtered = useMemo(() => {
    const base = activeCategory === 'All' ? collections : collections.filter(c => c.category === activeCategory);
    if (!query) return base;
    const q = query.toLowerCase();
    return base.filter(c =>
      (c.title || '').toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q) ||
      (c.items || []).some(it => ((it.title || '') + ' ' + (it.desc || '')).toLowerCase().includes(q))
    );
  }, [collections, activeCategory, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageCollections = filtered.slice((page - 1) * pageSize, page * pageSize);

  function selectCategory(cat) {
    setActiveCategory(cat);
    setPage(1);
    // optionally clear selected collection when switching categories
    setSelected(null);
  }

  function openCollection(id) {
    setLoading(true);
    fetch(`/api/collections/${encodeURIComponent(id)}`)
      .then((r) => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then((data) => setSelected(data.collection))
      .catch((err) => {
        console.error(err);
        setSelected(null);
      })
      .finally(() => setLoading(false));
  }

  // small helpers for UI
  const initials = (s = '') => (s.split(' ').map(p => p[0]).join('').slice(0,2).toUpperCase() || 'CL');
  const badgeColor = (cat) => {
    switch(cat){
      case 'Numismatics': return 'bg-yellow-100 text-yellow-800';
      case 'Notaphily': return 'bg-green-100 text-green-800';
      case 'Philately': return 'bg-purple-100 text-purple-800';
      case 'Scripophily': return 'bg-indigo-100 text-indigo-800';
      case 'Ephemera': return 'bg-pink-100 text-pink-800';
      case 'Personal': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // helper to pick a cover image (first available image in collection or item)
  const coverFor = (c) => {
    if (!c) return null;
    if (c.coverImage) return c.coverImage;
    if (c.image) return c.image;
    if (Array.isArray(c.items) && c.items.length) {
      const firstWithImage = c.items.find(it => it.image);
      if (firstWithImage) return firstWithImage.image;
    }
    return null;
  };

  // deterministic pastel color generator based on id
  const randomPastel = (seed = '') => {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h << 5) - h + seed.charCodeAt(i);
    const hue = Math.abs(h) % 360;
    return `linear-gradient(135deg, hsl(${hue} 70% 95%), hsl(${(hue + 30) % 360} 60% 90%))`;
  };

  return (
    <main className="flex-1 pb-10">
      <div className="container-custom py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 style={{color: primary}} className="text-3xl font-serif">My Collections</h1>
            <p className="mt-2 text-sm" style={{color: neutral}}>Organize, browse and inspect your collection items.</p>

            <div className="mt-4 flex flex-wrap items-center" style={{color: neutral}}>
              {categories.map(cat => (
                <button
                  key={cat.name}
                  onClick={() => selectCategory(cat.name)}
                  className={`mr-3 mb-2 px-3 py-1 rounded-full text-sm transition-all duration-150 ${activeCategory === cat.name ? 'shadow-inner' : 'opacity-90'}`}
                  style={{
                    background: activeCategory === cat.name ? primary : 'transparent',
                    color: activeCategory === cat.name ? '#fff' : neutral,
                    border: '1px solid rgba(0,0,0,0.06)',
                  }}
                >
                  {cat.name} <span className="ml-1 text-xs" style={{opacity: 0.9}}>({cat.count})</span>
                </button>
              ))}
            </div>
          </div>

          <div className="w-full md:w-1/3">
            <div className="relative">
              <input
                placeholder="Search collections, items, descriptions..."
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                className="w-full p-3 rounded-lg shadow-sm border border-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-200"
              />
              {query && (
                <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">Clear</button>
              )}
            </div>
          </div>
        </div>

        {/* Grid of flash-style cards (inline responsive grid fallback) */}
        <div
          className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '2rem',
            alignItems: 'start',
          }}
        >
          {loading && <div className="col-span-3 text-center">Loading...</div>}

          {!loading && pageCollections.length === 0 && (
            <div className="col-span-3 text-center text-sm" style={{color: neutral}}>
              No collections found for "{activeCategory}"{query ? ` matching "${query}"` : ''}
            </div>
          )}

          {!loading && pageCollections.map((c) => {
            const cover = coverFor(c);
            return (
              <article key={c.id} className="group" role="button" aria-label={`Open ${c.title}`}>
                <div
                  className="relative bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-250"
                  style={{minHeight: 320, cursor: 'pointer'}}
                  onClick={() => window.history.pushState({}, '', `/collections/${encodeURIComponent(c.id)}`) || window.dispatchEvent(new PopStateEvent('popstate'))}
                >
                  {/* cover */}
                  <div className="h-44 w-full overflow-hidden bg-gradient-to-tr from-yellow-50 to-white">
                    {cover ? (
                      <img
                        src={cover}
                        alt={c.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = ''; }}
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-5xl font-bold"
                        style={{color: primary, background: randomPastel(c.id)}}
                      >
                        {initials(c.title)}
                      </div>
                    )}
                    {/* translucent overlay title bottom-left */}
                    <div className="absolute left-4 bottom-4 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-md text-sm font-semibold" style={{color: primary}}>
                      {c.title}
                    </div>
                  </div>

                  <div className="p-4">
                    <p className="text-xs text-gray-600 line-clamp-3" style={{minHeight: 48}}>{c.description || 'No description'}</p>

                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`inline-flex items-center justify-center w-9 h-9 rounded-md ${badgeColor(c.category)}`}>
                          <span className="text-xs font-medium">{c.category && c.category[0]}</span>
                        </div>
                        <div className="text-xs text-gray-500">{c.owner || 'You'}</div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openCollection(c.id)}
                          className="px-3 py-2 rounded-xl text-sm font-medium text-white"
                          style={{background: primary, boxShadow: '0 8px 24px rgba(51,37,2,0.12)'}}
                        >
                          Open
                        </button>
                        <button
                          onClick={() => { navigator.clipboard?.writeText(window.location.origin + '/collections/' + encodeURIComponent(c.id)); }}
                          className="px-3 py-2 rounded-xl text-sm font-medium border border-gray-100 text-gray-600 bg-white"
                          title="Copy link"
                        >
                          Share
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* top-right category pill */}
                    <div className="absolute right-4 top-4 flex items-center space-x-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(window.location.origin + '/collections/' + encodeURIComponent(c.id)); }}
                        className="p-2 rounded-md text-gray-500 bg-white/70 hover:bg-white"
                        title="Copy link"
                      >
                        🔗
                      </button>
                      <div>
                        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${badgeColor(c.category)}`}>
                          {c.category}
                        </div>
                      </div>
                    </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* pagination controls */}
        {!loading && filtered.length > pageSize && (
          <div className="mt-6 flex items-center justify-center space-x-3">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 rounded border">
              Prev
            </button>
            <div>
              Page {page} / {totalPages}
            </div>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 rounded border">
              Next
            </button>
          </div>
        )}

        {/* Selected collection details */}
        {selected && (
          <div className="mt-8 bg-white p-6 rounded-lg shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-serif" style={{color: primary}}>{selected.title}</h2>
                <div className="text-sm text-gray-600 mt-1">{selected.description}</div>
                <div className="mt-3 flex items-center space-x-2">
                  <div className={`px-2 py-1 rounded-full text-xs ${badgeColor(selected.category)}`}>{selected.category}</div>
                  <div className="text-xs text-gray-500">{(selected.items || []).length} items</div>
                </div>
              </div>
              <div>
                <button className="px-3 py-1 rounded-md border" onClick={() => setSelected(null)}>Close</button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {selected.items && selected.items.map((it) => (
                <div key={it.id} className="p-4 border rounded-lg bg-gray-50 hover:bg-white transition">
                  <div className="h-28 rounded-md bg-white flex items-center justify-center text-2xl font-semibold" style={{color: primary}}>
                    {initials(it.title)}
                  </div>
                  <div className="mt-3 font-semibold">{it.title}</div>
                  <div className="text-sm text-gray-600 mt-1">{it.desc}</div>
                </div>
              ))}
              {(!selected.items || selected.items.length === 0) && (
                <div className="col-span-3 text-sm text-gray-500">No items in this collection.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
