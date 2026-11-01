export function RouteFallback() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 lg:p-6" role="status" aria-live="polite">
      <div className="space-y-2.5">
        <div className="animate-shimmer h-7 w-52 rounded-lg bg-muted" />
        <div className="animate-shimmer h-4 w-72 rounded bg-muted/70" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-border bg-card p-5">
            <div className="animate-shimmer h-3 w-20 rounded bg-muted" />
            <div className="animate-shimmer mt-4 h-7 w-24 rounded bg-muted" />
            <div className="animate-shimmer mt-3 h-3 w-28 rounded bg-muted/70" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="animate-shimmer h-56 rounded-2xl border border-border bg-card lg:col-span-2" />
        <div className="animate-shimmer h-56 rounded-2xl border border-border bg-card" />
      </div>

      <span className="sr-only">Loading…</span>
    </div>
  );
}
