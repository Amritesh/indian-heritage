import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ItemCard } from '@/shared/ui/ItemCard';

const mockUseAuth = vi.fn();

vi.mock('@/features/auth/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const item = {
  id: 'coin-1',
  collectionId: 'mughals',
  collectionSlug: 'mughals',
  collectionName: 'Mughals',
  title: 'Gold Mohur of Akbar',
  subtitle: 'Mughal Empire',
  period: '1556-1605',
  dateText: 'ca. 1560',
  culture: 'Mughal',
  location: 'Agra',
  description: 'An imperial coin.',
  shortDescription: 'An imperial coin.',
  imageUrl: 'https://example.com/coin.jpg',
  imageAlt: 'Coin image',
  primaryMedia: null,
  gallery: [],
  materials: ['Gold'],
  tags: ['Akbar'],
  notes: [],
  pageNumber: 1,
  searchText: 'gold mohur akbar',
  searchKeywords: ['akbar'],
  denominationSystem: '',
  denominationKey: null,
  denominationRank: 0,
  denominationBaseValue: null,
  sortYearStart: 1556,
  sortYearEnd: 1605,
  estimatedPriceMin: 0,
  estimatedPriceMax: 0,
  estimatedPriceAvg: 0,
  weightGrams: null,
  sortYear: 1560,
  metadata: {},
};

describe('ItemCard', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it('renders an edit link for admins', () => {
    mockUseAuth.mockReturnValue({ isAdmin: true });

    render(
      <MemoryRouter>
        <ItemCard item={item} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /edit/i }).getAttribute('href')).toBe(
      '/admin/items/coin-1/edit',
    );
  });

  it('hides the edit link for non-admins', () => {
    mockUseAuth.mockReturnValue({ isAdmin: false });

    render(
      <MemoryRouter>
        <ItemCard item={item} />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('link', { name: /edit/i })).toBeNull();
  });
});
