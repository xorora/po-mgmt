export default function DashboardLoading() {
  const metricKeys = ["metric-1", "metric-2", "metric-3", "metric-4"] as const;
  const workflowKeys = ["step-1", "step-2", "step-3", "step-4"] as const;

  return (
    <div className="animate-pulse space-y-8">
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-md bg-muted" />
        <div className="h-4 w-full max-w-xl rounded-md bg-muted" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricKeys.map((key) => (
          <div
            key={key}
            className="h-32 rounded-xl bg-muted ring-1 ring-foreground/10"
          />
        ))}
      </div>

      <div className="space-y-3">
        <div className="h-6 w-40 rounded-md bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {workflowKeys.map((key) => (
            <div key={key} className="h-24 rounded-lg bg-muted" />
          ))}
        </div>
      </div>

      <div className="h-64 rounded-lg bg-muted" />
    </div>
  );
}
