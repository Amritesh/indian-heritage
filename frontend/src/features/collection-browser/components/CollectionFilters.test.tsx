import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CollectionFilters } from '@/features/collection-browser/components/CollectionFilters';

describe('CollectionFilters', () => {
  it('shows only search and sort controls', () => {
    render(
      <CollectionFilters
        searchValue=""
        onSearchChange={vi.fn()}
        sort="featured"
        onSortChange={vi.fn()}
      />,
    );

    expect(screen.getByPlaceholderText('Search within this collection...')).toBeTruthy();
    expect(screen.getByText('Sort by')).toBeTruthy();
    expect(screen.queryByText('Materiality')).toBeNull();
    expect(screen.queryByText('All materials')).toBeNull();
  });
});
