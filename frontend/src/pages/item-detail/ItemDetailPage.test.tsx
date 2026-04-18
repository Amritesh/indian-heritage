import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ItemDetailPage } from '@/pages/item-detail/ItemDetailPage';

const mockUseAuth = vi.fn();
const mockUseItem = vi.fn();

vi.mock('@/features/auth/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/entities/item/hooks/useItem', () => ({
  useItem: (...args: unknown[]) => mockUseItem(...args),
}));

vi.mock('@/features/item-details/components/RelatedItems', () => ({
  RelatedItems: () => <div>Related items</div>,
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

describe('ItemDetailPage', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockUseItem.mockReset();
    mockUseItem.mockReturnValue({
      data: item,
      isLoading: false,
      isError: false,
      error: null,
    });
  });

  it('renders an edit link for admins', () => {
    mockUseAuth.mockReturnValue({ isAdmin: true });

    render(
      <MemoryRouter initialEntries={['/items/coin-1']}>
        <Routes>
          <Route path="/items/:itemId" element={<ItemDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /edit item/i }).getAttribute('href')).toBe(
      '/admin/items/coin-1/edit',
    );
  });

  it('hides the edit link for non-admins', () => {
    mockUseAuth.mockReturnValue({ isAdmin: false });

    render(
      <MemoryRouter initialEntries={['/items/coin-1']}>
        <Routes>
          <Route path="/items/:itemId" element={<ItemDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByRole('link', { name: /edit item/i })).toBeNull();
  });
});
