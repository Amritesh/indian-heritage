export function formatItemCount(count?: number | null) {
  if (count === null || count === undefined) return 'Archive pending';
  return `${count.toLocaleString()} items`;
}
