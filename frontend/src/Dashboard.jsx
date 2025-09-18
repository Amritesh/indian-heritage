import React, { useEffect, useState, useMemo } from 'react';
import { Button, Input, HStack, Tag, Heading, Text } from '@chakra-ui/react';
import CollectionCard from './CollectionCard';

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
    const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';
    fetch(`${API_BASE_URL}/api/collections`)
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
    const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';
    fetch(`${API_BASE_URL}/api/collections/${encodeURIComponent(id)}`)
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

  const badgeColorScheme = (cat) => {
    switch(cat){
      case 'Numismatics': return 'yellow';
      case 'Notaphily': return 'green';
      case 'Philately': return 'purple';
      case 'Scripophily': return 'blue';
      case 'Ephemera': return 'pink';
      case 'Personal': return 'teal';
      default: return 'gray';
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

            <HStack wrap="wrap" spacing={3} mt={4} alignItems="center">
              {categories.map(cat => (
                <Button
                  key={cat.name}
                  size="sm"
                  variant={activeCategory === cat.name ? 'solid' : 'ghost'}
                  color={activeCategory === cat.name ? '#fff' : neutral}
                  onClick={() => selectCategory(cat.name)}
                  borderWidth={1}
                >
                  <Text as="span" mr={2}>{cat.name}</Text>
                  <Tag size="sm" ml={1} variant="subtle">{cat.count}</Tag>
                </Button>
              ))}
            </HStack>
          </div>

          <div className="w-full md:w-1/3">
            <div className="relative">
              <Input
                placeholder="Search collections, items, descriptions..."
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                size="md"
                variant="filled"
                pr="10"
              />
              {query && (
                <Button
                  aria-label="Clear search"
                  size="sm"
                  onClick={() => setQuery('')}
                  position="absolute"
                  right="8px"
                  top="50%"
                  transform="translateY(-50%)"
                  variant="ghost"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Grid of flash-style cards (inline responsive grid fallback) */}
        <div
          className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.5rem',
            alignItems: 'start',
          }}
        >
          {loading && <div className="col-span-3 text-center">Loading...</div>}

          {!loading && pageCollections.length === 0 && (
            <div className="col-span-3 text-center text-sm" style={{color: neutral}}>
              No collections found for "{activeCategory}"{query ? ` matching "${query}"` : ''}
            </div>
          )}

          {!loading && pageCollections.map((c) => (
            <CollectionCard
              key={c.id}
              collection={c}
              coverFor={coverFor}
              randomPastel={randomPastel}
              badgeColor={badgeColor}
              badgeColorScheme={badgeColorScheme}
            />
          ))}
        </div>

        {/* pagination controls */}
          {!loading && filtered.length > pageSize && (
          <HStack mt={6} justifyContent="center" spacing={4}>
            <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} isDisabled={page === 1}>Prev</Button>
            <Text>Page {page} / {totalPages}</Text>
            <Button size="sm" variant="outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} isDisabled={page === totalPages}>Next</Button>
          </HStack>
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
                <Button size="sm" variant="outline" onClick={() => setSelected(null)}>Close</Button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {selected.items && selected.items.map((it) => (
                <div key={it.id} className="p-4 border rounded-lg bg-gray-50 hover:bg-white transition">
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
