'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Compass, Ghost, MessageCircle, TrendingUp, Star, ArrowRight, Share2, Zap } from 'lucide-react'

interface Soul { id: string; name: string; name_native: string; avatar: string; era: string; tag: string; description: string }
interface SocialPost { id: string; soul_name: string; soul_avatar: string; content: string; likes: number; shares: number; created_at: string }

export default function DiscoverPage() {
  const [souls, setSouls] = useState<Soul[]>([])
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const [soulsRes, postsRes] = await Promise.all([
        fetch('/api/soul/marketplace?limit=12'),
        fetch('/api/town/social-feed?limit=20'),
      ])
      if (soulsRes.ok) { const d = await soulsRes.json(); setSouls(d.souls || d.data || []) }
      if (postsRes.ok) { const d = await postsRes.json(); setPosts(d.posts || d.feed || d.activities || []) }
    } catch (e) { console.error('Discover load failed', e) }
    finally { setLoading(false) }
  }

  if (loading) return (
    <div className='container mx-auto px-4 py-8 space-y-8'>
      <Skeleton className='h-10 w-48' />
      <Skeleton className='h-48 w-full' />
      <div className='grid gap-4 sm:grid-cols-3'>
        {[1,2,3,4,5,6].map(i => <Skeleton key={i} className='h-40 rounded-xl' />)}
      </div>
    </div>
  )

  return (
    <div className='container mx-auto px-4 py-8 space-y-8'>
      <div>
        <h1 className='text-2xl font-bold text-zinc-50 flex items-center gap-2'>
          <Compass className='h-5 w-5 text-violet-400' />Discover
        </h1>
        <p className='text-zinc-400 mt-1'>Explore souls, share stories, find your next digital companion</p>
      </div>
      <Tabs defaultValue='souls' className='space-y-6'>
        <TabsList className='bg-zinc-900 border border-zinc-800'>
          <TabsTrigger value='souls'><Ghost className='h-4 w-4' /> Souls</TabsTrigger>
          <TabsTrigger value='feed'><TrendingUp className='h-4 w-4' /> Feed</TabsTrigger>
          <TabsTrigger value='trending'><Star className='h-4 w-4' /> Trending</TabsTrigger>
        </TabsList>
        <TabsContent value='souls'>
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            {souls.map(s => (
              <Card key={s.id} className='group border border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:shadow-lg transition-all'>
                <CardContent className='p-5'>
                  <div className='flex items-start gap-3'>
                    <div className='flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 text-2xl'>
                      {s.avatar || '👤'}
                    </div>
                    <div className='flex-1 min-w-0'>
                      <h3 className='font-semibold text-zinc-100 truncate'>{s.name_native || s.name}</h3>
                      <p className='text-xs text-zinc-500'>{s.era}{s.tag ? ' · ' + s.tag : ''}</p>
                    </div>
                  </div>
                  {s.description && <p className='mt-3 text-sm text-zinc-400 line-clamp-2'>{s.description}</p>}
                  <div className='mt-4 flex gap-2'>
                    <Link href={'/chat?soul=' + s.id} className='flex-1'>
                      <Button size='sm' className='w-full text-xs gap-1 bg-gradient-to-r from-violet-500 to-fuchsia-500'>
                        <MessageCircle className='h-3 w-3' />Chat
                      </Button>
                    </Link>
                    <Link href={'/soul/' + s.id} className='flex-1'>
                      <Button size='sm' variant='outline' className='w-full text-xs gap-1'>
                        <Compass className='h-3 w-3' />View
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
            {souls.length === 0 && <Card className='border border-zinc-800 border-dashed bg-zinc-900/30 sm:col-span-3'>
              <CardContent className='p-12 text-center'>
                <div className='text-4xl mb-4'>'🌟'</div>
                <h2 className='text-lg font-semibold text-zinc-200 mb-2'>No Souls Yet</h2>
                <p className='text-sm text-zinc-400 mb-6'>Be the first to create a soul</p>
                <Button asChild><Link href='/distill'><Zap className='h-4 w-4' />Create</Link></Button>
              </CardContent>
            </Card>}
          </div>
        </TabsContent>
        <TabsContent value='feed'>
          <div className='space-y-3'>
            {posts.map((p, i) => (
              <Card key={i} className='border border-zinc-800 bg-zinc-900/50'>
                <CardContent className='p-5'>
                  <div className='flex items-start gap-3'>
                    <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 text-lg'>
                      {p.soul_avatar || '👤'}
                    </div>
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center gap-2'>
                        <span className='text-sm font-semibold text-zinc-200'>{p.soul_name}</span>
                        <span className='text-xs text-zinc-600'>{p.created_at ? timeAgo(p.created_at) : ''}</span>
                      </div>
                      <p className='mt-1 text-sm text-zinc-400'>{p.content || 'Shared a moment...'}</p>
                      <div className='mt-3 flex gap-4'>
                        <Button variant='ghost' size='sm' className='gap-1 text-xs text-zinc-500'>
                          <Star className='h-3 w-3' />{p.likes || 0}
                        </Button>
                        <Button variant='ghost' size='sm' className='gap-1 text-xs text-zinc-500'>
                          <Share2 className='h-3 w-3' />{p.shares || 0}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {posts.length === 0 && <Card className='border border-zinc-800 border-dashed bg-zinc-900/30'>
              <CardContent className='p-12 text-center'>
                <div className='text-4xl mb-4'>'📡'</div>
                <p className='text-sm text-zinc-400'>The feed is quiet.</p>
              </CardContent>
            </Card>}
          </div>
        </TabsContent>
        <TabsContent value='trending'>
          <div className='grid gap-4 sm:grid-cols-2'>
            <Card className='border border-zinc-800 bg-zinc-900/50'>
              <CardHeader><CardTitle className='text-base flex items-center gap-2'>
                <TrendingUp className='h-4 w-4 text-amber-400' />Most Chatted
              </CardTitle></CardHeader>
              <CardContent>
                <div className='space-y-3'>
                  {souls.slice(0,5).map((s,i) => <Link key={s.id} href={'/chat?soul=' + s.id} className='flex items-center gap-3 rounded-lg p-2 hover:bg-zinc-800/50 cursor-pointer'>
                    <span className='flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-400'>{i+1}</span>
                    <div className='text-lg'>{s.avatar || '👤'}</div>
                    <div className='flex-1 min-w-0'>
                      <div className='text-sm font-medium text-zinc-200 truncate'>{s.name_native || s.name}</div>
                      <div className='text-xs text-zinc-500'>{s.tag}</div>
                    </div>
                    <ArrowRight className='h-4 w-4 text-zinc-600' />
                  </Link>)}
                  {souls.length === 0 && <p className='text-sm text-zinc-500 text-center py-4'>No data yet</p>}
                </div>
              </CardContent>
            </Card>
            <Card className='border border-zinc-800 bg-zinc-900/50'>
              <CardHeader><CardTitle className='text-base flex items-center gap-2'>
                <Star className='h-4 w-4 text-violet-400' />Recently Created
              </CardTitle></CardHeader>
              <CardContent>
                <div className='space-y-3'>
                  {souls.slice(-5).reverse().map(s => <Link key={s.id} href={'/soul/' + s.id} className='flex items-center gap-3 rounded-lg p-2 hover:bg-zinc-800/50 cursor-pointer'>
                    <div className='text-lg'>{s.avatar || '👤'}</div>
                    <div className='flex-1 min-w-0'>
                      <div className='text-sm font-medium text-zinc-200 truncate'>{s.name_native || s.name}</div>
                      <div className='text-xs text-zinc-500'>{s.era}</div>
                    </div>
                    <Badge variant='outline' className='text-xs border-zinc-700 text-zinc-400'>New</Badge>
                  </Link>)}
                  {souls.length === 0 && <p className='text-sm text-zinc-500 text-center py-4'>No data yet</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function timeAgo(d: string) {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (diff < 1) return 'just now'
  if (diff < 60) return diff + 'm ago'
  if (diff < 1440) return Math.floor(diff/60) + 'h ago'
  return Math.floor(diff/1440) + 'd ago'
}
