import { EmptyState } from '@/shared/ui/EmptyState';

export function NotFoundPage() {
  return (
    <div className="page-shell">
      <EmptyState
        title="Page not found"
        description="The route you requested does not exist in the archive."
        actionLabel="Return home"
        actionTo="/"
        icon="explore_off"
      />
    </div>
  );
}
