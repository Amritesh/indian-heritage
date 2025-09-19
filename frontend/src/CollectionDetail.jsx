import React, {useEffect, useState} from 'react';
import {useParams, useNavigate} from 'react-router-dom';
import ItemCards from './ItemCards';
import { HStack, Button, Text } from '@chakra-ui/react';
import { BASE_URL } from './firebase-config';

export default function CollectionDetail(){
  const {id} = useParams();
  const navigate = useNavigate();
  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 6; // You can adjust this value as needed

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    let fetchUrl = '';
    if (['primitive-money-1', 'early-coinage-1', 'sultanate-coins-1', 'mughals'].includes(id)) {
      fetchUrl = `${BASE_URL}/api/items/${encodeURIComponent(id)}`;
    } else {
      fetchUrl = `${BASE_URL}/api/collections/${encodeURIComponent(id)}`;
    }

    fetch(fetchUrl)
      .then(r => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then(data => {
        if (['primitive-money-1', 'early-coinage-1', 'sultanate-coins-1', 'mughals'].includes(id)) {
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
  const description = collection.description ? (
    <div className="text-sm text-gray-600 mt-2">{collection.description}</div>
  ) : null;
  const itemsToDisplay = collection.items || [];
  const totalPages = Math.max(1, Math.ceil(itemsToDisplay.length / pageSize));
  const pageItems = itemsToDisplay.slice((page - 1) * pageSize, page * pageSize);

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
        <ItemCards items={pageItems} />
      </div>

      {/* pagination controls */}
      {!loading && itemsToDisplay.length > pageSize && (
        <HStack mt={6} justifyContent="center" spacing={4}>
          <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} isDisabled={page === 1}>Prev</Button>
          <Text>Page {page} / {totalPages}</Text>
          <Button size="sm" variant="outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} isDisabled={page === totalPages}>Next</Button>
        </HStack>
      )}
    </div>
  );
}
