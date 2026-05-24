'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Search, Download, ThumbsUp, Star, Code, Zap, Brain, BookOpen, Eye, ArrowUpRight } from 'lucide-react'

interface Skill {
  id: string
  skill_name: string
  category: string
  skill_content: string
  version: string
  downloads: number
  upvotes: number
  description: string
  source_agent_name?: string
  created_at: string
}

interface SkillsMarketplaceProps {
  skills: Skill[]
  loading: boolean
  onSearch?: (query: string) => void
  onInstall?: (skillId: string) => Promise<boolean>
}

const CATEGORIES = [
  { key: 'all', label: 'All', icon: '🔮' },
  { key: 'copywriting', label: 'Copywriting', icon: '✍️' },
  { key: 'data-analysis', label: 'Data Analysis', icon: '📊' },
  { key: 'programming', label: 'Programming', icon: '💻' },
  { key: 'creative', label: 'Creative Design', icon: '🎨' },
  { key: 'research', label: 'Research', icon: '🔬' },
  { key: 'communication', label: 'Communication', icon: '🗣️' },
]

export default function SkillsMarketplace({
  skills,
  loading,
  onSearch,
  onInstall,
}: SkillsMarketplaceProps) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [installed, setInstalled] = useState<Set<string>>(new Set())

  const filteredSkills = skills.filter((skill) => {
    const matchSearch = !search || 
      skill.skill_name.toLowerCase().includes(search.toLowerCase()) ||
      skill.description.toLowerCase().includes(search.toLowerCase())
    const matchCategory = category === 'all' || skill.category === category
    return matchSearch && matchCategory
  })

  const handleInstall = async (id: string) => {
    if (installed.has(id)) return
    if (onInstall) {
      const ok = await onInstall(id)
      if (ok) {
        setInstalled(new Set([...installed, id]))
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-zinc-500 animate-pulse">
          <Code className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm">Loading skills marketplace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <Zap className="h-6 w-6 text-amber-400" />
          <h3 className="text-xl font-bold text-zinc-50">Skills Marketplace</h3>
        </div>
        <p className="text-sm text-zinc-500">
          Explore community-shared skills to extend your digital soul's capabilities
        </p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search skills..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              onSearch?.(e.target.value)
            }}
            className="pl-9 bg-zinc-900/50 border-zinc-800 text-zinc-200"
          />
        </div>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setCategory(cat.key)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
              category === cat.key
                ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'
            }`}
          >
            <span className="mr-1">{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Skills grid */}
      {filteredSkills.length === 0 ? (
        <div className="text-center py-12 text-zinc-500 border border-dashed border-zinc-800 rounded-lg">
          <Code className="h-12 w-12 mx-auto mb-3 text-zinc-700" />
          <p className="text-sm font-medium">No skills found</p>
          <p className="text-xs text-zinc-600 mt-1">
            {search || category !== 'all' ? 'Try adjusting your search' : 'Be the first to contribute a skill'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSkills.map((skill) => (
            <Card
              key={skill.id}
              className="p-4 border-zinc-800 bg-zinc-900/50 hover:border-indigo-500/30 hover:bg-zinc-900/80 transition-all group"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                    <Code className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-200">{skill.skill_name}</h4>
                    <div className="text-xs text-zinc-500">v{skill.version}</div>
                  </div>
                </div>
                {installed.has(skill.id) ? (
                  <Badge variant="primary" className="text-xs">
                    ✓ Installed
                  </Badge>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleInstall(skill.id)}
                  >
                    <Download className="h-3.5 w-3.5 text-zinc-400" />
                  </Button>
                )}
              </div>

              {/* Description */}
              <p className="text-xs text-zinc-400 line-clamp-2 mb-3">
                {skill.description}
              </p>

              {/* Stats */}
              <div className="flex items-center gap-3 text-xs text-zinc-500">
                <span className="flex items-center gap-1">
                  <Download className="h-3 w-3" />
                  {skill.downloads}
                </span>
                <span className="flex items-center gap-1">
                  <ThumbsUp className="h-3 w-3" />
                  {skill.upvotes}
                </span>
                <span className="ml-auto flex items-center gap-1 text-indigo-400">
                  <Eye className="h-3 w-3" />
                  Preview
                </span>
              </div>

              {/* Category badge */}
              <div className="mt-2 pt-2 border-t border-zinc-800">
                <Badge variant="outline" className="text-xs">
                  {CATEGORIES.find(c => c.key === skill.category)?.icon || '🔮'}{' '}
                  {CATEGORIES.find(c => c.key === skill.category)?.label || skill.category}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-3 pt-4 border-t border-zinc-800">
        <div className="text-center">
          <div className="text-2xl font-bold text-indigo-400">{skills.length}</div>
          <div className="text-xs text-zinc-500 mt-0.5">Total Skills</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-amber-400">
            {skills.reduce((sum, s) => sum + s.upvotes, 0)}
          </div>
          <div className="text-xs text-zinc-500 mt-0.5">Total Upvotes</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-400">
            {skills.reduce((sum, s) => sum + s.downloads, 0)}
          </div>
          <div className="text-xs text-zinc-500 mt-0.5">Total Downloads</div>
        </div>
      </div>
    </div>
  )
}
