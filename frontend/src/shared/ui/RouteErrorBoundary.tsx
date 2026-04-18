import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { ErrorState } from '@/shared/ui/ErrorState';

export function RouteErrorBoundary() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Something unexpected happened while loading the archive.';

  return (
    <div className="page-shell">
      <ErrorState message={message} />
    </div>
  );
}
