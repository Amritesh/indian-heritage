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
  {
    id: 'sultanate',
    slug: 'sultanate',
    name: 'Sultanate',
    description:
      'Front-view coin issues from the Delhi Sultanate and related successor states with normalized rulers, denominations, and mint metadata.',
    longDescription:
      'A structured survey of Sultanate coinage spanning Delhi, Bengal, Bahmani, and related traditions, prepared for collector-friendly sorting, tagging, and archival comparison.',
    sourceUrl:
      'https://us-central1-indian-heritage-gallery.cloudfunctions.net/app/api/items/sultanate',
    order: 4,
    enabled: true,
    heroEyebrow: 'Sultanate Coinage',
    culture: 'Delhi Sultanate',
    periodLabel: 'c. 1193 to 1545',
  },
  {
    id: 'indian-foreign-rulers-1-1',
    slug: 'indian-foreign-rulers',
    name: 'Indian Foreign Rulers',
    description:
      'Portuguese, Danish, Dutch, French, and related foreign-ruled Indian coinage with annotated reference pages.',
    longDescription:
      'A structured archive of foreign-ruler coinage from India, including Portuguese India, Danish India, Dutch VOC, and Indo-French issues, normalized for archive browsing, paired-page ingest, and future comparison.',
    sourceUrl:
      'https://us-central1-indian-heritage-gallery.cloudfunctions.net/app/api/items/indian-foreign-rulers',
    order: 5,
    enabled: true,
    heroEyebrow: 'European Colonial India',
    culture: 'Foreign Rulers in India',
    periodLabel: 'c. 1498 to 1961',
  },
  {
    id: 'early-coinage',
    slug: 'early-coinage',
    name: 'Early Coinage',
    description:
      'Early Indian coinage, including Gupta-era and related issues, with archival provenance and estimated value metadata.',
    longDescription:
      'A curated archive of early Indian coinage that keeps provenance, ruler, mint, denomination, and estimated value fields intact for browsing and search.',
    sourceUrl:
      'https://us-central1-indian-heritage-gallery.cloudfunctions.net/app/api/items/early-coinage',
    order: 6,
    enabled: true,
    heroEyebrow: 'Ancient Indian Coinage',
    culture: 'Early Indian Coinage',
    periodLabel: 'c. 4th to 6th century CE',
  },
  {
    id: 'regular-1-1',
    slug: 'regular',
    name: 'Regular',
    description: 'Post-independence regular circulation coins of India.',
    longDescription:
      'A structured survey of Republic of India regular circulation coinage, including year-wise and mint-wise issues, normalized for archival browsing.',
    sourceUrl:
      'https://us-central1-indian-heritage-gallery.cloudfunctions.net/app/api/items/regular',
    order: 7,
    enabled: true,
    heroEyebrow: 'Republic of India',
    culture: 'Post Independence',
    periodLabel: '1950 - Present',
  },
];

export function getCollectionRegistryEntry(slug: string) {
  return collectionRegistry.find((entry) => entry.slug === slug);
}
