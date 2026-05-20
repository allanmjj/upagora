'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Brain, Upload, Heart, Shield, Zap, BookOpen } from 'lucide-react'

const NAV = [
  { label: '灵魂仪表盘', href: '/soul', icon: Brain },
  { label: '数据导入', href: '/soul#import', icon: Upload },
  { label: '校准纠正', href: '/soul#calibrate', icon: Heart },
  { label: '灵魂快照', href: '/soul#snapshot', icon: Shield },
  { label: '记忆库', href: '/soul#memory', icon: BookOpen },
  { label: 'Persona 档案', href: '/soul#persona', icon: Zap },
]

export function SoulSidebar() {
  const pathname = usePathname()
  return (
    <aside className="w-56 shrink-0 border-r border-zinc-800 bg-zinc-950/50 p-4">
      <h2 className="mb-4 px-2 text-sm font-semibold text-zinc-400">灵魂蒸馏中心</h2>
      <nav className="space-y-1">
        {NAV.map((item) => {
          const active = pathname === item.href
          return (
            <Link key={item.href} href={item.href} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${active ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
