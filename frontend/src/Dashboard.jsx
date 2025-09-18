import React, { useEffect, useState } from 'react';

// Dashboard — fetches collections from the backend and shows details
export default function Dashboard() {
  const neutral = '#7E7C76';
  const primary = '#332502';

  const [collections, setCollections] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch('/api/collections')
      .then((r) => r.json())
      .then((data) => {
        setCollections(data.collections || []);
      })
      .catch((err) => console.error('Failed to fetch collections', err))
      .finally(() => setLoading(false));
  }, []);

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
            <div className="mt-3" style={{color: neutral}}>All &nbsp; <span className="ml-6">Coins</span> &nbsp; <span>Stamps</span></div>
          </div>
          <div className="w-1/3">
            <input placeholder="Search for collections" className="w-full p-3 rounded shadow-sm" />
          </div>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-6">
          {loading && <div className="col-span-3">Loading...</div>}

          {!loading && collections.map((c) => (
            <div key={c.id} className="bg-white p-3 rounded shadow-sm">
              <div className="h-40 bg-gradient-to-br" style={{background: 'linear-gradient(135deg, #FFF7F0 0%, #FFF 100%)'}} />
              <div className="text-sm mt-3" style={{color: neutral}}>{c.title}</div>
              <div className="text-xs text-secondary-dark">{c.description}</div>
              <div className="mt-3">
                <button className="btn-primary" style={{background: primary, color: '#fff'}} onClick={() => openCollection(c.id)}>Open</button>
              </div>
            </div>
          ))}
        </div>

        {/* Selected collection details */}
        {selected && (
          <div className="mt-8 bg-white p-6 rounded shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-serif text-primary">{selected.title}</h2>
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
