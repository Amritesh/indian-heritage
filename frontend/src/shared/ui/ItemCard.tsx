import { Link, useNavigate } from 'react-router-dom';
import { ItemRecord } from '@/entities/item/model/types';
import { ImageWithFallback } from '@/shared/ui/ImageWithFallback';

type ItemCardProps = {
  item: ItemRecord;
  tagHrefBuilder?: (tag: string) => string;
};

export function ItemCard({ item, tagHrefBuilder }: ItemCardProps) {
  const navigate = useNavigate();

  function handleTagClick(event: React.MouseEvent, tag: string) {
    event.preventDefault();
    event.stopPropagation();
    const href = tagHrefBuilder ? tagHrefBuilder(tag) : `/search?tag=${encodeURIComponent(tag)}`;
    navigate(href);
  }

  return (
    <article className="bg-surface-container-high rounded-xl overflow-hidden shadow-sm group hover:shadow-card transition-all duration-500">
      <Link to={`/items/${item.id}`} className="block">
        <div className="h-56 relative overflow-hidden bg-surface-container-lowest">
          <ImageWithFallback
            src={item.imageUrl}
            alt={item.imageAlt}
            objectFit="contain"
            className="transition-transform duration-700 group-hover:scale-105 p-2"
            wrapperClassName="h-56"
          />
          {item.materials.length > 0 && (
            <div className="absolute top-3 right-3 bg-surface-container-lowest/90 backdrop-blur-sm text-on-surface-variant px-2 py-1 rounded-sm text-[10px] font-label font-bold tracking-wider uppercase">
              {item.materials[0]}
            </div>
          )}
        </div>
        <div className="p-5 space-y-3">
          <div>
            <div className="flex justify-between items-start mb-1">
              <h3 className="font-headline text-lg font-bold text-on-surface leading-tight line-clamp-2">
                {item.title}
              </h3>
            </div>
            {item.subtitle && (
              <p className="text-sm text-on-surface-variant italic line-clamp-1">{item.subtitle}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {item.tags.slice(0, 3).map((tag) => (
              <button
                key={tag}
                type="button"
                className="archival-chip"
                onClick={(event) => handleTagClick(event, tag)}
              >
                {tag}
              </button>
            ))}
          </div>

          <div className="flex justify-between items-center border-t border-outline-variant/10 pt-3">
            <span className="eyebrow-muted">
              {item.period || 'Undated'} {item.location ? `\u2022 ${item.location}` : ''}
            </span>
            <span className="text-primary font-label text-xs font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
              View
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
