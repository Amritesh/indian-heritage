import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t border-outline-variant/20 bg-surface-container-low/50">
      <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <span className="eyebrow">Indian Heritage Gallery</span>
          <p className="max-w-md text-sm text-on-surface-variant leading-relaxed">
            A museum-grade digital archive preserving Indian heritage numismatics
            with scholarly detail and curatorial precision.
          </p>
        </div>
        <div className="flex items-center gap-8">
          <nav className="flex flex-wrap gap-6 font-label text-xs uppercase tracking-widest text-outline">
            <Link to="/collections" className="hover:text-primary transition-colors">
              Collections
            </Link>
            <Link to="/search" className="hover:text-primary transition-colors">
              Search
            </Link>
            <Link to="/about" className="hover:text-primary transition-colors">
              About
            </Link>
          </nav>
        </div>
      </div>
      <div className="border-t border-outline-variant/10 py-4 px-6">
        <p className="text-center font-label text-[9px] uppercase tracking-widest text-outline/50">
          Indian Heritage Gallery
        </p>
      </div>
    </footer>
  );
}
