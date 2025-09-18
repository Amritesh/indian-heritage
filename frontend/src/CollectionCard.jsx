import React from 'react';
import { Tag } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';

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

export default function CollectionCard({ collection, badgeColor, badgeColorScheme }) {
  const navigate = useNavigate();
  const primary = '#332502';
  const neutral = '#7E7C76';

  const cover = coverFor(collection);

  return (
    <article key={collection.id} className="group" role="button" aria-label={`Open ${collection.title}`}>
      <div
        className="relative rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-250"
        style={{minHeight: 200, cursor: 'pointer', background: '#fff8f0'}}
        onClick={() => navigate(`/collections/${encodeURIComponent(collection.id)}`)}
      >
        {/* cover */}
        <div className="h-28 w-full overflow-hidden" style={{background: 'linear-gradient(135deg, rgba(253,185,11,0.08), rgba(51,37,2,0.02))'}}>
          {cover ? (
            <img
              src={cover}
              alt={collection.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = ''; }}
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-2xl font-bold"
              style={{color: primary, background: randomPastel(collection.id)}}
            >
              {collection.title}
            </div>
          )}
        </div>

        <div className="p-2">
          <div className="text-sm font-semibold" style={{color: primary}}>{collection.title}</div>
          <p className="text-xs text-gray-600 leading-relaxed line-clamp-2 mt-1" style={{minHeight: 32, fontFamily: 'Georgia, serif'}}>{collection.description || 'No description'}</p>
        </div>

        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between p-2">
          <div className="flex items-center space-x-1">
            <div className="text-xs" style={{color: neutral, fontWeight: 500}}>{collection.owner || 'You'}</div>
          </div>
          <Tag size="xs" variant="subtle" colorScheme={badgeColorScheme(collection.category)}>
            {collection.category}
          </Tag>
        </div>
      </div>
    </article>
  );
}