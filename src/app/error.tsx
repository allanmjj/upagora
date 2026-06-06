'use client'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950/50 p-8 text-center backdrop-blur">
        <h2 className="mb-2 text-xl font-semibold text-zinc-100">Page failed to load</h2>
        <p className="mb-4 text-sm text-zinc-400">{error.message}</p>
        <button
          onClick={reset}
          className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
