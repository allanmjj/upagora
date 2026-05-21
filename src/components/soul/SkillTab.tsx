'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Package, Download, Globe, Lock, ExternalLink, Check, Loader2, Eye } from 'lucide-react'

interface SkillTabProps {
  status: any
  onSkillGenerated: () => void
}

export default function SkillTab({ status, onSkillGenerated }: SkillTabProps) {
  const [mySkills, setMySkills] = useState<any[]>([])
  const [soulName, setSoulName] = useState('')
  const [skillDesc, setSkillDesc] = useState('')
  const [skillVisibility, setSkillVisibility] = useState('private')
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState<any | null>(null)

  async function loadSkills() {
    try {
      const d = await fetch('/api/soul/skill/generate').then(r => r.json())
      if (d.skills) setMySkills(d.skills)
    } catch {
      setMySkills([])
    }
  }

  useEffect(() => { loadSkills() }, [])

  async function handleGenerateSkill() {
    if (!soulName.trim()) {
      alert('请填写灵魂名称')
      return
    }
    setGenerating(true)
    setGenerated(null)
    try {
      const d = await fetch('/api/soul/skill/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          soul_name: soulName,
          description: skillDesc,
          visibility: skillVisibility,
        }),
      }).then(r => r.json())
      if (d.skill) {
        setGenerated(d.skill)
        await loadSkills()
        onSkillGenerated()
      }
    } catch (err) {
      console.error('Skill generation failed:', err)
      alert('Skill 生成失败，请重试')
    }
    setGenerating(false)
  }

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-violet-500/10 via-zinc-900/50 to-cyan-500/10 p-6">
        <h3 className="mb-2 text-lg font-semibold text-zinc-50">发布为 Hermes Skill</h3>
        <p className="mb-4 text-sm text-zinc-400">将灵魂快照打包为标准 Skill 格式，发布后可被 Hermes Agent 用户安装使用。</p>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-zinc-400">灵魂名称</label>
              <input value={soulName} onChange={(e) => setSoulName(e.target.value)} placeholder="e.g. 马斯克" className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-50 placeholder:text-zinc-600" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-400">可见性</label>
              <select value={skillVisibility} onChange={(e) => setSkillVisibility(e.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-50">
                <option value="private"><Lock className="mr-1 inline h-3 w-3" /> 私有</option>
                <option value="followers"><Eye className="mr-1 inline h-3 w-3" /> 仅关注者可见</option>
                <option value="public"><Globe className="mr-1 inline h-3 w-3" /> 公开</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-400">Skill 描述</label>
            <textarea value={skillDesc} onChange={(e) => setSkillDesc(e.target.value)} rows={3} placeholder="简短描述这个灵魂的特征和能力..." className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-50 placeholder:text-zinc-600" />
          </div>
          <div className="flex items-center gap-4 text-sm text-zinc-400">
            <span>维度: {status?.dimensions?.filled ?? 0}/{status?.dimensions?.total ?? 7}</span>
            <span>校准: {status?.stats?.calibrations ?? 0}</span>
            <span>快照: v{status?.stats?.snapshot_version ?? 0}</span>
          </div>
          <Button onClick={handleGenerateSkill} disabled={generating || !soulName.trim()} className="bg-gradient-to-r from-violet-500 to-cyan-600 hover:from-violet-600 hover:to-cyan-700 text-white disabled:opacity-50">
            {generating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 生成中...</> : <><Package className="mr-2 h-4 w-4" /> 生成并发布 Skill</>}
          </Button>
        </div>
      </div>

      {generated && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Check className="h-5 w-5 text-emerald-400" />
            <h3 className="text-lg font-semibold text-emerald-400">Skill 生成成功</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <span className="text-zinc-500">名称:</span>
              <code className="rounded bg-zinc-900 px-2 py-0.5 text-indigo-400">soul-{generated.soul_name?.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, "-")}</code>
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <span className="text-zinc-500">版本:</span>
              <span>v{generated.version}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <span className="text-zinc-500">Slug:</span>
              <code className="rounded bg-zinc-900 px-2 py-0.5 text-cyan-400">{generated.slug}</code>
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <span className="text-zinc-500">可见性:</span>
              <Badge variant={generated.visibility === 'public' ? 'primary' : 'secondary'}>{generated.visibility}</Badge>
            </div>
            <div className="mt-4 flex gap-2">
              <a href={generated.download_url || '#'} className="inline-flex items-center gap-1 rounded-lg bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-zinc-200">
                <Download className="h-4 w-4" /> 下载 .tar.gz
              </a>
              <a href={`https://upagora.com/api/soul/skill/download/${generated.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-zinc-200">
                <ExternalLink className="h-4 w-4" /> 公开链接
              </a>
            </div>
            <div className="mt-2 rounded bg-zinc-950/50 p-3 text-xs text-zinc-500 font-mono break-all">
              hermes skills install https://upagora.com/api/soul/skill/download/{generated.slug}
            </div>
          </div>
        </div>
      )}

      {mySkills.length > 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h3 className="mb-4 text-lg font-semibold text-zinc-50">已发布的 Skills ({mySkills.length})</h3>
          <div className="space-y-3">
            {mySkills.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-zinc-800 px-4 py-3">
                <div>
                  <div className="text-sm text-zinc-50">
                    <code className="rounded bg-zinc-900 px-1.5 py-0.5 text-indigo-400">{s.skill_name}</code>
                    <span className="ml-2 text-zinc-500">v{s.version}</span>
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {s.soul_name} &middot; 维度 {s.dimensions_filled}/7 &middot; 校准 {s.calibration_count} &middot; 快照 v{s.snapshot_version}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={s.visibility === 'public' ? 'primary' : s.visibility === 'followers' ? 'outline' : 'secondary'}>
                    {s.visibility === 'public' ? '公开' : s.visibility === 'followers' ? '关注者' : '私有'}
                  </Badge>
                  <a href={`/api/soul/skill/download/${s.slug}`} className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300">
                    <Download className="h-4 w-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
