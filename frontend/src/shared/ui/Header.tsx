import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/shared/lib/cn';

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/collections', label: 'Explore' },
  { to: '/search', label: 'Search' },
  { to: '/about', label: 'About' },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#fdfcf0]/80 backdrop-blur-xl shadow-sm">
        <div className="flex justify-between items-center px-6 py-4 w-full max-w-7xl mx-auto">
          <Link to="/" className="flex items-center gap-4">
            <span className="material-symbols-outlined text-primary text-2xl">account_balance</span>
            <h1 className="font-headline text-primary italic text-xl tracking-tight font-semibold">
              The Digital Curator
            </h1>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <nav className="flex items-center gap-8">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'font-label text-sm font-medium uppercase tracking-wider transition-all duration-400',
                      isActive
                        ? 'text-primary scale-105'
                        : 'text-on-surface/70 hover:text-primary',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="h-6 w-px bg-primary/20" />
            <button
              onClick={() => navigate('/search')}
              className="text-primary hover:bg-primary/5 p-2 rounded-full transition-colors duration-400"
              aria-label="Search"
            >
              <span className="material-symbols-outlined">search</span>
            </button>
          </div>

          <button
            className="md:hidden text-primary hover:bg-primary/5 p-2 rounded-full transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <span className="material-symbols-outlined">
              {mobileOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
        <div className="bg-outline-variant/30 h-px w-full" />
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-on-surface/20" onClick={() => setMobileOpen(false)} />
          <nav className="absolute right-0 top-0 h-full w-72 bg-surface-container-lowest shadow-ambient p-8 space-y-6">
            <div className="flex justify-between items-center mb-8">
              <span className="font-headline text-primary italic text-lg font-semibold">Menu</span>
              <button onClick={() => setMobileOpen(false)} className="text-outline p-1">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'block font-label text-sm font-bold uppercase tracking-widest py-3 border-b border-outline-variant/20 transition-colors',
                    isActive ? 'text-primary' : 'text-on-surface/70 hover:text-primary',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
