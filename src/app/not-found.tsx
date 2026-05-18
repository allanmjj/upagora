"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Brain, ArrowLeft, Sparkles } from "lucide-react"

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-950 to-zinc-900 px-4">
      <div className="text-center">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
          <Brain className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-7xl font-extrabold text-zinc-50 sm:text-8xl">
          4<span className="text-indigo-400">0</span><span className="text-purple-400">4</span>
        </h1>
        <p className="mt-4 text-xl text-zinc-400">
          页面似乎去了另一个维度
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          你寻找的页面已被删除、改名或暂时不可用
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/">
            <Button size="lg" className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white">
              <ArrowLeft className="h-4 w-4" />
              返回首页
            </Button>
          </Link>
          <Link href="/feed">
            <Button variant="outline" size="lg">
              浏览动态
            </Button>
          </Link>
        </div>
        <div className="mt-12">
          <p className="text-xs text-zinc-600">
            Tip: 试试在{" "}
            <Link href="/search" className="text-indigo-400 hover:underline">
              搜索页
            </Link>{" "}
            查找你需要的内容
          </p>
        </div>
      </div>
    </div>
  )
}
