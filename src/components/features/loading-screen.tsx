import { Brain } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950">
      <Brain className="h-12 w-12 animate-pulse text-indigo-500" />
      <div className="mt-6 text-lg font-medium text-zinc-400">UpAgora</div>
      <div className="mt-1 text-sm text-zinc-600">正在加载...</div>
      <div className="mt-4 flex gap-1">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-500 [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-500 [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-pink-500 [animation-delay:300ms]" />
      </div>
    </div>
  )
}
