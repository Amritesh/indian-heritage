import { FeaturedHighlights } from '@/features/home/components/FeaturedHighlights';
import { HomeSpotlight } from '@/features/home/components/HomeSpotlight';
import { HeroBanner } from '@/shared/ui/HeroBanner';

export function HomePage() {
  return (
    <>
      <section className="page-shell pt-8">
        <HeroBanner />
      </section>

      {/* Collection Stats Bento */}
      <section className="page-shell pt-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { value: '142', label: 'Artifacts', icon: 'monetization_on' },
            { value: 'II', label: 'Collections', icon: 'collections_bookmark' },
            { value: '2', label: 'Dynasties', icon: 'castle' },
            { value: '12+', label: 'Mints', icon: 'location_on' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-surface-container-high p-6 rounded-xl text-center space-y-2"
            >
              <span className="material-symbols-outlined text-primary text-2xl">{stat.icon}</span>
              <div className="font-headline text-2xl font-bold text-primary italic">{stat.value}</div>
              <div className="font-label text-[10px] uppercase tracking-widest text-outline">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      <FeaturedHighlights />
      <HomeSpotlight />
    </>
  );
}
