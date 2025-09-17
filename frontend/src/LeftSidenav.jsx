import React from 'react';
import './leftSidenav.css';

// JSX-based LeftSidenav translated from the temp.txt reference (Figma export)
export default function LeftSidenav() {
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
              <li style={{display: 'flex', alignItems: 'center', gap: 12, padding: 16}}>
                <span style={{width:24, height:24, display:'inline-flex', alignItems:'center', justifyContent:'center'}}>🏠</span>
                <span style={{color: 'var(--Neutral-500, #7E7C76)', fontWeight:700, letterSpacing:0.8, textTransform:'uppercase'}}>Home</span>
              </li>

              <li style={{display: 'flex', alignItems: 'center', gap: 12, padding: 16}}>
                <span style={{width:24, height:24, display:'inline-flex', alignItems:'center', justifyContent:'center'}}>🏆</span>
                <span style={{color: 'var(--Neutral-500, #7E7C76)', fontWeight:700, letterSpacing:0.8, textTransform:'uppercase'}}>Challenges</span>
              </li>

              <li style={{display: 'flex', alignItems: 'center', gap: 12, padding: 16, borderRadius: 2, background: '#FCF2D7'}}>
                <span style={{width:24, height:24, display:'inline-flex', alignItems:'center', justifyContent:'center'}}>📚</span>
                <span style={{color: '#332502', fontWeight:700, letterSpacing:0.8, textTransform:'uppercase'}}>My Collection</span>
              </li>

              <li style={{display: 'flex', alignItems: 'center', gap: 12, padding: 16}}>
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
