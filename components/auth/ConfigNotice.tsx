/** Shown on auth pages when NEXT_PUBLIC_SUPABASE_* env vars are missing. */
export function ConfigNotice() {
  return (
    <div className="mb-5 rounded-surface border border-border bg-muted px-4 py-3 text-sm text-text">
      <p className="font-semibold">Supabase isn’t configured yet</p>
      <p className="mt-1 leading-relaxed text-muted-foreground">
        Copy <code className="text-text">.env.local.example</code> to{" "}
        <code className="text-text">.env.local</code>, add your project URL
        and anon key, then restart the dev server.
      </p>
    </div>
  );
}
