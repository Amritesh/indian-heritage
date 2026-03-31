export function formatItemCount(count?: number | null) {
  if (count === null || count === undefined) return 'Archive pending';
  return `${count.toLocaleString()} items`;
}

export function formatCurrency(amount?: number | null) {
  if (!amount) return null;
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)} L`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function gsUrlToHttps(gsUrl?: string | null): string {
  if (!gsUrl) return '';
  if (!gsUrl.startsWith('gs://')) return gsUrl;
  const withoutProto = gsUrl.replace('gs://', '');
  const slashIdx = withoutProto.indexOf('/');
  if (slashIdx === -1) return gsUrl;
  const bucket = withoutProto.substring(0, slashIdx);
  const filePath = withoutProto.substring(slashIdx + 1);
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(filePath)}?alt=media`;
}
