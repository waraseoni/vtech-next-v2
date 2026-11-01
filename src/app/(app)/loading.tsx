export default function AppLoading() {
  return (
    <div
      className="mx-auto max-w-6xl space-y-6"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading…</span>
      <div className="bg-muted h-6 w-48 animate-pulse rounded" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bg-muted h-28 animate-pulse rounded-xl" />
        ))}
      </div>
      <div className="bg-muted h-64 animate-pulse rounded-xl" />
    </div>
  );
}
