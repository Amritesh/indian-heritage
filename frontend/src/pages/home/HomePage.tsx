import { useQuery } from '@tanstack/react-query';
import { getArchivePublicStatsFromApi } from '@/entities/archive/api/archiveStatsClient';
import { formatArchiveWorth } from '@/entities/archive/api/archiveStatsService';
import { FeaturedHighlights } from '@/features/home/components/FeaturedHighlights';
import { HomeSpotlight } from '@/features/home/components/HomeSpotlight';
import { HeroBanner } from '@/shared/ui/HeroBanner';

export function HomePage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['home', 'archive-stats'],
    queryFn: getArchivePublicStatsFromApi,
    staleTime: 1000 * 60 * 10,
  });

  const statCards = [
    {
      value: isLoading ? '…' : stats?.items?.toLocaleString() ?? '0',
      label: 'Artifacts',
      icon: 'monetization_on',
    },
    {
      value: isLoading ? '…' : String(stats?.collections ?? 0),
      label: 'Collections',
      icon: 'collections_bookmark',
    },
    {
      value: isLoading ? '…' : String(stats?.materials ?? 0),
      label: 'Materials',
      icon: 'category',
    },
    {
      value: isLoading ? '…' : formatArchiveWorth(stats?.totalWorth),
      label: 'Est. Worth',
      icon: 'payments',
    },
  ];

  return (
    <>
      <section className="page-shell pt-8">
        <HeroBanner />
      </section>

      {/* Live Archive Stats Bento */}
      <section className="page-shell pt-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {statCards.map((stat) => (
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
