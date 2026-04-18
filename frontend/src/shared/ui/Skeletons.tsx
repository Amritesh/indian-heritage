type GridSkeletonProps = {
  count?: number;
};

export function CollectionSkeletonGrid({ count = 2 }: GridSkeletonProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-surface-container-high rounded-xl overflow-hidden">
          <div className="h-72 animate-pulse bg-surface-container" />
          <div className="space-y-4 p-6">
            <div className="h-4 w-24 animate-pulse rounded bg-surface-container" />
            <div className="h-9 w-56 animate-pulse rounded bg-surface-container" />
            <div className="h-16 animate-pulse rounded bg-surface-container" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ItemSkeletonGrid({ count = 6 }: GridSkeletonProps) {
  return (
    <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-surface-container-high rounded-xl overflow-hidden">
          <div className="h-56 animate-pulse bg-surface-container" />
          <div className="space-y-3 p-5">
            <div className="h-5 w-3/4 animate-pulse rounded bg-surface-container" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-surface-container" />
            <div className="flex gap-2">
              <div className="h-5 w-16 animate-pulse rounded bg-surface-container" />
              <div className="h-5 w-16 animate-pulse rounded bg-surface-container" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
