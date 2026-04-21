import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { searchItems } from '@/entities/item/api/itemService';
import { ItemSort } from '@/entities/item/model/types';
import { SearchResults } from '@/features/search/components/SearchResults';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { queryKeys } from '@/shared/lib/queryKeys';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { ItemSkeletonGrid } from '@/shared/ui/Skeletons';

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const term = searchParams.get('q') ?? '';
  const tag = searchParams.get('tag') ?? '';
  const sort = (searchParams.get('sort') as ItemSort | null) ?? 'featured';
  const debouncedTerm = useDebouncedValue(term, 300);
  const shouldSearch = debouncedTerm.trim().length >= 2 || tag.trim().length > 0;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.search(debouncedTerm, undefined, tag, sort),
    queryFn: () => searchItems(debouncedTerm, undefined, tag, sort),
    enabled: shouldSearch,
  });

  const updateSearchParams = (next: { q?: string; tag?: string; sort?: ItemSort }) => {
    const nextParams = new URLSearchParams(searchParams);
    
    if ('q' in next) {
      if (next.q) nextParams.set('q', next.q);
      else nextParams.delete('q');
    }
    
    if ('tag' in next) {
      if (next.tag) nextParams.set('tag', next.tag);
      else nextParams.delete('tag');
    }

    if ('sort' in next) {
      if (next.sort && next.sort !== 'featured') nextParams.set('sort', next.sort);
      else nextParams.delete('sort');
    }

    setSearchParams(nextParams, { replace: true });
  };

  return (
    <div className="page-shell">
      {/* Search Hero */}
      <section className="mb-12 text-center">
        <h1 className="font-headline text-4xl md:text-6xl font-semibold mb-6 text-on-surface tracking-tight">
          Search the <span className="italic text-primary">Archive</span>
        </h1>
        <p className="max-w-2xl mx-auto text-on-surface-variant font-body mb-10 text-lg leading-relaxed">
          Search across all imported collections by title, ruler, mint, material,
          catalog number, or historical notes.
        </p>

        {/* Search Bar */}
        <div className="max-w-3xl mx-auto relative">
          <div className="bg-surface-container-low p-2 rounded-xl flex items-center shadow-lg ring-1 ring-outline-variant/20">
            <span className="material-symbols-outlined ml-4 text-primary">search</span>
            <input
              className="w-full bg-transparent border-none focus:ring-0 text-lg font-body px-4 py-3 placeholder:text-outline-variant"
              value={term}
              onChange={(e) => {
                updateSearchParams({ q: e.target.value });
              }}
              placeholder="Search by Era, Ruler, or Mint..."
              type="search"
            />
            <select
              className="mr-3 rounded-lg border border-outline-variant/20 bg-surface px-3 py-2 text-sm text-on-surface"
              value={sort}
              onChange={(event) => {
                updateSearchParams({ sort: event.target.value as ItemSort });
              }}
            >
              <option value="featured">Best match</option>
              <option value="title">Title</option>
              <option value="recent">Recently added</option>
              <option value="year_asc">Year: oldest first</option>
              <option value="year_desc">Year: newest first</option>
              <option value="price_desc">Estimated price: high to low</option>
              <option value="price_asc">Estimated price: low to high</option>
              <option value="denomination_asc">Denomination</option>
            </select>
            <span className="hidden md:inline text-xs font-label text-outline uppercase tracking-widest mr-4">
              Cmd + K
            </span>
          </div>
        </div>
      </section>

      {/* Results */}
      {!shouldSearch && (
        <EmptyState
          title="Search the archive"
          description="Enter at least two characters to search across all imported records."
          icon="search"
        />
      )}
      {tag && (
        <div className="mb-4 flex items-center gap-3">
          <span className="metadata-label">Filtered tag</span>
          <button
            className="archival-chip"
            onClick={() => {
              updateSearchParams({ tag: '' });
            }}
          >
            {tag}
            <span className="material-symbols-outlined text-[14px] ml-2">close</span>
          </button>
        </div>
      )}
      {isLoading && <ItemSkeletonGrid />}
      {isError && <ErrorState message={(error as Error).message} />}
      {shouldSearch && data && (
        <>
          {data.length > 0 && (
            <div className="mb-6 flex items-center gap-3">
              <span className="w-8 h-px bg-primary/30" />
              <h2 className="font-headline text-xl font-semibold text-on-surface">
                {data.length} result{data.length !== 1 ? 's' : ''} found
              </h2>
              <span className="text-xs uppercase tracking-wider text-outline">
                Sorted by {sort === 'featured' ? 'best match' : sort.replace('_', ' ')}
              </span>
            </div>
          )}
          <SearchResults items={data} term={debouncedTerm} tag={tag} />
        </>
      )}
    </div>
  );
}
