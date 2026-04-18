export type RelationSeedItem = {
  id: string;
  conceptualItemId?: string | null;
  collectionId?: string | null;
  title?: string;
  rulerOrIssuer?: string | null;
  mintOrPlace?: string | null;
  denomination?: string | null;
  materials?: string[];
  publicTags?: string[];
};

export type GeneratedRelation = {
  sourceId: string;
  relatedId: string;
  relationType: string;
  score: number;
  reason: string;
};

type RelationCandidate = {
  relationType: string;
  score: number;
  reason: string;
};

function normalizeToken(value: string | null | undefined) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeTokens(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map(normalizeToken).filter(Boolean)));
}

function scorePair(left: RelationSeedItem, right: RelationSeedItem): RelationCandidate | null {
  const sameConcept = left.conceptualItemId && right.conceptualItemId && left.conceptualItemId === right.conceptualItemId;
  if (sameConcept) {
    return { relationType: 'same_type', score: 1, reason: 'Same issue/type' };
  }

  const sameIssuer = normalizeToken(left.rulerOrIssuer) && normalizeToken(left.rulerOrIssuer) === normalizeToken(right.rulerOrIssuer);
  const sameMint = normalizeToken(left.mintOrPlace) && normalizeToken(left.mintOrPlace) === normalizeToken(right.mintOrPlace);
  const sameDenomination =
    normalizeToken(left.denomination) && normalizeToken(left.denomination) === normalizeToken(right.denomination);
  const sameMaterial = normalizeTokens(left.materials ?? []).some((material) => normalizeTokens(right.materials ?? []).includes(material));
  const sameCollection = left.collectionId && right.collectionId && left.collectionId === right.collectionId;
  const leftTags = normalizeTokens(left.publicTags ?? []);
  const rightTags = normalizeTokens(right.publicTags ?? []);
  const sharedTagCount = leftTags.filter((tag) => rightTags.includes(tag)).length;

  if (sameIssuer && sameDenomination && sameMint) {
    return { relationType: 'similar', score: 0.92, reason: 'Same ruler/issuer, denomination, and mint' };
  }
  if (sameIssuer && sameDenomination) {
    return { relationType: 'similar', score: 0.84, reason: 'Same ruler/issuer and denomination' };
  }
  if (sameIssuer && sameMint) {
    return { relationType: 'similar', score: 0.79, reason: 'Same ruler/issuer and mint' };
  }
  if (sameIssuer) {
    return { relationType: 'similar', score: 0.72, reason: 'Same ruler/issuer' };
  }
  if (sameDenomination && sameMint) {
    return { relationType: 'similar', score: 0.62, reason: 'Same denomination and mint' };
  }
  if (sameDenomination && sameMaterial) {
    return { relationType: 'similar', score: 0.56, reason: 'Same denomination and material' };
  }
  if (sameMint && sharedTagCount >= 1) {
    return { relationType: 'similar', score: 0.48, reason: 'Same mint with overlapping tags' };
  }
  if (sharedTagCount >= 2) {
    return { relationType: 'similar', score: 0.42, reason: 'Shared thematic tags' };
  }
  if (sameCollection && sameMaterial) {
    return { relationType: 'similar', score: 0.3, reason: 'Same collection and material' };
  }

  return null;
}

export function buildItemSimilarityRelations(
  items: RelationSeedItem[],
  options?: { maxRelationsPerItem?: number },
): GeneratedRelation[] {
  const maxRelationsPerItem = options?.maxRelationsPerItem ?? 6;
  const bestBySource = new Map<string, Map<string, GeneratedRelation>>();

  for (let leftIndex = 0; leftIndex < items.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < items.length; rightIndex += 1) {
      const left = items[leftIndex];
      const right = items[rightIndex];
      const candidate = scorePair(left, right);
      if (!candidate) continue;

      const pairRows: GeneratedRelation[] = [
        {
          sourceId: left.id,
          relatedId: right.id,
          relationType: candidate.relationType,
          score: candidate.score,
          reason: candidate.reason,
        },
        {
          sourceId: right.id,
          relatedId: left.id,
          relationType: candidate.relationType,
          score: candidate.score,
          reason: candidate.reason,
        },
      ];

      pairRows.forEach((row) => {
        const bucket = bestBySource.get(row.sourceId) ?? new Map<string, GeneratedRelation>();
        const existing = bucket.get(row.relatedId);
        if (!existing || existing.score < row.score) {
          bucket.set(row.relatedId, row);
        }
        bestBySource.set(row.sourceId, bucket);
      });
    }
  }

  return Array.from(bestBySource.values()).flatMap((bucket) =>
    Array.from(bucket.values())
      .sort((left, right) => right.score - left.score || left.relatedId.localeCompare(right.relatedId))
      .slice(0, maxRelationsPerItem),
  );
}
