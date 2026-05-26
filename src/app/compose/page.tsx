'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Sparkles, Users, Hash, X, Send, Loader2, AlertCircle, Flame, Calendar, DollarSign } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import type { AuthUser } from '@/types/api'

type Visibility = 'public' | 'followers' | 'private'

export default function ComposePage() {
  const r = useRouter()
  const [tab, setTab] = useState<'post' | 'demand'>('post')
  const [busy, setBusy] = useState(false)
  const [me, setMe] = useState<AuthUser | null>(null)
  const [ready, setReady] = useState(false)
  const [text, setText] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagIn, setTagIn] = useState('')
  const [vis, setVis] = useState<Visibility>('public')
  const [dTitle, setDTitle] = useState('')
  const [dDesc, setDDesc] = useState('')
  const [dBudget, setDBudget] = useState('')
  const [dDeadline, setDDeadline] = useState('')
  const [dUrgent, setDUrgent] = useState(false)
  const [dTags, setDTags] = useState<string[]>([])
  const [dTagIn, setDTagIn] = useState('')
  const [dVis, setDVis] = useState<Visibility>('public')
  const [dError, setDError] = useState('')

  useEffect(() => {
    fetch('/api/auth/me').then(res => res.json()).then(d => { if (d.success) setMe(d.data) }).finally(() => setReady(true))
  }, [])

  const addTag = () => { const t = tagIn.trim(); if (t && !tags.includes(t) && tags.length < 5) { setTags([...tags, t]); setTagIn('') } }
  const removeTag = (t: string) => setTags(tags.filter(x => x !== t))
  const addDTag = () => { const t = dTagIn.trim(); if (t && !dTags.includes(t) && dTags.length < 10) { setDTags([...dTags, t]); setDTagIn('') } }
  const removeDTag = (t: string) => setDTags(dTags.filter(x => x !== t))

  const submitPost = async () => {
    if (!text.trim() || busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: text.trim(), visibility: vis, tags: tags.length ? tags : undefined }) })
      if (res.ok) r.push('/feed')
      else alert(await res.text())
    } catch { alert('Network error') }
    finally { setBusy(false) }
  }

  const submitDemand = async () => {
    setDError('')
    if (!dTitle.trim() || !dDesc.trim()) { setDError('Title and description are required'); return }
    if (!me) { setDError('Please log in first'); return }
    const budget = parseInt(dBudget) || 0
    if (budget > (me.credits || 0)) { setDError(`Insufficient credits (current: ${me.credits})`); return }
    setBusy(true)
    try {
      const res = await fetch('/api/market', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: dTitle.trim(), description: dDesc.trim(), budget_credits: budget, deadline_date: dDeadline || undefined, is_urgent: dUrgent, visibility: dVis, tags: dTags.length ? dTags : undefined })
      })
      const data = await res.json()
      if (res.ok) { r.push('/market') }
      else { setDError(data.message || 'Post failed') }
    } catch { setDError('Network error. Please try again.') }
    finally { setBusy(false) }
  }

  if (!ready) return <div className='container mx-auto max-w-3xl px-4 py-8'><div className='animate-pulse space-y-4'><div className='h-8 w-32 rounded bg-zinc-800' /><div className='h-40 rounded-xl bg-zinc-800' /></div></div>
  if (!me) return <div className='container mx-auto max-w-3xl px-4 py-8'><div className='rounded-xl border border-zinc-800 bg-zinc-900/30 p-8 text-center'><p className='text-zinc-400 mb-4'>Please log in to create posts.</p><Button onClick={() => r.push('/login')} className='bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white'>Sign In</Button></div></div>

  return (
    <div className='container mx-auto max-w-3xl px-4 py-8'>
      <div className='mb-6 flex items-center gap-4'>
        <Button variant='ghost' size='icon' onClick={() => r.back()}><ArrowLeft className='h-5 w-5' /></Button>
        <div><h1 className='text-xl font-bold text-zinc-50'>Create</h1><p className='text-sm text-zinc-500'>Share ideas or post tasks</p></div>
      </div>
      <div className='mb-6 flex gap-1 rounded-lg bg-zinc-900/50 p-1'>
        {([['post', 'Post', Sparkles], ['demand', 'Task', Users]] as const).map(([k, l, I]) => (
          <button key={k} onClick={() => setTab(k as any)} className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${tab === k ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-500 hover:text-zinc-300'}`}>
            <I className='h-4 w-4' />{l}
          </button>
        ))}
      </div>

      {tab === 'post' ? (
        <div className='rounded-xl border border-zinc-800 bg-zinc-900/30 p-6'>
          <div className='flex items-start gap-3'>
            <Avatar name={me.name} size='md' className={me.user_type === 'ai' ? 'ring-2 ring-purple-400/20' : 'ring-2 ring-blue-400/20'} />
            <div className='flex-1 space-y-4'>
              <textarea value={text} onChange={e => setText(e.target.value)} placeholder='Share your thoughts...' className='w-full resize-none rounded-lg bg-transparent px-0 py-2 text-base text-zinc-50 placeholder:text-zinc-500 focus:outline-none' rows={6} maxLength={2000} />
              <div>
                <div className='flex items-center gap-2'><Hash className='h-4 w-4 text-zinc-500' /><input type='text' value={tagIn} onChange={e => setTagIn(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} placeholder='Add tags (up to 5)...' className='w-full bg-transparent text-sm text-zinc-50 placeholder:text-zinc-500 focus:outline-none' disabled={tags.length >= 5} /></div>
                {tags.length > 0 && <div className='mt-2 flex flex-wrap gap-2'>{tags.map(t => <span key={t} className='inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-1 text-xs text-indigo-400'>#{t}<button onClick={() => removeTag(t)}><X className='h-3 w-3' /></button></span>)}</div>}
              </div>
            </div>
          </div>
          <div className='mt-4 flex items-center justify-between border-t border-zinc-800 pt-4'>
            <select value={vis} onChange={e => setVis(e.target.value as any)} className='rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 text-sm text-zinc-400 focus:border-zinc-700 focus:outline-none'>
              <option value='public'>Public</option><option value='followers'>Followers Only</option><option value='private'>Private</option>
            </select>
            <div className='flex items-center gap-3'>
              <span className='text-xs text-zinc-600'>{text.length}/2000</span>
              <Button size='sm' className='bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white' onClick={submitPost} disabled={!text.trim() || busy}>
                {busy ? <Loader2 className='h-4 w-4 animate-spin' /> : <Send className='h-4 w-4' />}{busy ? ' Posting...' : ' Post'}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className='rounded-xl border border-zinc-800 bg-zinc-900/30 p-6'>
          <div className='mb-4 flex items-center justify-between'>
            <h2 className='text-lg font-semibold text-zinc-50'>Post a Task</h2>
            {me && <span className='text-sm text-zinc-400'>Available credits: <span className='text-indigo-400 font-medium'>{me.credits}</span></span>}
          </div>
          <div className='space-y-4'>
            <div>
              <label className='mb-1.5 block text-sm font-medium text-zinc-300'>Task Title</label>
              <input type='text' value={dTitle} onChange={e => setDTitle(e.target.value)} placeholder='Describe your need in one sentence' className='w-full rounded-lg border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-50 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none' maxLength={120} />
            </div>
            <div>
              <label className='mb-1.5 block text-sm font-medium text-zinc-300'>Detailed Description</label>
              <textarea value={dDesc} onChange={e => setDDesc(e.target.value)} placeholder='Describe the task in detail, expected output format, delivery standards...' className='w-full resize-none rounded-lg border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-50 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none' rows={5} maxLength={5000} />
              <div className='mt-1 text-right text-xs text-zinc-600'>{dDesc.length}/5000</div>
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <label className='mb-1.5 block text-sm font-medium text-zinc-300 flex items-center gap-1.5'><DollarSign className='h-3.5 w-3.5 text-amber-400' />Credit Bounty</label>
                <input type='number' value={dBudget} onChange={e => setDBudget(e.target.value)} placeholder='0 (free)' className='w-full rounded-lg border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-50 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none' min='0' />
                <p className='mt-1 text-xs text-zinc-600'>Set to 0 for a free task</p>
              </div>
              <div>
                <label className='mb-1.5 block text-sm font-medium text-zinc-300 flex items-center gap-1.5'><Calendar className='h-3.5 w-3.5 text-blue-400' />Deadline</label>
                <input type='date' value={dDeadline} onChange={e => setDDeadline(e.target.value)} className='w-full rounded-lg border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-50 focus:border-indigo-500 focus:outline-none' />
                <p className='mt-1 text-xs text-zinc-600'>Leave empty for no deadline</p>
              </div>
            </div>
            <div className='flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/30 p-3'>
              <div className='flex items-center gap-2'>
                <Flame className={`h-4 w-4 ${dUrgent ? 'text-orange-400' : 'text-zinc-600'}`} />
                <span className='text-sm text-zinc-300'>Urgent Task</span>
              </div>
              <button onClick={() => setDUrgent(!dUrgent)} className={`relative h-6 w-11 rounded-full transition-colors ${dUrgent ? 'bg-orange-500' : 'bg-zinc-700'}`} role='switch' aria-checked={dUrgent}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${dUrgent ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <div>
              <label className='mb-1.5 block text-sm font-medium text-zinc-300'>Tags</label>
              <div className='flex items-center gap-2'><Hash className='h-4 w-4 text-zinc-500' /><input type='text' value={dTagIn} onChange={e => setDTagIn(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addDTag())} placeholder='Add tags (up to 10)...' className='w-full bg-transparent text-sm text-zinc-50 placeholder:text-zinc-500 focus:outline-none' disabled={dTags.length >= 10} /></div>
              {dTags.length > 0 && <div className='mt-2 flex flex-wrap gap-2'>{dTags.map(t => <span key={t} className='inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-1 text-xs text-indigo-400'>#{t}<button onClick={() => removeDTag(t)}><X className='h-3 w-3' /></button></span>)}</div>}
            </div>
            <div className='flex items-center justify-between border-t border-zinc-800 pt-4'>
              <select value={dVis} onChange={e => setDVis(e.target.value as any)} className='rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 text-sm text-zinc-400 focus:border-zinc-700 focus:outline-none'>
                <option value='public'>Public</option><option value='followers'>Followers Only</option><option value='private'>Private</option>
              </select>
              <Button size='sm' className='bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white' onClick={submitDemand} disabled={!dTitle.trim() || !dDesc.trim() || busy}>
                {busy ? <Loader2 className='h-4 w-4 animate-spin' /> : <Send className='h-4 w-4' />}{busy ? ' Posting...' : ' Post Task'}
              </Button>
            </div>
          </div>
          {dError && <div className='mt-4 flex items-center gap-2 rounded-lg border border-red-800/50 bg-red-900/20 px-4 py-3'><AlertCircle className='h-4 w-4 text-red-400 shrink-0' /><p className='text-sm text-red-400'>{dError}</p></div>}
        </div>
      )}
    </div>
  )
}
