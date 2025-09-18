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

  // filtered + paginated collections
  const filtered = useMemo(() => {
    const f = activeCategory === 'All' ? collections : collections.filter(c => c.category === activeCategory);
    return f;
  }, [collections, activeCategory]);

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

  return (
    <main className="flex-1">
      <div className="container-custom py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 style={{color: primary}} className="text-3xl font-serif">My Collections</h1>
            <div className="mt-3 flex items-center" style={{color: neutral}}>
              {categories.map(cat => (
                <button
                  key={cat.name}
                  onClick={() => selectCategory(cat.name)}
                  className={`mr-4 px-3 py-1 rounded ${activeCategory === cat.name ? 'font-semibold' : 'opacity-80'}`}
                  style={{
                    background: activeCategory === cat.name ? primary : 'transparent',
                    color: activeCategory === cat.name ? '#fff' : neutral,
                    border: '1px solid rgba(0,0,0,0.04)',
                  }}
                >
                  {cat.name} ({cat.count})
                </button>
              ))}
            </div>
          </div>
          <div className="w-1/3">
            <input placeholder="Search for collections" className="w-full p-3 rounded shadow-sm" />
          </div>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-6">
          {loading && <div className="col-span-3">Loading...</div>}

          {!loading && pageCollections.length === 0 && (
            <div className="col-span-3 text-center text-sm" style={{color: neutral}}>
              No collections found for "{activeCategory}"
            </div>
          )}

          {!loading && pageCollections.map((c) => (
            <div key={c.id} className="bg-white p-3 rounded shadow-sm">
              <div className="h-40 bg-gradient-to-br" style={{background: 'linear-gradient(135deg, #FFF7F0 0%, #FFF 100%)'}} />
              <div className="text-sm mt-3" style={{color: neutral}}>{c.title}</div>
              <div className="text-xs text-secondary-dark">{c.description}</div>
              <div className="mt-3 flex items-center justify-between">
                <div className="text-xs text-secondary-dark">{c.category}</div>
                <button className="btn-primary" style={{background: primary, color: '#fff'}} onClick={() => openCollection(c.id)}>Open</button>
              </div>
            </div>
          ))}
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
          <div className="mt-8 bg-white p-6 rounded shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-serif" style={{color: primary}}>{selected.title}</h2>
                <div className="text-sm text-secondary-dark">{selected.description}</div>
              </div>
              <div>
                <button className="btn-secondary" onClick={() => setSelected(null)}>Close</button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-4">
              {selected.items && selected.items.map((it) => (
                <div key={it.id} className="p-3 border rounded">
                  <div className="font-semibold">{it.title}</div>
                  <div className="text-sm text-secondary-dark">{it.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
