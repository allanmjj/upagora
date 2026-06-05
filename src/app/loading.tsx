export default function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-10 w-10">
          <div className="absolute inset-0 animate-ping rounded-full bg-indigo-500/20" />
          <div className="absolute inset-2 animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-400" />
        </div>
        <div className="animate-pulse text-sm text-zinc-500">Loading...</div>
      </div>
    </div>
  )
}
