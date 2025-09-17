import React from 'react';
import Header from './Header';

// Dashboard — main content area translated from the project layout.
// Uses the color tokens visible in temp.json (Neutral-500, Primary-900)
export default function Dashboard() {
  const neutral = '#7E7C76';
  const primary = '#332502';

  const items = [
    {title: 'Textiles', desc: 'Handwoven sarees and embroidered textiles'},
    {title: 'Sculpture', desc: 'Stone and bronze sculptures'},
    {title: 'Manuscripts', desc: 'Ancient palm-leaf manuscripts'},
    {title: 'Paintings', desc: 'Miniature and folk paintings'},
    {title: 'Coins', desc: 'Historic coinage and medallions'},
    {title: 'Stamps', desc: 'Rare postage stamps'},
  ];

  return (
    <>
      <main className="flex-1">
        <div className="container-custom py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 style={{color: primary}} className="text-3xl font-serif">My Collections</h1>
              <div className="mt-3" style={{color: neutral}}>All &nbsp; <span className="ml-6">Coins</span> &nbsp; <span>Stamps</span></div>
            </div>
            <div className="w-1/3">
              <input placeholder="Search for collections" className="w-full p-3 rounded shadow-sm" />
            </div>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-6">
            {items.map((it, i) => (
              <div key={i} className="bg-white p-3 rounded shadow-sm">
                <div className="h-40 bg-gradient-to-br" style={{background: 'linear-gradient(135deg, #FFF7F0 0%, #FFF 100%)'}} />
                <div className="text-sm mt-3" style={{color: neutral}}>{it.title}</div>
                <div className="text-xs text-secondary-dark">{it.desc}</div>
                <div className="mt-3">
                  <button className="btn-primary" style={{background: primary, color: '#fff'}}>View</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
