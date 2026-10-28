export default function App() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="rounded-lg border border-border bg-surface p-6 shadow-card">
        <h1 className="text-2xl font-semibold">Apex Sales</h1>
        <p className="mt-1 text-fg-muted">Design tokens check</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="rounded-md bg-primary px-4 py-2 text-primary-fg hover:bg-primary-hover">
            Primary
          </button>
          <span className="rounded-sm bg-success-bg px-2 py-1 text-success">Won</span>
          <span className="rounded-sm bg-danger-bg px-2 py-1 text-danger">Lost</span>
          <span className="rounded-sm bg-ai-bg px-2 py-1 text-ai">AI suggestion</span>
        </div>
      </div>
    </main>
  )
}
