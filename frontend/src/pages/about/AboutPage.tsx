import { Link } from 'react-router-dom';

export function AboutPage() {
  return (
    <div className="page-shell">
      <section className="mb-16 text-center">
        <span className="eyebrow mb-4 block">About the Project</span>
        <h1 className="font-headline text-4xl md:text-5xl font-bold text-on-surface tracking-tight mb-6">
          The Digital Curator
        </h1>
        <p className="max-w-2xl mx-auto text-on-surface-variant text-lg leading-relaxed">
          A museum-grade digital archive preserving Indian heritage numismatics
          with scholarly detail, curatorial precision, and Firebase-first architecture.
        </p>
      </section>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 mb-16">
        {[
          {
            icon: 'account_balance',
            title: 'Heritage Preservation',
            description:
              'Every artifact is cataloged with denomination, ruler, mint, weight, condition, and scholarly notes preserved from original sources.',
          },
          {
            icon: 'storage',
            title: 'Firebase-First',
            description:
              'Data is imported once from source APIs, normalized, and stored in Firestore. The frontend reads from Firebase, not upstream endpoints.',
          },
          {
            icon: 'extension',
            title: 'Extensible Architecture',
            description:
              'New collections can be added by configuring a registry entry and running the importer. No page or component changes required.',
          },
          {
            icon: 'image_search',
            title: 'Media Strategy',
            description:
              'Images are served from Firebase Storage with fallback handling. The architecture supports future media ingestion pipelines.',
          },
          {
            icon: 'search',
            title: 'Search Ready',
            description:
              'Client-side search with weighted scoring today. The abstraction layer is designed for future Algolia or Meilisearch integration.',
          },
          {
            icon: 'verified_user',
            title: 'Secure by Default',
            description:
              'Firestore rules enforce read-only access for published items. Writes are restricted to admin import flows via service accounts.',
          },
        ].map((card) => (
          <div
            key={card.title}
            className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/10 hover:shadow-card transition-shadow"
          >
            <span className="material-symbols-outlined text-3xl text-primary mb-4 block">
              {card.icon}
            </span>
            <h3 className="font-headline text-xl font-bold text-on-surface mb-3">{card.title}</h3>
            <p className="text-on-surface-variant text-sm leading-relaxed">{card.description}</p>
          </div>
        ))}
      </div>

      <section className="bg-surface-container-low p-10 rounded-xl text-center">
        <h2 className="font-headline text-2xl font-bold text-on-surface mb-4">
          Active Collections
        </h2>
        <p className="text-on-surface-variant mb-8 max-w-xl mx-auto">
          Currently serving British India and Mughal numismatic collections with 142 cataloged artifacts.
        </p>
        <Link to="/collections" className="btn-primary inline-flex">
          Explore Collections
          <span className="material-symbols-outlined text-lg">arrow_forward</span>
        </Link>
      </section>
    </div>
  );
}
