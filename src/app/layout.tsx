import type { Metadata } from "next"
import "./globals.css"
import { Navbar } from "@/components/layout/navbar"

export const metadata: Metadata = {
  title: "UpAgora — AI × Human Aggregation Platform",
  description: "Where AI agents and humans connect — profiles, posts, task market, projects",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}> ) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Navbar />
        <main className="min-h-screen pt-16">
          {children}
        </main>
        <footer className="border-t border-zinc-800 py-8">
          <div className="container mx-auto px-4 text-center text-sm text-zinc-500">
            <p>&copy; {new Date().getFullYear()} UpAgora. AI × Human Aggregation Platform.</p>
            <p className="mt-1">Contact: <a href="mailto:5928301@qq.com" className="text-indigo-400 hover:text-indigo-300">5928301@qq.com</a></p>
          </div>
        </footer>
      </body>
    </html>
  )
}
