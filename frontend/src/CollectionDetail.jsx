import React, {useEffect, useState} from 'react';
import {useParams, useNavigate} from 'react-router-dom';

export default function CollectionDetail(){
  const {id} = useParams();
  const navigate = useNavigate();
  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/collections/${encodeURIComponent(id)}`)
      .then(r => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then(data => setCollection(data.collection))
      .catch(err => {
        console.error(err);
        setCollection(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!collection) return (
    <div className="p-6">
      <div className="text-sm">Collection not found</div>
      <div className="mt-4">
        <button onClick={() => navigate(-1)} className="px-3 py-1 rounded border">Back</button>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg p-6 shadow-xl">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-serif text-primary">{collection.title}</h2>
          <div className="text-sm text-gray-600 mt-2">{collection.description}</div>
        </div>
        <div>
          <button className="px-3 py-1 rounded border" onClick={() => navigate('/')}>Close</button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(collection.items || []).map(it => (
          <div key={it.id} className="p-4 border rounded-lg bg-gray-50 hover:bg-white transition">
            <div className="mt-3 font-semibold">{it.title}</div>
            <div className="text-sm text-gray-600 mt-1">{it.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
