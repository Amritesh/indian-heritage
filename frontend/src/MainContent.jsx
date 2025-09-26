import React from 'react';
import { useNavigate } from 'react-router-dom';

const randomPastel = (seed = '') => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h << 5) - h + seed.charCodeAt(i);
  const hue = Math.abs(h) % 360;
  return `linear-gradient(135deg, hsl(${hue} 70% 95%), hsl(${(hue + 30) % 360} 60% 90%))`;
};

const MainContent = ({ activeCategory, selectCategory, categories, pageCollections, totalPages, page, setPage }) => {
  const navigate = useNavigate();

  return (
    <div style={{
      position: 'absolute',
      left: '308px',
      top: '120px'
    }}>
      {/* Title */}
      <div style={{
        width: '248px',
        fontFamily: 'Alegreya',
        fontSize: '28px',
        fontWeight: 700,
        lineHeight: '36px',
        letterSpacing: '-0.28px',
        background: 'linear-gradient(80deg, #332502 0%, #A97B07 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginBottom: '24px'
      }}>
        My Collections
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'inline-flex',
        height: '44px',
        alignItems: 'center',
        borderRadius: '2px',
        width: '372px',
        marginBottom: '44px'
      }}>
        {categories.map((category) => (
          <div
            key={category.name}
            onClick={() => selectCategory(category.name)}
            style={{
              display: 'flex',
              width: '124px',
              padding: '12px 0',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              alignSelf: 'stretch',
              borderRadius: '2px',
              borderBottom: activeCategory === category.name ? '4px solid #B29C44' : 'none',
              cursor: 'pointer'
            }}
          >
            <div style={{
              color: activeCategory === category.name ? '#3B3936' : '#62605B',
              fontFamily: 'Alegreya Sans',
              fontSize: '16px',
              fontWeight: 700,
              lineHeight: '150%',
              letterSpacing: '0.8px',
              textTransform: 'uppercase'
            }}>
              {category.name} ({category.count})
            </div>
          </div>
        ))}
      </div>

      {/* Collections Grid */}
      <div style={{
        display: 'flex',
        width: '663px',
        alignItems: 'flex-start',
        alignContent: 'flex-start',
        gap: '32px 24px',
        flexWrap: 'wrap'
      }}>
        {pageCollections.map((collection) => (
          <div
            key={collection.id}
            onClick={() => navigate(`/collections/${collection.id}`)}
            style={{
              display: 'flex',
              width: '205px',
              height: '241px',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'flex-start',
              gap: '12px',
              cursor: 'pointer'
            }}
          >
            <div style={{
              height: '205px',
              alignSelf: 'stretch',
              borderRadius: '2px',
              background: collection.hasImage
                ? `url(${collection.image}) lightgray 0px -0.559px / 100% 118.539% no-repeat`
                : randomPastel(collection.id), // Use randomPastel if no image
              boxShadow: '0 4px 10px -2px rgba(51, 19, 0, 0.24)',
              display: 'flex', // Added for centering text
              alignItems: 'center', // Added for centering text
              justifyContent: 'center', // Added for centering text
              color: '#332502', // Text color for placeholder
              fontFamily: 'Alegreya Sans', // Font family for placeholder
              fontSize: '24px', // Font size for placeholder
              fontWeight: 700, // Font weight for placeholder
              textAlign: 'center', // Center text
            }}>
              {!collection.hasImage && collection.title}
            </div>
            <div style={{
              alignSelf: 'stretch',
              color: '#3B3936',
              fontFamily: 'Alegreya Sans',
              fontSize: '16px',
              fontWeight: 500,
              lineHeight: '150%',
              letterSpacing: '-0.16px'
            }}>
              {collection.title}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '16px',
          marginTop: '44px'
        }}>
          <button
            onClick={() => setPage(prev => Math.max(1, prev - 1))}
            disabled={page === 1}
            style={{
              padding: '8px 16px',
              borderRadius: '4px',
              border: '1px solid #B29C44',
              background: page === 1 ? '#E0E0E0' : '#FCF2D7',
              color: page === 1 ? '#A0A0A0' : '#3B3936',
              cursor: page === 1 ? 'not-allowed' : 'pointer',
              fontFamily: 'Alegreya Sans',
              fontSize: '14px',
              fontWeight: 700,
              textTransform: 'uppercase'
            }}
          >
            Previous
          </button>
          <div style={{
            color: '#3B3936',
            fontFamily: 'Alegreya Sans',
            fontSize: '16px',
            fontWeight: 700
          }}>
            Page {page} of {totalPages}
          </div>
          <button
            onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
            disabled={page === totalPages}
            style={{
              padding: '8px 16px',
              borderRadius: '4px',
              border: '1px solid #B29C44',
              background: page === totalPages ? '#E0E0E0' : '#FCF2D7',
              color: page === totalPages ? '#A0A0A0' : '#3B3936',
              cursor: page === totalPages ? 'not-allowed' : 'pointer',
              fontFamily: 'Alegreya Sans',
              fontSize: '14px',
              fontWeight: 700,
              textTransform: 'uppercase'
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default MainContent;