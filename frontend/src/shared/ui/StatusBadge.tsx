import { cn } from '@/shared/lib/cn';

type Status = 'draft' | 'published' | 'archived' | 'active' | 'inactive';

const statusConfig: Record<Status, { label: string; classes: string }> = {
  draft: { label: 'Draft', classes: 'bg-surface-variant text-on-surface-variant' },
  published: { label: 'Published', classes: 'bg-primary/10 text-primary' },
  archived: { label: 'Archived', classes: 'bg-outline/10 text-outline' },
  active: { label: 'Active', classes: 'bg-primary/10 text-primary' },
  inactive: { label: 'Inactive', classes: 'bg-outline/10 text-outline' },
};

type StatusBadgeProps = {
  status: Status;
  className?: string;
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.draft;
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-sm text-[10px] font-label font-bold uppercase tracking-wider',
        config.classes,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
