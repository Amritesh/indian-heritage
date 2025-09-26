import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BASE_URL } from './firebase-config';

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
          image: data.collections[key].imageUrl,
          hasImage: !!data.collections[key].imageUrl, // New property to indicate if an image exists
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
      {/* Header */}
      <div style={{
        width: '1000px',
        height: '92px',
        borderBottom: '1px solid #FEDC85',
        position: 'absolute',
        left: '280px',
        top: '0px'
      }}>
        {/* Header content */}
        <div style={{
          display: 'inline-flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '28px',
          position: 'absolute',
          left: '844px',
          top: '24px',
          width: '124px',
          height: '48px'
        }}>
          {/* Notification icon */}
          <div style={{
            display: 'flex',
            width: '48px',
            height: '48px',
            padding: '12px',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M5.39404 8.55577C5.84677 6.20157 7.90673 4.5 10.3041 4.5H13.6959C16.0933 4.5 18.1532 6.20156 18.606 8.55576L20.482 18.3112C20.5383 18.6041 20.461 18.9069 20.271 19.1368C20.081 19.3668 19.7983 19.5 19.5 19.5H4.50001C4.20171 19.5 3.91899 19.3668 3.72902 19.1368C3.53905 18.9069 3.46167 18.6041 3.518 18.3112L5.39404 8.55577Z" fill="#514F4B"/>
            </svg>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#BA2525',
              position: 'absolute',
              right: '8px',
              top: '8px'
            }} />
          </div>
          
          {/* Profile picture */}
          <img 
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '2px',
              boxShadow: '0 2px 4px 0 rgba(51, 19, 0, 0.12)'
            }}
            src="https://api.builder.io/api/v1/image/assets/TEMP/8882b49a194cc7a394e49f22ab463ef67368b98c?width=96"
            alt="Profile"
          />
        </div>

        {/* Search Bar */}
        <div style={{
          display: 'inline-flex',
          padding: '12px 16px',
          alignItems: 'center',
          borderRadius: '4px',
          background: '#FFF',
          boxShadow: '0 2px 4px -1px rgba(51, 37, 2, 0.04)',
          position: 'absolute',
          left: '28px',
          top: '22px',
          width: '428px',
          height: '48px'
        }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '8px' }}>
            <path fillRule="evenodd" clipRule="evenodd" d="M8.1189 4.02972C4.75594 4.02972 2.02972 6.75594 2.02972 10.1189C2.02972 13.4819 4.75594 16.2081 8.1189 16.2081C11.4819 16.2081 14.2081 13.4819 14.2081 10.1189C14.2081 6.75594 11.4819 4.02972 8.1189 4.02972Z" fill="#514F4B"/>
          </svg>
          <input
            type="text"
            placeholder="Search for collections"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            style={{
              border: 'none',
              outline: 'none',
              width: '100%',
              color: '#514F4B',
              fontFamily: 'Alegreya Sans',
              fontSize: '16px',
              background: 'transparent'
            }}
          />
        </div>
      </div>

      {/* Left Sidebar */}
      <div style={{
        width: '280px',
        height: '832px',
        background: 'radial-gradient(80.18% 141.42% at 0% 100%, #FCF9F7 0%, #FFF 100%)',
        boxShadow: '4px 0 12px -8px rgba(84, 62, 4, 0.25)',
        position: 'absolute',
        left: '0px',
        top: '0px'
      }}>
        {/* Logo section */}
        <div style={{
          display: 'flex',
          width: '216px',
          alignItems: 'center',
          gap: '8px',
          position: 'absolute',
          left: '32px',
          top: '40px',
          height: '64px'
        }}>
          <img 
            style={{
              width: '64px',
              height: '64px'
            }}
            src="https://api.builder.io/api/v1/image/assets/TEMP/60e679c2382ff8daadccb9add703b2d7d9d98f0f?width=128"
            alt="Logo"
          />
          <div style={{
            fontFamily: 'DM Serif Display',
            fontSize: '16px',
            fontWeight: 400,
            lineHeight: '110%',
            background: 'linear-gradient(80deg, #331300 0%, #755A3B 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Indian Heritage.
          </div>
        </div>

        {/* Navigation Menu */}
        <div style={{
          display: 'flex',
          width: '232px',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '12px',
          position: 'absolute',
          left: '32px',
          top: '200px'
        }}>
          {/* Home */}
          <div style={{
            display: 'flex',
            padding: '16px',
            alignItems: 'center',
            gap: '12px',
            alignSelf: 'stretch'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M12.5547 4.57029C12.2188 4.34636 11.7812 4.34636 11.4453 4.57029L4.4453 9.23696C4.1671 9.42243 4 9.73466 4 10.069V18.9986C4 19.5509 4.44772 19.9986 5 19.9986H8V15.9986C8 14.3418 9.34315 12.9986 11 12.9986H13C14.6569 12.9986 16 14.3418 16 15.9986V19.9986H19C19.5523 19.9986 20 19.5509 20 18.9986V10.069C20 9.73466 19.8329 9.42243 19.5547 9.23696L12.5547 4.57029Z" fill="#62605B"/>
            </svg>
            <div style={{
              color: '#7E7C76',
              fontFamily: 'Alegreya Sans',
              fontSize: '16px',
              fontWeight: 700,
              lineHeight: '150%',
              letterSpacing: '0.8px',
              textTransform: 'uppercase'
            }}>
              Home
            </div>
          </div>

          {/* Challenges */}
          <div style={{
            display: 'flex',
            padding: '16px',
            alignItems: 'center',
            gap: '12px',
            alignSelf: 'stretch'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3Z" fill="#7E7C76"/>
            </svg>
            <div style={{
              color: '#7E7C76',
              fontFamily: 'Alegreya Sans',
              fontSize: '16px',
              fontWeight: 700,
              lineHeight: '150%',
              letterSpacing: '0.8px',
              textTransform: 'uppercase'
            }}>
              Challenges
            </div>
          </div>

          {/* My Collection - Active */}
          <div style={{
            display: 'flex',
            padding: '16px',
            alignItems: 'center',
            gap: '12px',
            alignSelf: 'stretch',
            borderRadius: '2px',
            background: '#FCF2D7'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M1 4C1 2.34315 2.34315 1 4 1H22C22.5523 1 23 1.44772 23 2V19C23 19.5523 22.5523 20 22 20H2C1.44772 20 1 19.5523 1 19V4Z" fill="#332502"/>
            </svg>
            <div style={{
              color: '#332502',
              fontFamily: 'Alegreya Sans',
              fontSize: '16px',
              fontWeight: 700,
              lineHeight: '150%',
              letterSpacing: '0.8px',
              textTransform: 'uppercase'
            }}>
              My Collection
            </div>
          </div>

          {/* Showcase */}
          <div style={{
            display: 'flex',
            padding: '16px',
            alignItems: 'center',
            gap: '12px',
            alignSelf: 'stretch'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M3 2C3 1.44772 3.44772 1 4 1H20C20.5523 1 21 1.44772 21 2V16.5C21 17.0523 20.5523 17.5 20 17.5H4C3.44772 17.5 3 17.0523 3 16.5V2Z" fill="#62605B"/>
            </svg>
            <div style={{
              color: '#7E7C76',
              fontFamily: 'Alegreya Sans',
              fontSize: '16px',
              fontWeight: 700,
              lineHeight: '150%',
              letterSpacing: '0.8px',
              textTransform: 'uppercase'
            }}>
              Showcase
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
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

      {/* Right Sidebar */}
      <div style={{
        width: '280px',
        height: '740px',
        borderLeft: '1px dashed #543E04',
        position: 'absolute',
        left: '1000px',
        top: '92px'
      }}>
        <div style={{
          width: '224px',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '24px',
          position: 'absolute',
          left: '28px',
          top: '28px'
        }}>
          {/* Challenge Progress Section */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '20px',
            alignSelf: 'stretch'
          }}>
            <div style={{
              width: '224px',
              fontFamily: 'Alegreya',
              fontSize: '19px',
              fontWeight: 700,
              lineHeight: '120%',
              background: 'linear-gradient(80deg, #332502 0%, #A97B07 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Challenge Progress
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '16px',
              alignSelf: 'stretch'
            }}>
              {challengeProgress.map((item, index) => (
                <div key={index} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '12px',
                  alignSelf: 'stretch'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    alignSelf: 'stretch'
                  }}>
                    <div style={{
                      color: '#514F4B',
                      fontFamily: 'Alegreya Sans',
                      fontSize: '18px',
                      fontWeight: 500,
                      lineHeight: '150%',
                      letterSpacing: '-0.18px'
                    }}>
                      {item.title}
                    </div>
                    {item.hasMedal && (
                      <svg width="24" height="24" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7.5621 17.2065C7.39743 16.8643 7.18181 16.3854 6.95615 16.0874C6.66135 15.6981 5.41153 15.399 4.98974 14.8559C4.66236 14.4344 4.82568 13.7121 4.88038 13.2318C4.97221 12.4253 4.68773 12.1897 4.26649 11.5636C3.79934 10.8694 3.74596 10.5863 4.19765 9.9081C4.71271 9.13476 5.03334 9.06121 4.92018 8.17035C4.71196 6.53109 4.92801 6.38212 6.33318 5.76777C6.91274 5.51437 6.94781 5.4884 7.1834 4.91035C7.84907 3.2774 8.05495 3.38071 9.57824 3.60795C10.3033 3.71611 10.55 3.32013 11.1373 2.93253C12.117 2.28587 12.51 2.66497 13.3181 3.23551C13.7714 3.55553 13.7967 3.69538 14.3658 3.62311C15.003 3.5422 15.7842 3.2702 16.2532 3.86342C16.4909 4.16409 16.7285 4.74633 16.896 5.11194C17.1292 5.62115 17.164 5.6016 17.673 5.79248C19.2524 6.38488 19.2364 6.63356 19.085 8.17902C19.031 8.73042 19.0184 8.7719 19.3482 9.23404C19.8812 9.98081 20.3947 10.5871 19.8001 11.4704C19.3263 12.1743 19.0214 12.1922 19.0803 13.0377C19.1242 13.6669 19.3489 14.7148 18.7543 15.1468C18.3568 15.4355 17.4094 15.6613 17.1477 15.9186C16.981 16.0824 16.5328 17.0137 16.4445 17.2656C16.3831 17.3164 16.2705 17.5278 16.1847 17.6174C15.7965 18.0226 14.9545 17.8263 14.4427 17.7612C13.9089 17.6932 13.7836 17.7294 13.3289 18.033C12.1331 18.8318 11.8473 18.7755 10.6808 18.022C9.87309 17.5003 9.37739 17.8406 8.49117 17.8593C7.77084 17.8745 7.87317 17.469 7.57157 17.1788L7.5621 17.2065Z" fill="url(#paint0_linear)"/>
                        <defs>
                          <linearGradient id="paint0_linear" x1="17.4998" y1="-4.50195" x2="3.49975" y2="19.498" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#FDB90B"/>
                            <stop offset="1" stopColor="#FED05C"/>
                          </linearGradient>
                        </defs>
                      </svg>
                    )}
                  </div>

                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: '4px',
                    alignSelf: 'stretch'
                  }}>
                    <div style={{
                      height: '6px',
                      alignSelf: 'stretch',
                      position: 'relative'
                    }}>
                      <div style={{
                        width: '224px',
                        height: '6px',
                        borderRadius: '1px',
                        background: '#A3D9A5',
                        position: 'absolute',
                        left: '0px',
                        top: '0px'
                      }} />
                      <div style={{
                        width: `${(item.progress / item.total) * 224}px`,
                        height: '6px',
                        background: 'linear-gradient(90deg, #57AE5B -2.31%, #0E5814 100.43%)',
                        opacity: 0.7,
                        position: 'absolute',
                        left: '0px',
                        top: '0px'
                      }} />
                      <svg style={{
                        width: '16px',
                        height: '16px',
                        fill: '#3F9142',
                        position: 'absolute',
                        left: `${Math.max(0, (item.progress / item.total) * 224 - 8)}px`,
                        top: '-5px'
                      }} viewBox="0 0 16 16">
                        <path d="M7.29289 0.707106C7.68342 0.316582 8.31658 0.316583 8.70711 0.707107L15.2929 7.29289C15.6834 7.68342 15.6834 8.31658 15.2929 8.70711L8.70711 15.2929C8.31658 15.6834 7.68342 15.6834 7.29289 15.2929L0.707106 8.70711C0.316582 8.31658 0.316583 7.68342 0.707107 7.29289L7.29289 0.707106Z" fill="#3F9142"/>
                      </svg>
                    </div>
                    <div style={{
                      alignSelf: 'stretch',
                      color: '#207227',
                      textAlign: 'right',
                      fontFamily: 'Alegreya Sans',
                      fontSize: '16px',
                      fontWeight: 700,
                      lineHeight: '150%',
                      letterSpacing: '0.8px',
                      textTransform: 'uppercase'
                    }}>
                      {item.progress} / {item.total}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div style={{
            width: '224px',
            height: '1px',
            opacity: 0.45,
            background: 'linear-gradient(90deg, #D39A09 0%, #543E04 100%)'
          }} />

          {/* Total Items */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '4px',
            alignSelf: 'stretch'
          }}>
            <div style={{
              alignSelf: 'stretch',
              fontFamily: 'Alegreya',
              fontSize: '38px',
              fontWeight: 500,
              lineHeight: '48px',
              letterSpacing: '-0.38px',
              background: 'linear-gradient(80deg, #332502 0%, #A97B07 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              1027
            </div>
            <div style={{
              alignSelf: 'stretch',
              color: '#62605B',
              fontFamily: 'Alegreya Sans',
              fontSize: '16px',
              fontWeight: 700,
              lineHeight: '150%',
              letterSpacing: '0.8px',
              textTransform: 'uppercase'
            }}>
              total items added
            </div>
          </div>

          {/* Divider */}
          <div style={{
            width: '224px',
            height: '1px',
            opacity: 0.45,
            background: 'linear-gradient(270deg, #D39A09 0%, #543E04 100%)'
          }} />

          {/* Leaderboard */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '16px',
            alignSelf: 'stretch'
          }}>
            <div style={{
              alignSelf: 'stretch',
              fontFamily: 'Alegreya',
              fontSize: '19px',
              fontWeight: 700,
              lineHeight: '120%',
              background: 'linear-gradient(80deg, #332502 0%, #A97B07 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Leaderboard position
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '20px',
              alignSelf: 'stretch'
            }}>
              {leaderboardData.map((item, index) => (
                <div key={index} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  alignSelf: 'stretch'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    alignSelf: 'stretch'
                  }}>
                    <div style={{
                      color: '#514F4B',
                      fontFamily: 'Alegreya Sans',
                      fontSize: '18px',
                      fontWeight: 700,
                      lineHeight: '150%',
                      letterSpacing: '-0.18px'
                    }}>
                      {item.position}
                    </div>
                    {item.hasMedal && (
                      <svg width="24" height="24" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7.5621 17.2065C7.39743 16.8643 7.18181 16.3854 6.95615 16.0874C6.66135 15.6981 5.41153 15.399 4.98974 14.8559C4.66236 14.4344 4.82568 13.7121 4.88038 13.2318C4.97221 12.4253 4.68773 12.1897 4.26649 11.5636C3.79934 10.8694 3.74596 10.5863 4.19765 9.9081C4.71271 9.13476 5.03334 9.06121 4.92018 8.17035C4.71196 6.53109 4.92801 6.38212 6.33318 5.76777C6.91274 5.51437 6.94781 5.4884 7.1834 4.91035C7.84907 3.2774 8.05495 3.38071 9.57824 3.60795C10.3033 3.71611 10.55 3.32013 11.1373 2.93253C12.117 2.28587 12.51 2.66497 13.3181 3.23551C13.7714 3.55553 13.7967 3.69538 14.3658 3.62311C15.003 3.5422 15.7842 3.2702 16.2532 3.86342C16.4909 4.16409 16.7285 4.74633 16.896 5.11194C17.1292 5.62115 17.164 5.6016 17.673 5.79248C19.2524 6.38488 19.2364 6.63356 19.085 8.17902C19.031 8.73042 19.0184 8.7719 19.3482 9.23404C19.8812 9.98081 20.3947 10.5871 19.8001 11.4704C19.3263 12.1743 19.0214 12.1922 19.0803 13.0377C19.1242 13.6669 19.3489 14.7148 18.7543 15.1468C18.3568 15.4355 17.4094 15.6613 17.1477 15.9186C16.981 16.0824 16.5328 17.0137 16.4445 17.2656C16.3831 17.3164 16.2705 17.5278 16.1847 17.6174C15.7965 18.0226 14.9545 17.8263 14.4427 17.7612C13.9089 17.6932 13.7836 17.7294 13.3289 18.033C12.1331 18.8318 11.8473 18.7755 10.6808 18.022C9.87309 17.5003 9.37739 17.8406 8.49117 17.8593C7.77084 17.8745 7.87317 17.469 7.57157 17.1788L7.5621 17.2065Z" fill="url(#paint1_linear)"/>
                        <defs>
                          <linearGradient id="paint1_linear" x1="17.4998" y1="-4.50195" x2="3.49975" y2="19.498" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#FDB90B"/>
                            <stop offset="1" stopColor="#FED05C"/>
                          </linearGradient>
                        </defs>
                      </svg>
                    )}
                  </div>
                  <div style={{
                    alignSelf: 'stretch',
                    color: '#62605B',
                    fontFamily: 'Alegreya Sans',
                    fontSize: '16px',
                    fontWeight: 500,
                    lineHeight: '150%',
                    letterSpacing: '-0.16px'
                  }}>
                    {item.title}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyCollections;
