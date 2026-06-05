// Auto-generated skeleton loading for voice
export default function Loading() {
  return (
    <div className="min-h-screen bg-zinc-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="h-8 w-48 rounded-md bg-zinc-800/50 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="rounded-xl border border-zinc-800/50 bg-zinc-900/50 p-4 space-y-3">
              <div className="h-4 w-32 rounded bg-zinc-800/50 animate-pulse" />
              <div className="h-3 w-full rounded bg-zinc-800/30 animate-pulse" />
              <div className="h-3 w-2/3 rounded bg-zinc-800/30 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
