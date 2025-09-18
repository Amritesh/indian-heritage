import React, {useEffect, useState} from 'react';
import {useParams, useNavigate} from 'react-router-dom';
import ItemCards from './ItemCards';

export default function CollectionDetail(){
  const {id} = useParams();
  const navigate = useNavigate();
  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    let fetchUrl = '';
    if (id === 'primitive-money-1') {
      fetchUrl = `/api/items/${encodeURIComponent(id)}`;
    } else {
      fetchUrl = `/api/collections/${encodeURIComponent(id)}`;
    }

    fetch(fetchUrl)
      .then(r => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then(data => {
        if (id === 'primitive-money-1') {
          setCollection(data.itemCollection);
        } else {
          setCollection(data.collection);
        }
      })
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

  const title = collection.album_title || collection.title;
  const description = collection.source_pdf ? (
    <div className="text-sm text-gray-600 mt-2">
      Source: <a href={collection.source_pdf} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">PDF Document</a>
    </div>
  ) : (
    <div className="text-sm text-gray-600 mt-2">{collection.description}</div>
  );
  const itemsToDisplay = collection.items || [];

  return (
    <div className="bg-white rounded-lg p-6 shadow-xl">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-serif text-primary">{title}</h2>
          {description}
        </div>
        <div>
          <button className="px-3 py-1 rounded border" onClick={() => navigate('/')}>Close</button>
        </div>
      </div>

      <div className="mt-6">
        <ItemCards items={itemsToDisplay} />
      </div>
    </div>
  );
}
