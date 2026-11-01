import { cn } from "@/lib/utils";

export function PageSkeleton({
  tiles = 4,
  className,
}: {
  tiles?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("mx-auto max-w-7xl space-y-5", className)}
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading…</span>
      <div className="space-y-2">
        <div className="bg-muted h-4 w-24 animate-pulse rounded" />
        <div className="bg-muted h-7 w-56 animate-pulse rounded" />
        <div className="bg-muted h-4 w-80 max-w-full animate-pulse rounded" />
      </div>
      {tiles > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: tiles }).map((_, index) => (
            <div
              key={index}
              className="bg-muted h-20 animate-pulse rounded-xl"
            />
          ))}
        </div>
      ) : null}
      <div className="bg-muted h-16 animate-pulse rounded-xl" />
      <div className="bg-muted h-96 animate-pulse rounded-xl" />
    </div>
  );
}
