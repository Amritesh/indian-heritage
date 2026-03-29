import { Link } from 'react-router-dom';
import { StatePanel } from '@/shared/ui/StatePanel';

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
  icon?: string;
};

export function EmptyState({ title, description, actionLabel, actionTo, icon }: EmptyStateProps) {
  return (
    <StatePanel eyebrow="Archive status" title={title} description={description} icon={icon}>
      {actionLabel && actionTo && (
        <Link to={actionTo} className="btn-primary">
          {actionLabel}
        </Link>
      )}
    </StatePanel>
  );
}
