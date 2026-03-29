import { useQuery } from '@tanstack/react-query';
import { collection, getCountFromServer, getDocs, query, where, Query, DocumentData } from 'firebase/firestore';
import { FeaturedHighlights } from '@/features/home/components/FeaturedHighlights';
import { HomeSpotlight } from '@/features/home/components/HomeSpotlight';
import { HeroBanner } from '@/shared/ui/HeroBanner';
import { formatCurrency } from '@/shared/lib/formatters';
import { getFirestoreOrThrow } from '@/shared/services/firestore';
import { firestore } from '@/shared/config/firebase';
import { collectionRegistry } from '@/shared/config/collections';

async function getArchiveStats() {
  if (!firestore) {
    // Fallback stats from registry
    return {
      items: 1240, // Static estimate for fallback mode
      collections: collectionRegistry.length,
      materials: 4,
      totalWorth: 25000,
    };
  }
  const db = getFirestoreOrThrow();
  const publishedQ: Query<DocumentData> = query(
    collection(db, 'items'),
    where('published', '==', true),
  );
  const [itemSnap, collectionSnap, collSnap] = await Promise.all([
    getCountFromServer(publishedQ),
    getCountFromServer(collection(db, 'collections')),
    getDocs(collection(db, 'collections')),
  ]);

  const totalWorth = collSnap.docs.reduce(
    (sum, d) => sum + Number(d.data().estimatedWorth ?? 0),
    0,
  );

  const allMaterials = new Set<string>();
  collSnap.docs.forEach((d) => {
    const mats = d.data().filterableMaterials as string[] | undefined;
    mats?.forEach((m) => allMaterials.add(m));
  });

  return {
    items: itemSnap.data().count,
    collections: collectionSnap.data().count,
    materials: allMaterials.size,
    totalWorth,
  };
}

export function HomePage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['home', 'archive-stats'],
    queryFn: getArchiveStats,
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
      value: isLoading ? '…' : (stats?.totalWorth ? formatCurrency(stats.totalWorth) : '—'),
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
