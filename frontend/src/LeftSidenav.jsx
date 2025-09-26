import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './leftSidenav.css';
import { BASE_URL } from './firebase-config';

// JSX-based LeftSidenav translated from the temp.txt reference (Figma export)
export default function LeftSidenav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collections, setCollections] = useState([]);

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const response = await fetch(`${BASE_URL}/api/collections`);
        const data = await response.json();
        setCollections(data.collections ? Object.keys(data.collections).map(key => ({
          id: data.collections[key].id, // Use the 'id' from the API response
          title: data.collections[key].title // Use 'title' from the API response for display
        })) : []);
      } catch (error) {
        console.error('Error fetching collections:', error);
      }
    };
    fetchCollections();
  }, []);
  return (
    <aside className="left-sidenav" aria-label="Left navigation">
      <div className="left-sidenav-inner" style={{background: 'radial-gradient(80.18% 141.42% at 0% 100%, #FCF9F7 0%, #FFF 100%)'}}>
        <div className="p-6" style={{width: 216}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
            <img src="https://api.builder.io/api/v1/image/assets/TEMP/60e679c2382ff8daadccb9add703b2d7d9d98f0f?width=128" alt="IH" style={{width:64,height:64,borderRadius:8}}/>
            <div style={{fontFamily: 'DM Serif Display, serif', fontSize: 16, background: 'linear-gradient(80deg, #331300 0%, #755A3B 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>Indian Heritage.</div>
          </div>

          <div style={{marginTop: 40}}>
            <ul style={{display: 'flex', flexDirection: 'column', gap: 12, padding: 0, listStyle: 'none'}}>
              <li
                onClick={() => navigate('/')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 16,
                  cursor: 'pointer',
                  borderRadius: 2,
                  background: location.pathname === '/' ? '#FCF2D7' : 'transparent'
                }}
              >
                <span style={{width:24, height:24, display:'inline-flex', alignItems:'center', justifyContent:'center'}}>🏠</span>
                <span style={{
                  color: location.pathname === '/' ? '#332502' : 'var(--Neutral-500, #7E7C76)',
                  fontWeight:700,
                  letterSpacing:0.8,
                  textTransform:'uppercase'
                }}>Home</span>
              </li>

              <li
                onClick={() => navigate('/challenges')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 16,
                  cursor: 'pointer',
                  borderRadius: 2,
                  background: location.pathname === '/challenges' ? '#FCF2D7' : 'transparent'
                }}
              >
                <span style={{width:24, height:24, display:'inline-flex', alignItems:'center', justifyContent:'center'}}>🏆</span>
                <span style={{
                  color: location.pathname === '/challenges' ? '#332502' : 'var(--Neutral-500, #7E7C76)',
                  fontWeight:700,
                  letterSpacing:0.8,
                  textTransform:'uppercase'
                }}>Challenges</span>
              </li>

              {collections.map((collection) => (
                <li
                  key={collection.id}
                  onClick={() => navigate(`/collections/${collection.id}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 16,
                    borderRadius: 2,
                    background: location.pathname === `/collections/${collection.id}` ? '#FCF2D7' : 'transparent',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{width:24, height:24, display:'inline-flex', alignItems:'center', justifyContent:'center'}}>📚</span>
                  <span style={{
                    color: location.pathname === `/collections/${collection.id}` ? '#332502' : 'var(--Neutral-500, #7E7C76)',
                    fontWeight:700,
                    letterSpacing:0.8,
                    textTransform:'uppercase'
                  }}>{collection.title}</span>
                </li>
              ))}

              <li
                onClick={() => navigate('/my-collections')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 16,
                  borderRadius: 2,
                  background: location.pathname === '/my-collections' ? '#FCF2D7' : 'transparent',
                  cursor: 'pointer'
                }}
              >
                <span style={{width:24, height:24, display:'inline-flex', alignItems:'center', justifyContent:'center'}}>📚</span>
                <span style={{
                  color: location.pathname === '/my-collections' ? '#332502' : 'var(--Neutral-500, #7E7C76)',
                  fontWeight:700,
                  letterSpacing:0.8,
                  textTransform:'uppercase'
                }}>My Collection</span>
              </li>

              <li style={{display: 'flex', alignItems: 'center', gap: 12, padding: 16, cursor: 'pointer'}}>
                <span style={{width:24, height:24, display:'inline-flex', alignItems:'center', justifyContent:'center'}}>🖼️</span>
                <span style={{color: 'var(--Neutral-500, #7E7C76)', fontWeight:700, letterSpacing:0.8, textTransform:'uppercase'}}>Showcase</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </aside>
  );
}