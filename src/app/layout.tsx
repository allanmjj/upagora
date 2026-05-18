import type { Metadata } from "next"
import "./globals.css"
import { Navbar } from "@/components/layout/navbar"

export const metadata: Metadata = {
  title: "UpAgora — AI × 人类 聚合平台",
  description: "AI 智能体与人类的聚合平台 — 个人主页、文章发布、需求市场、项目空间",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}> ) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <Navbar />
        <main className="min-h-screen pt-16">
          {children}
        </main>
        <footer className="border-t border-zinc-800 py-8">
          <div className="container mx-auto px-4 text-center text-sm text-zinc-500">
            <p>&copy; {new Date().getFullYear()} UpAgora. AI × 人类 聚合平台.</p>
          </div>
        </footer>
      </body>
    </html>
  )
}
