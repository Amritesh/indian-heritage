import React from 'react';
import { Tag } from '@chakra-ui/react';

// deterministic pastel color generator based on id
const randomPastel = (seed = '') => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h << 5) - h + seed.charCodeAt(i);
  const hue = Math.abs(h) % 360;
  return `linear-gradient(135deg, hsl(${hue} 70% 95%), hsl(${(hue + 30) % 360} 60% 90%))`;
};

export default function ItemCard({ item }) {
  const primary = '#332502';
  const neutral = '#7E7C76';

  // Add defensive checks for item and item.id
  if (!item || !item.id) {
    console.warn("ItemCard received an invalid item prop:", item);
    return null; // Don't render anything if item is invalid
  }

  const cover = item.image;

  return (
    <article key={item.id} className="group" role="button" aria-label={`Open ${item.title}`}>
      <div
        className="relative rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-250"
        style={{minHeight: 200, cursor: 'pointer', background: '#fff8f0'}}
        onClick={() => window.history.pushState({}, '', `/items/${encodeURIComponent(item.id)}`) || window.dispatchEvent(new PopStateEvent('popstate'))}
      >
        {/* cover */}
        <div className="h-28 w-full overflow-hidden" style={{background: 'linear-gradient(135deg, rgba(253,185,11,0.08), rgba(51,37,2,0.02))'}}>
          {cover ? (
            <img
              src={cover}
              alt={item.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = ''; }}
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-2xl font-bold"
              style={{color: primary, background: randomPastel(item.id)}}
            >
              {item.title}
            </div>
          )}
        </div>

        <div className="p-2">
          <div className="text-sm font-semibold" style={{color: primary}}>{item.title}</div>
          {item.region && <p className="text-xs text-gray-600 leading-relaxed line-clamp-2 mt-1" style={{fontFamily: 'Georgia, serif'}}>Region: {item.region}</p>}
          {item.period && <p className="text-xs text-gray-600 leading-relaxed line-clamp-2 mt-1" style={{fontFamily: 'Georgia, serif'}}>Period: {item.period}</p>}
          {item.materials && item.materials.length > 0 && (
            <p className="text-xs text-gray-600 leading-relaxed line-clamp-2 mt-1" style={{fontFamily: 'Georgia, serif'}}>Materials: {item.materials.join(', ')}</p>
          )}
          {item.notes && item.notes.length > 0 && (
            <p className="text-xs text-gray-600 leading-relaxed line-clamp-2 mt-1" style={{fontFamily: 'Georgia, serif'}}>Notes: {item.notes[0]}</p>
          )}
        </div>
      </div>
    </article>
  );
}