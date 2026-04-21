import { describe, expect, it } from 'vitest';
import { buildMigrationPayload, parseArchiveImportArgs } from './import-supabase-archive';

describe('buildMigrationPayload', () => {
  it('creates unique item identities when source snapshots reuse local item ids across batches', () => {
    const payload = buildMigrationPayload({
      exportedAt: '2026-04-19T00:00:00.000Z',
      source: 'firebase-firestore',
      collection: {
        slug: 'mughals',
        name: 'Mughals',
        displayName: 'Mughals',
        description: 'Imperial coinage',
        longDescription: 'Imperial coinage',
        culture: 'Mughal Empire',
        periodLabel: 'c. 1600s',
        heroImage: 'images/mughals/cover.png',
        sortOrder: 1,
      },
      items: [
        {
          id: 'mughals-coin-1',
          title: 'Silver Rupee - Jahangir',
          period: 'AH 1028 / 1618-1619 AD',
          dateText: 'AH 1028 / 1618-1619 AD',
          location: 'Patna',
          description: 'First source batch',
          primaryMedia: {
            storagePath: 'images/mughals-auto/coin_1.png',
          },
          metadata: {
            type: 'coin',
            denomination: 'Rupee',
            rulerOrIssuer: 'Jahangir',
            mintOrPlace: 'Patna',
            seriesOrCatalog: 'KM# 145.12',
          },
        },
        {
          id: 'mughals-coin-1',
          title: 'Rupee - Shah Jahan I',
          period: 'AH 1037-1068 / 1628-1658 AD',
          dateText: 'AH 1037-1068 / 1628-1658 AD',
          location: 'Lahore',
          description: 'Second source batch',
          primaryMedia: {
            storagePath: 'images/mughals-auto2/coin_1.png',
          },
          metadata: {
            type: 'coin',
            denomination: 'Rupee',
            rulerOrIssuer: 'Shah Jahan I',
            mintOrPlace: 'Lahore',
            seriesOrCatalog: 'KM# 222',
          },
        },
      ],
    });

    expect(payload.items).toHaveLength(2);
    expect(new Set(payload.items.map((row) => row.canonical_id)).size).toBe(2);
    expect(new Set(payload.items.map((row) => row.slug)).size).toBe(2);
    expect(new Set(payload.numismatic_item_profiles.map((row) => row.item_id)).size).toBe(2);
    expect(payload.items.map((row) => row.source_reference)).toEqual([
      'images/mughals-auto/coin_1.png',
      'images/mughals-auto2/coin_1.png',
    ]);
  });

  it('never emits sort_year_end < sort_year_start when explicit AD start collides with AH-derived end', () => {
    // Reproduces mughals-mughals-item-50: explicit 1713 AD start anchor blended with
    // "c. 1713 AD (AH 1124-1125)" whose AH conversion derives an end of 1712.
    const payload = buildMigrationPayload({
      exportedAt: '2026-04-19T00:00:00.000Z',
      source: 'firebase-firestore',
      collection: {
        slug: 'mughals',
        name: 'Mughals',
        displayName: 'Mughals',
        description: '',
        longDescription: '',
        culture: 'Mughal Empire',
        periodLabel: 'c. 1700s',
        heroImage: '',
        sortOrder: 1,
      },
      items: [
        {
          id: 'mughals-item-50',
          title: 'Regnal Year 1 rupee — Farrukhsiyar',
          period: '',
          dateText: 'c. 1713 AD (Regnal Year 1 / AH 1124-1125)',
          location: 'Shahjahanabad',
          description: 'explicit-and-derived collision case',
          sortYearStart: 1713,
          metadata: {
            type: 'coin',
            denomination: 'Rupee',
            rulerOrIssuer: 'Farrukhsiyar',
            mintOrPlace: 'Shahjahanabad',
          },
        },
      ],
    } as any);

    const row = payload.items[0];
    expect(row.sort_year_start).not.toBeNull();
    expect(row.sort_year_end).not.toBeNull();
    // Invariant: end must never be strictly less than start.
    expect((row.sort_year_end as number) >= (row.sort_year_start as number)).toBe(true);
  });

  it('preserves a coherent multi-year range when both anchors are explicit', () => {
    const payload = buildMigrationPayload({
      exportedAt: '2026-04-19T00:00:00.000Z',
      source: 'firebase-firestore',
      collection: {
        slug: 'mughals',
        name: 'Mughals',
        displayName: 'Mughals',
        description: '',
        longDescription: '',
        culture: 'Mughal Empire',
        periodLabel: '1605-1627',
        heroImage: '',
        sortOrder: 1,
      },
      items: [
        {
          id: 'mughals-item-jahangir',
          title: 'Jahangir mohur',
          period: '1605-1627 AD',
          dateText: '1605-1627 AD',
          location: 'Agra',
          description: '',
          sortYearStart: 1605,
          sortYearEnd: 1627,
          metadata: { type: 'coin', denomination: 'Mohur', rulerOrIssuer: 'Jahangir' },
        },
      ],
    } as any);

    const row = payload.items[0];
    expect(row.sort_year_start).toBe(1605);
    expect(row.sort_year_end).toBe(1627);
  });
});

describe('parseArchiveImportArgs', () => {
  it('parses replacement cleanup before ingesting a collection', () => {
    expect(parseArchiveImportArgs(['regular-1-1', '--replace'])).toEqual({
      target: 'regular-1-1',
      collectionSlug: undefined,
      replace: true,
    });
  });

  it('parses explicit collection slug and replace flag together', () => {
    expect(parseArchiveImportArgs(['temp/images/regular-1-1/paired_output/catalogue_all.json', '--collection', 'regular-1-1', '--replace'])).toEqual({
      target: 'temp/images/regular-1-1/paired_output/catalogue_all.json',
      collectionSlug: 'regular-1-1',
      replace: true,
    });
  });
});
