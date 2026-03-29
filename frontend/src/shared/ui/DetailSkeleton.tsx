export function DetailSkeleton() {
  return (
    <div className="page-shell">
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-6">
          <div className="aspect-square rounded-lg animate-pulse bg-surface-container" />
          <div className="flex gap-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-16 w-16 animate-pulse rounded bg-surface-container" />
            ))}
          </div>
        </div>
        <div className="lg:col-span-5 space-y-8">
          <div className="space-y-4">
            <div className="h-4 w-32 animate-pulse rounded bg-surface-container" />
            <div className="h-12 w-3/4 animate-pulse rounded bg-surface-container" />
            <div className="h-6 w-1/2 animate-pulse rounded bg-surface-container" />
          </div>
          <div className="bg-surface-container-low p-8 rounded-lg space-y-6">
            <div className="h-4 w-40 animate-pulse rounded bg-surface-container" />
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 w-16 animate-pulse rounded bg-surface-container" />
                  <div className="h-5 w-24 animate-pulse rounded bg-surface-container" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
