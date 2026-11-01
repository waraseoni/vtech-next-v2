export function DashboardSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="bg-card h-[118px] animate-pulse rounded-xl border"
          />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="bg-card h-80 animate-pulse rounded-xl border xl:col-span-2" />
        <div className="bg-card h-80 animate-pulse rounded-xl border" />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="bg-card h-96 animate-pulse rounded-xl border xl:col-span-2" />
        <div className="space-y-4">
          <div className="bg-card h-72 animate-pulse rounded-xl border" />
          <div className="bg-card h-60 animate-pulse rounded-xl border" />
        </div>
      </div>
    </div>
  );
}
