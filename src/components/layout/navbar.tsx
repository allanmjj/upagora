'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Avatar } from '@/components/ui/avatar'
import {
  Brain,
  MessageCircle,
  Search,
  Settings,
  User,
  Menu,
  X,
  ChevronDown,
  Sparkles,
  Map,
} from 'lucide-react'

const navItems = [
  { href: '/', label: 'Home', icon: Brain },
  { href: '/town', label: 'Town', icon: Map },
  { href: '/soul/gallery', label: 'Discover', icon: Search },
  { href: '/chat', label: 'Chat', icon: MessageCircle },
]

const moreLinks = [
  { href: '/soul/marketplace', label: 'Marketplace', icon: Brain },
  { href: '/voice', label: 'Voice Studio', icon: Settings },
  { href: '/gallery', label: 'Gallery', icon: Search },
  { href: '/pricing', label: 'Pricing', icon: Settings },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const [onboardingDone, setOnboardingDone] = useState(true)
  useEffect(() => {
    const done = localStorage.getItem('onboarding_complete')
    setOnboardingDone(done === 'true')
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await logout()
    setUserMenuOpen(false)
    router.push('/')
  }

  const isActive = (href: string) => pathname === href || (href !== '/' && pathname?.startsWith(href))

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-zinc-50">
              UpAgora
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive(href)
                    ? 'bg-zinc-800 text-zinc-50'
                    : 'text-zinc-400 hover:text-zinc-50'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}

            {/* Create Soul CTA */}
            {user && !onboardingDone && (
              <Link
                href="/distill"
                className="ml-2 flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                Create
              </Link>
            )}

            {/* More Menu */}
            <div className="relative ml-1">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-400 hover:text-zinc-50 transition-colors"
              >
                More
                <ChevronDown className={cn('h-3 w-3 transition-transform', menuOpen && 'rotate-180')} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg border border-zinc-800 bg-zinc-900 shadow-lg py-1 z-50">
                  {moreLinks.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 text-sm transition-colors',
                        isActive(href)
                          ? 'bg-zinc-800 text-zinc-50'
                          : 'text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {loading ? (
              <div className="h-8 w-8 rounded-full bg-zinc-800 animate-pulse" />
            ) : user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-zinc-800 transition-colors"
                >
                  <Avatar name={user.name} size="sm" />
                  <ChevronDown className={cn('h-3 w-3 text-zinc-500 transition-transform', userMenuOpen && 'rotate-180')} />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-52 rounded-lg border border-zinc-800 bg-zinc-900 shadow-lg py-1 z-50">
                    <div className="px-3 py-2 border-b border-zinc-800">
                      <p className="text-sm font-medium text-zinc-50">{user.name}</p>
                      <p className="text-xs text-zinc-500">@{user.username}</p>
                    </div>
                    <Link
                      href="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800"
                    >
                      <User className="h-4 w-4" />
                      Profile
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-zinc-800"
                    >
                      <X className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium bg-zinc-800 text-zinc-50 hover:bg-zinc-700 transition-colors"
              >
                <User className="h-4 w-4" />
                Login
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden rounded-lg p-2 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800 transition-colors"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-zinc-800 bg-zinc-950">
          <div className="container mx-auto px-4 py-3 space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive(href)
                    ? 'bg-zinc-800 text-zinc-50'
                    : 'text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
            {user && !onboardingDone && (
              <Link
                href="/distill"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                Create Soul
              </Link>
            )}
            {moreLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive(href)
                    ? 'bg-zinc-800 text-zinc-50'
                    : 'text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}
