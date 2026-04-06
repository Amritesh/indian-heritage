import path from 'node:path';

type SnapshotLike = {
  collection?: {
    slug?: string;
  };
  items?: Array<Record<string, unknown> & {
    title?: string;
  }>;
};

function isPlaceholderTitle(title: string | undefined) {
  return /^Item on Page \d+$/i.test(String(title ?? '').trim());
}

export function shouldSkipLegacyPlaceholderSnapshot(
  filePath: string,
  snapshot: SnapshotLike,
  siblingFilePaths: string[],
) {
  const slug = String(snapshot.collection?.slug ?? '').trim();
  const stem = path.basename(filePath, path.extname(filePath));
  const legacyMatch = stem.match(/^(.*)-\d+-\d+$/);
  if (!slug || !legacyMatch) return false;

  const preferredStem = legacyMatch[1];
  const siblingPreferredPath = siblingFilePaths.find(
    (candidate) => path.basename(candidate, path.extname(candidate)) === preferredStem,
  );
  if (!siblingPreferredPath) return false;

  const titles = Array.isArray(snapshot.items)
    ? snapshot.items.slice(0, 5).map((item) => String(item?.title ?? '').trim()).filter(Boolean)
    : [];
  if (titles.length === 0) return false;

  return titles.every((title) => isPlaceholderTitle(title));
}
