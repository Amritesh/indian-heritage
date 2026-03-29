export function parseGsUrl(value?: string | null) {
  if (!value || !value.startsWith('gs://')) return null;
  const withoutScheme = value.slice(5);
  const slashIndex = withoutScheme.indexOf('/');
  if (slashIndex === -1) return null;
  return {
    bucket: withoutScheme.slice(0, slashIndex),
    path: withoutScheme.slice(slashIndex + 1),
  };
}

export function buildFirebaseMediaUrl(gsUrl?: string | null) {
  const parsed = parseGsUrl(gsUrl);
  if (!parsed) return '';
  return `https://firebasestorage.googleapis.com/v0/b/${parsed.bucket}/o/${encodeURIComponent(parsed.path)}?alt=media`;
}
