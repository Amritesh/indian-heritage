export type CollectionRegistryEntry = {
  id: string;
  slug: string;
  name: string;
  description: string;
  longDescription: string;
  sourceUrl: string;
  order: number;
  enabled: boolean;
  heroEyebrow: string;
  culture: string;
  periodLabel: string;
};

export const collectionRegistry: CollectionRegistryEntry[] = [
  {
    id: 'british',
    slug: 'british',
    name: 'British India',
    description:
      'Circulation issues, mint marks, and imperial coinage from the late colonial period.',
    longDescription:
      'A structured survey of British India coinage with denomination, mint, weight, condition, and catalog references normalized for archival browsing.',
    sourceUrl:
      'https://us-central1-indian-heritage-gallery.cloudfunctions.net/app/api/items/british',
    order: 1,
    enabled: true,
    heroEyebrow: 'Colonial Numismatics',
    culture: 'British India',
    periodLabel: 'c. 1930s to 1940s',
  },
  {
    id: 'mughals',
    slug: 'mughals',
    name: 'Mughals',
    description:
      'Elahi month rupees and imperial silver coinage from the Mughal court.',
    longDescription:
      'A close reading of Mughal silver issues centered on Jahangir-era rupees, preserving metadata for period, mint, denomination, market range, and historical notes.',
    sourceUrl:
      'https://us-central1-indian-heritage-gallery.cloudfunctions.net/app/api/items/mughals',
    order: 2,
    enabled: true,
    heroEyebrow: 'Imperial Silver',
    culture: 'Mughal Empire',
    periodLabel: 'c. 1613 to 1619',
  },
  {
    id: 'princely-states',
    slug: 'princely-states',
    name: 'Princely States',
    description:
      'Regional issues from Indian princely states, spanning silver, copper, and mixed-metal coinage across local dynasties.',
    longDescription:
      'A survey of coinage from the princely states of India, bringing together region-specific issues with draft metadata for ruler, mint, denomination, price range, and provenance so the archive can be reviewed and refined collection-wide.',
    sourceUrl:
      'https://us-central1-indian-heritage-gallery.cloudfunctions.net/app/api/items/princely-states',
    order: 3,
    enabled: true,
    heroEyebrow: 'Regional Coinage',
    culture: 'Princely States of India',
    periodLabel: 'c. 1700s to early 1900s',
  },
];

export function getCollectionRegistryEntry(slug: string) {
  return collectionRegistry.find((entry) => entry.slug === slug);
}
