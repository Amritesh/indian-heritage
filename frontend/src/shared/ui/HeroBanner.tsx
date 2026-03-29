import { Link } from 'react-router-dom';

export function HeroBanner() {
  return (
    <section className="relative overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-0 items-center bg-surface-container-low rounded-xl overflow-hidden min-h-[450px]">
        <div className="md:col-span-5 p-8 md:p-12 z-10">
          <span className="eyebrow mb-4 block">The Digital Curator Presents</span>
          <h2 className="font-headline text-4xl md:text-5xl lg:text-6xl text-on-surface font-bold leading-tight mb-6">
            Explore India Through Its Heritage
          </h2>
          <p className="font-body text-lg text-on-surface-variant mb-8 max-w-sm leading-relaxed">
            A scholarly sanctuary for the preservation and study of Indian
            numismatics and heritage artifacts.
          </p>
          <Link to="/collections" className="btn-primary">
            Enter the Archive
            <span className="material-symbols-outlined text-lg">arrow_right_alt</span>
          </Link>
        </div>
        <div className="md:col-span-7 h-full relative min-h-[300px] bg-surface-container">
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="material-symbols-outlined text-[160px] text-primary/10">account_balance</span>
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-surface-container-low via-transparent to-transparent" />
        </div>
      </div>
    </section>
  );
}
