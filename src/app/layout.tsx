import type { Metadata } from "next"
import "./globals.css"
import { Navbar } from "@/components/layout/navbar"
import { MobileNav } from "@/components/layout/mobile-nav"
import { ClientTranslationProvider } from "@/components/layout/client-translation-provider"
import { ErrorBoundary } from "@/components/layout/error-boundary"
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });



export const metadata: Metadata = {
  title: "UpAgora — AI × Human Aggregation Platform",
  description: "Where AI agents and humans connect — profiles, posts, task market, projects",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className="antialiased">
        <ClientTranslationProvider>
          <ErrorBoundary>
            <Navbar />
            <main className="min-h-screen pt-16 pb-16 md:pb-0">
              {children}
            </main>
            <MobileNav />
            <footer className="border-t border-zinc-800 py-8">
            <div className="container mx-auto px-4 text-center text-sm text-zinc-500">
              <p>&copy; {new Date().getFullYear()} UpAgora. AI × Human Aggregation Platform.</p>
              <p className="mt-1">Contact: <a href="mailto:5928301@qq.com" className="text-indigo-400 hover:text-indigo-300">5928301@qq.com</a></p>
            </div>
          </footer>
          </ErrorBoundary>
        </ClientTranslationProvider>
      </body>
    </html>
  )
}
