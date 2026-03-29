type MetadataItem = {
  label: string;
  value?: string | null;
  tone?: 'default' | 'accent';
};

type MetadataListProps = {
  items: MetadataItem[];
};

export function MetadataList({ items }: MetadataListProps) {
  return (
    <dl className="grid gap-y-6 gap-x-4 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="space-y-1">
          <dt className="metadata-label">{item.label}</dt>
          <dd className={item.tone === 'accent' ? 'metadata-value text-secondary flex items-center gap-1' : 'metadata-value'}>
            {item.tone === 'accent' && <span className="material-symbols-outlined text-sm">verified</span>}
            {item.value || 'Not available'}
          </dd>
        </div>
      ))}
    </dl>
  );
}
