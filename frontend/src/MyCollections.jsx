import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BASE_URL } from './firebase-config';
import HeaderComponent from './HeaderComponent';
import LeftSidebar from './LeftSidebar';
import MainContent from './MainContent';
import RightSidebar from './RightSidebar';
import { getFirebaseStorageUrl } from './utils/imageUtils';

const randomPastel = (seed = '') => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h << 5) - h + seed.charCodeAt(i);
  const hue = Math.abs(h) % 360;
  return `linear-gradient(135deg, hsl(${hue} 70% 95%), hsl(${(hue + 30) % 360} 60% 90%))`;
};

const MyCollections = () => {
  const [activeCategory, setActiveCategory] = useState('All'); // Changed from activeTab to activeCategory
  const [collections, setCollections] = useState([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(9); // 3 columns * 3 rows
  const [selected, setSelected] = useState(null); // For optionally clearing selected collection
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const response = await fetch(`${BASE_URL}/api/collections`);
        const data = await response.json();
        // Assuming data.collections is an object like {id1: {...}, id2: {...}}
        const collectionsArray = Object.keys(data.collections || {}).map(key => ({
          id: data.collections[key].id, // Use the 'id' from the API response
          title: data.collections[key].title, // Use 'title' from the API response for display
          image: getFirebaseStorageUrl(data.collections[key].image),
          hasImage: !!data.collections[key].image, // New property to indicate if an image exists
          category: data.collections[key].category || 'Other' // Default to 'Other'
        }));
        setCollections(collectionsArray);
      } catch (error) {
        console.error('Error fetching collections for MyCollections:', error);
      }
    };
    fetchCollections();
  }, []);

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

  const selectCategory = useCallback((cat) => {
    setActiveCategory(cat);
    setPage(1);
    // optionally clear selected collection when switching categories
    setSelected(null);
  }, []);

  const challengeProgress = [
    {
      title: 'Regular Mint Wise Vol 2',
      progress: 112,
      total: 560,
      progressPercent: 20,
      hasMedal: true
    },
    {
      title: 'Indian Postage Stamps Volume 2',
      progress: 15,
      total: 340,
      progressPercent: 4.4,
      hasMedal: false
    },
    {
      title: 'Regular Mint Wise Vol 1',
      progress: 900,
      total: 900,
      progressPercent: 100,
      hasMedal: true
    }
  ];

  const leaderboardData = [
    { position: '01 / 32', title: 'Regular Mint Wise Vol 1', hasMedal: true },
    { position: '03 / 27', title: 'Regular Mint Wise Vol 3', hasMedal: true },
    { position: '12 / 64', title: 'Indian Postage Stamps Volume 2', hasMedal: false }
  ];

  return (
    <div style={{ 
      width: '1280px', 
      height: '832px', 
      background: "url('https://api.builder.io/api/v1/image/assets/TEMP/9c4c731139ed477c6d1ff9d30ec7361bd7a2e076?width=2560') lightgray 0% 0% / 100px 100px repeat, #F7F6F2",
      position: 'relative'
    }}>
      <HeaderComponent query={query} setQuery={(e) => { setQuery(e.target.value); setPage(1); }} />

      <LeftSidebar />

      <MainContent
        activeCategory={activeCategory}
        selectCategory={selectCategory}
        categories={categories}
        pageCollections={pageCollections}
        totalPages={totalPages}
        page={page}
        setPage={setPage}
      />

      <RightSidebar
        challengeProgress={challengeProgress}
        leaderboardData={leaderboardData}
      />
    </div>
  );
};

export default MyCollections;
