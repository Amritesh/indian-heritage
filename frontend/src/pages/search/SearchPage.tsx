import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchItems } from '@/entities/item/api/itemService';
import { SearchResults } from '@/features/search/components/SearchResults';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { queryKeys } from '@/shared/lib/queryKeys';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { ItemSkeletonGrid } from '@/shared/ui/Skeletons';

export function SearchPage() {
  const [term, setTerm] = useState('');
  const debouncedTerm = useDebouncedValue(term, 300);
  const shouldSearch = debouncedTerm.trim().length >= 2;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.search(debouncedTerm),
    queryFn: () => searchItems(debouncedTerm),
    enabled: shouldSearch,
  });

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
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search by Era, Ruler, or Mint..."
              type="search"
            />
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
            </div>
          )}
          <SearchResults items={data} term={debouncedTerm} />
        </>
      )}
    </div>
  );
}
