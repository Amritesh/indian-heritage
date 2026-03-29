import { Link } from 'react-router-dom';
import { CollectionRecord } from '@/entities/collection/model/types';
import { formatItemCount } from '@/shared/lib/formatters';
import { ImageWithFallback } from '@/shared/ui/ImageWithFallback';

type CollectionCardProps = {
  collection: CollectionRecord;
};

export function CollectionCard({ collection }: CollectionCardProps) {
  return (
    <article className="bg-surface-container-high rounded-xl overflow-hidden shadow-sm group hover:shadow-card transition-all duration-500">
      <Link to={`/collections/${collection.slug}`} className="block">
        <div className="relative h-64 md:h-72 overflow-hidden">
          <ImageWithFallback
            src={collection.heroImage}
            alt={collection.name}
            className="transition-transform duration-700 group-hover:scale-105"
            wrapperClassName="h-64 md:h-72"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6">
            <span className="inline-block bg-secondary/90 text-on-secondary px-3 py-1 rounded-sm text-[10px] font-label font-bold uppercase tracking-widest mb-3">
              {collection.heroEyebrow}
            </span>
            <h3 className="font-headline text-2xl md:text-3xl text-white font-bold mb-1">
              {collection.displayName}
            </h3>
            <p className="text-white/80 font-body text-sm max-w-sm">
              {collection.periodLabel}
            </p>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-on-surface-variant text-sm leading-relaxed line-clamp-2">
            {collection.description}
          </p>
          <div className="flex justify-between items-center border-t border-outline-variant/20 pt-4">
            <span className="eyebrow-muted">
              {formatItemCount(collection.itemCount)}
            </span>
            <span className="text-primary font-label text-xs font-bold uppercase tracking-widest group-hover:translate-x-1 transition-transform flex items-center gap-1">
              Explore
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
