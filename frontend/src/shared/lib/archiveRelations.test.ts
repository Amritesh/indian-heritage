import { describe, expect, it } from 'vitest';
import { buildItemSimilarityRelations } from '@/shared/lib/archiveRelations';

function buildItem(overrides: Partial<Parameters<typeof buildItemSimilarityRelations>[0][number]>) {
  return {
    id: 'item-1',
    conceptualItemId: 'concept-1',
    collectionId: 'collection-1',
    title: 'Sample coin',
    rulerOrIssuer: '',
    mintOrPlace: '',
    denomination: '',
    materials: [],
    publicTags: [],
    ...overrides,
  };
}

describe('buildItemSimilarityRelations', () => {
  it('prioritizes same issue/type matches over weaker similarities', () => {
    const relations = buildItemSimilarityRelations([
      buildItem({
        id: 'a',
        conceptualItemId: 'concept-akbar-rupee',
        collectionId: 'mughals',
        rulerOrIssuer: 'Akbar',
        mintOrPlace: 'Agra',
        denomination: 'Rupee',
        materials: ['Silver'],
        publicTags: ['Mughals', 'Silver', 'Rupee'],
      }),
      buildItem({
        id: 'b',
        conceptualItemId: 'concept-akbar-rupee',
        collectionId: 'mughals',
        rulerOrIssuer: 'Akbar',
        mintOrPlace: 'Agra',
        denomination: 'Rupee',
        materials: ['Silver'],
        publicTags: ['Mughals', 'Silver', 'Rupee'],
      }),
      buildItem({
        id: 'c',
        conceptualItemId: 'concept-akbar-dam',
        collectionId: 'mughals',
        rulerOrIssuer: 'Akbar',
        mintOrPlace: 'Lahore',
        denomination: 'Dam',
        materials: ['Copper'],
        publicTags: ['Mughals', 'Copper', 'Dam'],
      }),
    ]);

    const sourceA = relations.filter((row) => row.sourceId === 'a');
    expect(sourceA[0]).toMatchObject({
      relatedId: 'b',
      relationType: 'same_type',
      reason: 'Same issue/type',
    });
    expect(sourceA[0].score).toBeGreaterThan(sourceA[1].score);
  });

  it('limits stored relations per source item to the highest-scoring matches', () => {
    const items = [
      buildItem({
        id: 'seed',
        conceptualItemId: 'seed-concept',
        collectionId: 'british',
        rulerOrIssuer: 'George V',
        mintOrPlace: 'Calcutta',
        denomination: '1/2 Pice',
        materials: ['Bronze'],
        publicTags: ['British India', 'Bronze', 'Calcutta'],
      }),
      ...Array.from({ length: 8 }, (_, index) =>
        buildItem({
          id: `related-${index + 1}`,
          conceptualItemId: `concept-${index + 1}`,
          collectionId: 'british',
          rulerOrIssuer: 'George V',
          mintOrPlace: index < 4 ? 'Calcutta' : 'Bombay',
          denomination: index % 2 === 0 ? '1/2 Pice' : '1/4 Anna',
          materials: ['Bronze'],
          publicTags: ['British India', 'Bronze'],
        }),
      ),
    ];

    const relations = buildItemSimilarityRelations(items, { maxRelationsPerItem: 4 });
    const seedRelations = relations.filter((row) => row.sourceId === 'seed');

    expect(seedRelations).toHaveLength(4);
    expect(seedRelations.every((row) => row.score > 0)).toBe(true);
    expect(seedRelations[0].score).toBeGreaterThanOrEqual(seedRelations[3].score);
  });
});
