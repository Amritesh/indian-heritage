import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { CollectionCard } from '@/shared/ui/CollectionCard';

describe('CollectionCard', () => {
  it('renders collection content and link', () => {
    render(
      <MemoryRouter>
        <CollectionCard
          collection={{
            id: 'mughals',
            slug: 'mughals',
            name: 'Mughals',
            displayName: 'Mughals',
            description: 'Imperial silver coinage.',
            longDescription: 'Imperial silver coinage with Elahi month references.',
            heroEyebrow: 'Imperial Silver',
            culture: 'Mughal Empire',
            periodLabel: 'c. 1613 to 1619',
            sourceUrl: 'https://example.com',
            heroImage: 'https://example.com/image.jpg',
            thumbnailImage: 'https://example.com/image.jpg',
            itemCount: 90,
            filterableMaterials: ['Silver'],
            estimatedWorth: 0,
            sortOrder: 2,
            status: 'active',
            enabled: true,
            lastSyncedAt: null,
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /explore/i }).getAttribute('href')).toBe(
      '/collections/mughals',
    );
    expect(screen.getByText('Imperial silver coinage.')).toBeTruthy();
  });
});
