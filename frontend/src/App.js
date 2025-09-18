import './index.css';
import LeftSidenav from './LeftSidenav';
import Dashboard from './Dashboard';
import Header from './Header';
import CollectionDetail from './CollectionDetail';
import { Routes, Route } from 'react-router-dom';

function Hero() {
  return (
    <header className="relative overflow-hidden">
      <div className="hero-decor absolute -left-40 -top-40 opacity-20 pointer-events-none" aria-hidden />
      <div className="container-custom py-20 lg:py-28 grid lg:grid-cols-2 gap-8 items-center">
        <div>
          <h1 className="text-6xl lg:text-7xl font-display text-primary leading-tight">Anand Heritage Gallery</h1>
          <p className="mt-6 text-xl text-secondary-dark max-w-2xl">Discover India's rich cultural history through curated collections of art, textiles, sculpture and manuscripts — preserved and displayed with care.</p>
          <div className="mt-8 flex items-center gap-4">
            <button className="btn-primary inline-flex items-center">Explore Collections</button>
            <a href="#about" className="text-secondary-dark hover:text-primary">Learn more</a>
          </div>
        </div>
        <div className="flex justify-center lg:justify-end">
          <div className="w-full max-w-md rounded-xl overflow-hidden shadow-lg bg-white">
            <img src="/logo512.png" alt="featured" className="w-full h-64 object-cover" />
            <div className="p-6">
              <h3 className="font-serif text-2xl text-primary">Featured: Temple Sculptures</h3>
              <p className="mt-2 text-secondary-dark text-sm">A selection of intricately carved stone sculptures from South Indian temples.</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

function Collections() {
  const items = [
    {title: 'Textiles', desc: 'Handwoven sarees and embroidered textiles'},
    {title: 'Sculpture', desc: 'Stone and bronze sculptures'},
    {title: 'Manuscripts', desc: 'Ancient palm-leaf manuscripts'},
    {title: 'Paintings', desc: 'Miniature and folk paintings'},
  ];

  return (
    <section id="collections" className="container-custom py-14">
      <h2 className="text-3xl font-serif text-primary">Collections</h2>
      <p className="mt-2 text-secondary-dark max-w-2xl">Explore a curated selection from across regions and eras.</p>
      <div className="mt-8 grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it) => (
          <article key={it.title} className="card border border-gray-100 p-4">
            <div className="h-40 bg-gradient-to-br from-accent/20 to-primary/10 rounded-md mb-4 flex items-end p-3">
              <h4 className="text-lg font-semibold text-primary">{it.title}</h4>
            </div>
            <p className="text-sm text-secondary-dark">{it.desc}</p>
            <div className="mt-4">
              <button className="btn-primary">View</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="bg-secondary py-8 mt-16">
      <div className="container-custom text-center text-secondary-dark">
        © {new Date().getFullYear()} Anand Heritage Gallery — All rights reserved
      </div>
    </footer>
  )
}

function App() {
  return (
    <div className="min-h-screen bg-cream">
      <Header />

      <div className="page-row" style={{padding: '24px 0'}}>
        <LeftSidenav />

        {/* Main column: dashboard */}
        <div>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/collections/:id" element={<CollectionDetail />} />
          </Routes>
        </div>

        {/* Right column: stats */}
        <aside className="w-80 p-6 stats-panel">
          <div className="text-primary font-serif text-xl">Challenge Progress</div>
          <div className="mt-4 space-y-4">
            <div>
              <div className="text-sm text-secondary-dark">Regular Mint Wise Vol 2</div>
              <div className="w-full bg-gray-200 rounded h-3 mt-2 overflow-hidden">
                <div className="h-3 bg-green" style={{width: '20%'}}></div>
              </div>
              <div className="text-sm text-primary mt-1">112 / 560</div>
            </div>
            <div>
              <div className="text-sm text-secondary-dark">Indian Postage Stamps Volume 2</div>
              <div className="w-full bg-gray-200 rounded h-3 mt-2 overflow-hidden">
                <div className="h-3 bg-green" style={{width: '4%'}}></div>
              </div>
              <div className="text-sm text-primary mt-1">15 / 340</div>
            </div>
          </div>
          <div className="mt-8 text-4xl font-serif text-primary">1027</div>
          <div className="mt-2 text-secondary-dark">TOTAL ITEMS ADDED</div>
        </aside>
      </div>
    </div>
  )
}

export default App;
