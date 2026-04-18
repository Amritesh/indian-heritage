import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useItem } from '@/entities/item/hooks/useItem';
import { RelatedItems } from '@/features/item-details/components/RelatedItems';
import { EmptyState } from '@/shared/ui/EmptyState';
import { DetailSkeleton } from '@/shared/ui/DetailSkeleton';
import { ErrorState } from '@/shared/ui/ErrorState';
import { ImageWithFallback } from '@/shared/ui/ImageWithFallback';
import { MetadataList } from '@/shared/ui/MetadataList';

export function ItemDetailPage() {
  const { itemId = '' } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { data: item, isLoading, isError, error } = useItem(itemId);

  if (isLoading) return <DetailSkeleton />;

  if (isError) {
    return (
      <div className="page-shell">
        <ErrorState message={(error as Error).message} />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="page-shell">
        <EmptyState
          title="Artifact not found"
          description="This record could not be found. Run the import script if the source item exists."
          actionLabel="Browse collections"
          actionTo="/collections"
          icon="search_off"
        />
      </div>
    );
  }

  const metadataItems = [
    { label: 'Denomination', value: item.metadata.denomination },
    { label: 'Ruler / Issuer', value: item.metadata.rulerOrIssuer },
    { label: 'Mint / Place', value: item.metadata.mintOrPlace },
    { label: 'Weight', value: item.metadata.weightEstimate },
    { label: 'Condition', value: item.metadata.condition, tone: 'accent' as const },
    { label: 'Catalog Ref.', value: item.metadata.seriesOrCatalog },
  ];

  return (
    <div className="page-shell">
      <section className="grid gap-12 lg:grid-cols-12 items-start">
        {/* Left: Image + Gallery */}
        <div className="lg:col-span-7 space-y-6">
          <div className="aspect-square bg-surface-container-low rounded-lg overflow-hidden relative group cursor-crosshair">
            <ImageWithFallback
              src={item.imageUrl}
              alt={item.imageAlt}
              className="transition-transform duration-700 group-hover:scale-150"
              wrapperClassName="aspect-square"
            />
            <div className="absolute bottom-6 right-6 bg-surface-container-lowest/80 backdrop-blur-md px-4 py-2 rounded-full border border-outline-variant/20 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">zoom_in</span>
              <span className="font-label text-[10px] font-bold uppercase tracking-wider">
                Hover to Inspect
              </span>
            </div>
          </div>
          {item.gallery.length > 0 && (
            <div className="flex gap-3">
              {item.gallery.slice(0, 4).map((media, idx) => (
                <div
                  key={media.gsUrl || idx}
                  className={`w-16 h-16 rounded overflow-hidden border-2 ${idx === 0 ? 'border-primary' : 'border-outline-variant/30 opacity-60 hover:opacity-100'} transition-opacity`}
                >
                  <ImageWithFallback src={media.downloadUrl} alt={media.alt} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Metadata Card */}
        <div className="lg:col-span-5 space-y-8">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2">
            <Link
              to="/collections"
              className="font-label text-[10px] font-bold uppercase tracking-widest text-outline hover:text-primary transition-colors"
            >
              Collections
            </Link>
            <span className="material-symbols-outlined text-xs text-outline">chevron_right</span>
            <Link
              to={`/collections/${item.collectionSlug}`}
              className="font-label text-[10px] font-bold uppercase tracking-widest text-outline hover:text-primary transition-colors"
            >
              {item.collectionName}
            </Link>
            <span className="material-symbols-outlined text-xs text-outline">chevron_right</span>
            <span className="font-label text-[10px] font-bold uppercase tracking-widest text-primary">
              Detail
            </span>
          </nav>

          {/* Title */}
          <div>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <h1 className="font-headline text-3xl md:text-4xl font-bold text-on-surface leading-tight">
                {item.title}
              </h1>
              {isAdmin && (
                <Link
                  to={`/admin/items/${item.id}/edit`}
                  className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 font-label text-[11px] font-bold uppercase tracking-widest text-primary transition-colors hover:bg-primary/15"
                  aria-label={`Edit item ${item.title}`}
                >
                  <span className="material-symbols-outlined text-sm">edit</span>
                  Edit Item
                </Link>
              )}
            </div>
            {item.subtitle && (
              <p className="mt-2 font-body text-lg text-on-surface-variant italic">{item.subtitle}</p>
            )}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {item.tags.map((tag) => (
              <button
                key={tag}
                type="button"
                className="archival-chip"
                onClick={() => navigate(`/collections/${item.collectionSlug}?tag=${encodeURIComponent(tag)}`)}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Archival Specifications */}
          <div className="bg-surface-container-low p-8 rounded-lg space-y-6">
            <h3 className="font-label text-xs font-bold uppercase tracking-[0.2em] text-primary border-b border-outline-variant/20 pb-4">
              Archival Specifications
            </h3>
            <MetadataList items={metadataItems} />

            {item.metadata.estimatedPriceInr && (
              <div className="pt-6 border-t border-outline-variant/20">
                <p className="metadata-label mb-1">Estimated Market Value</p>
                <p className="font-headline text-2xl font-bold text-on-surface">
                  {item.metadata.estimatedPriceInr}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Historical Notes Section */}
      <section className="mt-16 grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-8">
          <div className="space-y-4">
            <h3 className="font-headline text-3xl font-bold">Historical Context</h3>
            <div className="w-12 h-1 bg-secondary" />
          </div>
          <div className="prose prose-stone max-w-none text-on-surface-variant font-body leading-relaxed space-y-6 text-lg">
            <p>{item.description}</p>
          </div>

          {item.notes.length > 0 && (
            <div className="space-y-6">
              <h4 className="font-label text-xs font-bold uppercase tracking-widest text-outline">
                Scholarly Notes
              </h4>
              <div className="relative pl-8 space-y-6 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-outline-variant/30">
                {item.notes.map((note, index) => (
                  <div key={index} className="relative">
                    <div className="absolute -left-8 top-1 w-6 h-6 rounded-full bg-secondary border-4 border-background flex items-center justify-center" />
                    <p className="font-body text-sm leading-relaxed text-on-surface-variant">{note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-surface-container-highest p-6 rounded-lg border-l-4 border-primary">
            <h4 className="font-label text-xs font-bold uppercase tracking-widest mb-4">
              Collection Info
            </h4>
            <p className="font-body text-sm leading-relaxed text-on-surface-variant">
              This artifact belongs to the <strong>{item.collectionName}</strong> collection.
              {item.period && ` Dated to ${item.period}.`}
            </p>
          </div>

          {item.metadata.seriesOrCatalog && (
            <div className="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant/10 shadow-sm">
              <h4 className="font-label text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">verified_user</span>
                Catalog Reference
              </h4>
              <ul className="space-y-3">
                <li className="flex justify-between text-xs">
                  <span className="text-outline">Catalog #</span>
                  <span className="font-bold">{item.metadata.seriesOrCatalog}</span>
                </li>
                {item.materials.length > 0 && (
                  <li className="flex justify-between text-xs">
                    <span className="text-outline">Material</span>
                    <span className="font-bold">{item.materials.join(', ')}</span>
                  </li>
                )}
                {item.metadata.weightEstimate && (
                  <li className="flex justify-between text-xs">
                    <span className="text-outline">Weight</span>
                    <span className="font-bold">{item.metadata.weightEstimate}</span>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      </section>

      <RelatedItems item={item} />
    </div>
  );
}
