// Skeleton placeholders (Step 33): content-shaped shimmer, not a blank screen.
export default function AppLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 py-4">
      <div className="skeleton h-8 w-2/5 rounded-md" />
      <div className="skeleton h-4 w-3/5 rounded-md" />
      <div className="space-y-2 rounded-md border border-border p-4">
        <div className="skeleton h-20 w-full rounded-md" />
        <div className="skeleton h-20 w-full rounded-md" />
        <div className="skeleton h-20 w-full rounded-md" />
      </div>
    </div>
  );
}
