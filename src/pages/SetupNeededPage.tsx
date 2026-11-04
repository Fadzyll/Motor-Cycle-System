export function SetupNeededPage() {
  return (
    <div className="grid min-h-full place-items-center p-6">
      <div className="max-w-md rounded-card border border-border bg-surface p-5 text-sm">
        <h1 className="mb-2 text-lg font-semibold">Supabase is not configured</h1>
        <p className="text-muted">
          Copy <code>.env.example</code> to <code>.env.local</code> and fill in
          <code> VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>, then restart
          <code> npm run dev</code>. On Vercel, add them under Project → Settings → Environment
          Variables and redeploy.
        </p>
      </div>
    </div>
  )
}
