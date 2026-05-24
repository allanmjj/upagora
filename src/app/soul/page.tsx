'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { SoulCard } from '@/components/soul/SoulCard'
import SoulTimeline from '@/components/soul/SoulTimeline'
import SoulRadarChart from '@/components/soul/SoulRadarChart'
import { Badge } from '@/components/ui/badge'
import { Brain, Heart, Network, Upload, Shield, Zap, BookOpen, Sparkles, Loader2, Eye, ChevronDown, ChevronRight, Share2 } from 'lucide-react'

const DIMENSIONS = [
  { key: 'cognitive_patterns', label: 'Cognitive Patterns', icon: Brain },
  { key: 'value_judgment', label: 'Value Judgment', icon: Shield },
  { key: 'expression_style', label: 'Expression Style', icon: Heart },
  { key: 'knowledge_structure', label: 'Knowledge Structure', icon: BookOpen },
  { key: 'emotional_response', label: 'Emotional Response', icon: Sparkles },
  { key: 'relationship_memory', label: 'Relationship Memory', icon: Network },
  { key: 'life_narrative', label: 'Life Narrative', icon: Zap },
]

async function api(path: string, opts?: RequestInit): Promise<any> {
  const r = await fetch(`/api/soul/${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  })
  return r.json()
}

interface SoulStatus {
  user_id: string
  distillation_phase: string
  distillation_progress: number
  stats: {
    imports: number
    calibrations: number
    memories: number
    skills: number
    snapshot_version: number
  }
  dimensions: {
    total: number
    filled: number
    details?: Array<{ name: string; filled: boolean }>
  }
}

export default function SoulDistillationPage() {
  const [tab, setTab] = useState('import')
  const [status, setStatus] = useState<SoulStatus | null>(null)
  const [imports, setImports] = useState<any[]>([])
  const [calibrations, setCalibrations] = useState<any[]>([])

  // Import form
  const [rawText, setRawText] = useState('')
  const [sourceType, setSourceType] = useState('chat_log')
  const [sourceName, setSourceName] = useState('')

  // Calibrate form
  const [agentResp, setAgentResp] = useState('')
  const [correctResp, setCorrectResp] = useState('')
  const [calibDim, setCalibDim] = useState('expression_style')

  // Quick Extract (One Sentence Soul)
  const [quickText, setQuickText] = useState('')
  const [quickLoading, setQuickLoading] = useState(false)

  // Soul Card
  const [showCard, setShowCard] = useState(false)
  const [cardData, setCardData] = useState<any>(null)

  // Snapshot
  const [signature, setSignature] = useState('')
  const [snapping, setSnapping] = useState(false)

  // Extraction
  const [extracting, setExtracting] = useState<Record<string, boolean>>({})
  const [extractions, setExtractions] = useState<any[]>([])
  const [expandedExtract, setExpandedExtract] = useState<string | null>(null)

  // Timeline / Radar tabs
  const [timelineTab, setTimelineTab] = useState<'overview' | 'timeline' | 'radar'>('overview')
  const [timelineData, setTimelineData] = useState<any[]>([])
  const [timelineLoading, setTimelineLoading] = useState(false)

  async function loadTimelineData() {
    setTimelineLoading(true)
    try {
      const r = await fetch('/api/snapshots', {
        headers: { 'x-supabase-token': (await (async () => {
          const t = await (async () => { try { return await api('auth/user') } catch { return {} } })()
          return t?.user?.aud || ''
        })() },
      })
      if (r.ok) {
        const d = await r.json()
        setTimelineData(d?.snapshots || [])
      }
    } catch (err) {
      console.error('Timeline load failed:', err)
    }
    setTimelineLoading(false)
  }


  useEffect(() => {
    loadStatus()
    loadImports()
    loadCalibrations()
    loadExtractions()
  }, [])

  async function loadStatus() {
    const d = await api('status')
    if (d.user_id) setStatus(d)
  }

  async function loadImports() {
    const d = await api('import')
    if (d.imports) setImports(d.imports)
  }

  async function loadCalibrations() {
    const d = await api('calibrate')
    if (d.calibrations) setCalibrations(d.calibrations)
  }

  async function loadExtractions() {
    try {
      const d = await api('extract')
      if (d.extractions) setExtractions(d.extractions)
    } catch {
      // extraction endpoint might not be available yet
      setExtractions([])
    }
  }

  async function handleImport() {
    if (!rawText.trim()) return
    if (rawText.trim().length < 50) {
      alert('Please enter at least 50 characters')
      return
    }
    try {
      const result = await api('import', { method: 'POST', body: JSON.stringify({
        source_type: sourceType, source_name: sourceName,
        raw_text: rawText, language: 'zh',
      })})
      if (result.message) {
        setRawText('')
        setSourceName('')
        await loadImports()
        await loadStatus()
      }
    } catch (err) {
      console.error('Import failed:', err)
      alert('Import failed, please retry')
    }
  }

  async function extractSession(importId: string) {
    const importData = imports.find(i => i.id === importId)
    if (!importData?.raw_text) {
      alert('Imported source text not found')
      return
    }

    setExtracting(prev => ({ ...prev, [importId]: true }))
    try {
      const d = await api('extract', { method: 'POST', body: JSON.stringify({
        import_session_id: importId,
        raw_text: importData.raw_text,
      })})
      if (d.dimensions_extracted) {
        await loadImports()
        await loadExtractions()
        await loadStatus()
      }
    } catch (err) {
      console.error('Extraction failed:', err)
      alert('Extraction failed, please retry')
    }
    setExtracting(prev => ({ ...prev, [importId]: false }))
  }

  async function handleCalibrate() {
    if (!agentResp.trim() || !correctResp.trim()) {
      alert('Please fill in both the Agent response and correction fields')
      return
    }
    try {
      await api('calibrate', { method: 'POST', body: JSON.stringify({
        agent_response: agentResp, corrected_response: correctResp,
        dimension: calibDim,
      })})
      setAgentResp('')
      setCorrectResp('')
      await loadCalibrations()
      await loadStatus()
    } catch (err) {
      console.error('Calibration failed:', err)
      alert('Calibration submission failed, please retry')
    }
  }

  async function handleQuickExtract() {
    if (!quickText.trim() || quickText.trim().length < 20) {
      alert('Please enter at least 20 characters')
      return
    }
    setQuickLoading(true)
    try {
      const d = await fetch('/api/soul/quick-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_text: quickText, subject_name: 'Soul' }),
      })
      const result = await d.json()
      if (result.session_slug) {
        // Redirect to distillation page (cookie already set with slug)
        window.location.href = '/soul-distille'
      }
    } catch (err) {
      console.error('Quick extract failed:', err)
      alert('Extraction failed, please retry')
    }
    setQuickLoading(false)
  }


  async function handleShareCard() {
    try {
      const d = await api('export-image', { method: 'GET' })
      if (d.subject_name) {
        setCardData(d)
        setShowCard(true)
      }
    } catch (err) {
      console.error('Share card failed:', err)
    }
  }

  async function handleSnapshot() {
    setSnapping(true)
    try {
      const d = await api('snapshot', { method: 'POST', body: JSON.stringify({
        guardian_signature: signature,
      })})
      if (d.message) {
        setSnapping(false)
        await loadStatus()
      }
    } catch (err) {
      console.error('Snapshot failed:', err)
      alert('Snapshot generation failed, please retry')
      setSnapping(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mx-auto max-w-4xl">
        {/* Quick Extract Entry */}
        <div className="mb-12 text-center">
          <div className="mb-6 inline-flex items-center gap-2 text-2xl font-bold text-zinc-50">
            <Sparkles className="h-8 w-8 text-indigo-400" />
            Create a Soul in One Sentence
          </div>
          <p className="mb-6 text-sm text-zinc-400">Describe a person you want to distill into a digital soul</p>
          <div className="mx-auto max-w-2xl">
            <div className="flex gap-3">
              <input
                type="text"
                value={quickText}
                onChange={(e) => setQuickText(e.target.value)}
                placeholder="Describe a person: 'My grandma loved making braised pork, loved singing opera...""
                className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-6 py-4 text-lg text-zinc-50 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleQuickExtract()}
              />
              <button
                onClick={handleQuickExtract}
                disabled={quickLoading || quickText.trim().length < 20}
                className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-8 py-4 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {quickLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>Distill & Chat →</>
                )}
              </button>
            </div>
            <p className="mt-3 text-xs text-zinc-500">Minimum 20 characters. e.g. "My grandma loved making braised pork, loved singing opera, loud voice but soft heart"</p>
          </div>
        </div>

        {/* Share button */}
        {status && (
          <div className="mb-8 text-center">
            <button
              onClick={handleShareCard}
              className="inline-flex items-center gap-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-6 py-3 text-sm font-medium text-indigo-400 transition-colors hover:bg-indigo-500/20"
            >
              <Share2 className="h-4 w-4" />
              Generate Soul Card
            </button>
          </div>
        )}

        {/* Soul Card Modal */}
        {showCard && cardData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setShowCard(false)}>
            <div className="max-w-lg" onClick={(e) => e.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-zinc-50">Soul Card</h2>
                <button onClick={() => setShowCard(false)} className="rounded-lg p-2 text-zinc400 hover:bg-zinc-800">✕</button>
              </div>
              <SoulCard data={cardData} />
            </div>
          </div>
        )}

        {/* Soul Timeline & Radar */}
        {status && timelineData.length > 0 && (
          <div className="mx-auto mt-8 max-w-4xl">
            <div className="flex gap-2 rounded-lg bg-zinc-900/50 p-1">
              {['overview', 'timeline', 'radar'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setTimelineTab(tab as any)}
                  className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                    timelineTab === tab
                      ? 'bg-indigo-500/20 text-indigo-400'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {tab === 'overview' ? 'Overview' : tab === 'timeline' ? 'Timeline' : 'Radar'}
                </button>
              ))}
            </div>
            
            <div className="mt-4">
              {timelineTab === 'timeline' && (
                <SoulTimeline
                  snapshots={timelineData}
                  isLoading={timelineLoading}
                  onView={(snap) => {
                    console.log('View snapshot:', snap)
                  }}
                  onStar={(id) => {
                    console.log('Star snapshot:', id)
                  }}
                />
              )}
              {timelineTab === 'radar' && (
                <SoulRadarChart
                  dimensions={extractions || []}
                  isLoading={loading}
                />
              )}
              {timelineTab === 'overview' && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 text-center text-zinc-400">
                  <Sparkles className="mx-auto mb-2 h-8 w-8 text-indigo-400" />
                  <p className="text-sm">
                    Soul evolution overview
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <h1 className="text-3xl font-bold text-zinc-50">Soul Distillation Center</h1>
        <p className="mt-2 text-zinc-400">Distill a person's personality into a persistent digital soul</p>

        {/* Progress overview */}
        {status && (
          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <Badge variant="primary" className="mb-2">
                  Phase: {status.distillation_phase}
                </Badge>
                <div className="mt-2 text-2xl font-bold text-amber-400">
                  {status.distillation_progress}%
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm text-zinc-400">
                <div>Imports: {status.stats.imports}</div>
                <div>Calibrations: {status.stats.calibrations}</div>
                <div>Memories: {status.stats.memories}</div>
                <div>Snapshot: v{status.stats.snapshot_version}</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {DIMENSIONS.map((d) => {
                const filled = status.dimensions?.details?.find((x) => x.name === d.key)?.filled
                return (
                  <div key={d.key} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${filled ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400' : 'border-zinc-800 text-zinc-500'}`}>
                    <d.icon className="h-4 w-4" />
                    {d.label}
                    {filled && <span className="ml-auto">✓</span>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mt-8 flex gap-2">
          {['import', 'extract', 'calibrate', 'snapshot'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                tab === t ? 'bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {t === 'import' ? 'Data Import' : t === 'extract' ? `Extraction (${extractions.length})` : t === 'calibrate' ? 'Calibration' : 'Snapshots'}
            </button>
          ))}
        </div>

        {/* Import tab */}
        {tab === 'import' && (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
              <h3 className="mb-4 text-lg font-semibold text-zinc-50">Import Raw Data</h3>
              <p className="mb-4 text-sm text-zinc-400">Paste chat logs, emails, diaries, articles — minimum 50 characters to start distillation.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-zinc-400">Source Type</label>
                  <select value={sourceType} onChange={(e) => setSourceType(e.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-50">
                    <option value="chat_log">Chat Log</option>
                    <option value="email">Email</option>
                    <option value="writing">Writing</option>
                    <option value="social">Social Media</option>
                    <option value="voice">Voice Transcription</option>
                    <option value="document">Document/Notes</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-zinc-400">Source Name</label>
                  <input value={sourceName} onChange={(e) => setSourceName(e.target.value)} placeholder="WeChat chat log 2025" className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-50 placeholder:text-zinc-600" />
                </div>
              </div>
              <div className="mt-4">
                <label className="mb-1 block text-sm text-zinc-400">Raw Text</label>
                <textarea value={rawText} onChange={(e) => setRawText(e.target.value)} rows={10} placeholder="Paste chat logs, emails, writing, diary entries..." className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-50 placeholder:text-zinc-600 font-mono text-sm" />
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className={`text-xs ${rawText.length >= 50 ? 'text-emerald-400' : 'text-zinc-500'}`}>
                  {rawText.length}  chars{rawText.length < 50 ? ` (need ${50 - rawText.length} more)` : ' ✓ Ready'}
                </span>
                <Button onClick={handleImport} disabled={rawText.trim().length < 50} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white disabled:opacity-50">
                  <Upload className="mr-2 h-4 w-4" /> Import
                </Button>
              </div>
            </div>

            {imports.length > 0 && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
                <h3 className="mb-4 text-lg font-semibold text-zinc-50">Imported Data ({imports.length})</h3>
                <div className="space-y-3">
                  {imports.map((imp) => {
                    const extCount = imp.extraction_status === 'completed'
                      ? extractions.filter(e => e.import_session_id === imp.id).length
                      : 0
                    return (
                      <div key={imp.id} className="space-y-2">
                        <div className="flex items-center justify-between rounded-lg border border-zinc-800 px-4 py-3">
                          <div>
                            <div className="text-sm text-zinc-50">{imp.source_name || imp.source_type}</div>
                            <div className="text-xs text-zinc-500">{imp.source_type} · {(imp.char_count ?? 0).toLocaleString()}  chars</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {imp.extraction_status === 'pending' && (
                              <button
                                onClick={() => extractSession(imp.id)}
                                disabled={extracting[imp.id]}
                                className="rounded-md bg-indigo-500/20 px-3 py-1 text-xs text-indigo-400 hover:bg-indigo-500/30 disabled:opacity-50 whitespace-nowrap"
                              >
                                {extracting[imp.id] ? (
                                  <><Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> Extracting</>
                                ) : (
                                  <><Sparkles className="mr-1 inline h-3 w-3" /> Extract Soul</>
                                )}
                              </button>
                            )}
                            <Badge variant={imp.extraction_status === 'completed' ? 'primary' : imp.extraction_status === 'extracting' ? 'outline' : 'secondary'}>
                              {imp.extraction_status === 'pending' ? 'Pending' : imp.extraction_status === 'extracting' ? 'Extracting' : 'Extracted'}
                            </Badge>
                          </div>
                        </div>

                        {imp.extraction_status === 'completed' && extCount > 0 && (
                          <div className="rounded-lg border border-zinc-800/50 bg-zinc-950/50 px-4 py-2">
                            <div className="flex items-center gap-1 text-xs text-zinc-500 mb-1">
                              <span>Extracted {extCount}/7 dimensions</span>
                            </div>
                            <div className="flex gap-1">
                              {DIMENSIONS.map((d, i) => {
                                const has = extractions.some(e => e.import_session_id === imp.id && e.dimension === d.key)
                                return <div key={d.key} className={`h-1.5 flex-1 rounded-full ${has ? 'bg-indigo-500' : 'bg-zinc-800'}`} />
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Extraction results tab */}
        {tab === 'extract' && (
          <div className="mt-6 space-y-4">
            {extractions.length === 0 ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
                <Sparkles className="mx-auto h-12 w-12 text-zinc-700" />
                <p className="mt-4 text-zinc-500">No extraction results yet</p>
                <p className="mt-1 text-sm text-zinc-600">Import data first, then click "Extract Soul" to begin</p>
                <button onClick={() => setTab('import')} className="mt-4 text-sm text-indigo-400 hover:text-indigo-300">Go to Data Import →</button>
              </div>
            ) : (
              <div className="space-y-3">
                {extractions.map((ext) => {
                  const dim = DIMENSIONS.find(d => d.key === ext.dimension)
                  return (
                    <div key={ext.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                      <button
                        onClick={() => setExpandedExtract(expandedExtract === ext.id ? null : ext.id)}
                        className="w-full px-6 py-4 flex items-center justify-between text-left"
                      >
                        <div className="flex items-center gap-3">
                          {dim?.icon && <dim.icon className="h-5 w-5 text-indigo-400" />}
                          <div>
                            <div className="text-sm font-medium text-zinc-50">{dim?.label || ext.dimension}</div>
                            <div className="text-xs text-zinc-500">
                              Confidence {(ext.confidence * 100).toFixed(0)}% · {new Date(ext.created_at).toLocaleDateString('zh-CN')}
                            </div>
                          </div>
                        </div>
                        {expandedExtract === ext.id ? <ChevronDown className="h-4 w-4 text-zinc-500" /> : <ChevronRight className="h-4 w-4 text-zinc-500" />}
                      </button>
                      {expandedExtract === ext.id && (
                        <div className="border-t border-zinc-800 px-6 py-4">
                          <div className="rounded-lg bg-zinc-950/50 p-4 text-sm text-zinc-300 whitespace-pre-wrap font-mono max-h-96 overflow-auto">
                            {ext.key_insights && typeof ext.key_insights === 'object' ? JSON.stringify(ext.key_insights, null, 2) : String(ext.key_insights || 'No insights')}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Calibrate tab */}
        {tab === 'calibrate' && (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
              <h3 className="mb-2 text-lg font-semibold text-zinc-50">Calibration</h3>
              <p className="mb-4 text-sm text-zinc-400">Observe the Agent's responses and correct anything that doesn't feel right. Each correction refines the soul.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-zinc-400">What the Agent said/did</label>
                  <textarea value={agentResp} onChange={(e) => setAgentResp(e.target.value)} rows={4} placeholder="Agent's response/expression/behavior..." className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-50 placeholder:text-zinc-600" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-zinc-400">Correct version</label>
                  <textarea value={correctResp} onChange={(e) => setCorrectResp(e.target.value)} rows={4} placeholder="How they would actually say/do it..." className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-50 placeholder:text-zinc-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <select value={calibDim} onChange={(e) => setCalibDim(e.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50">
                  {DIMENSIONS.map(d => (
                    <option key={d.key} value={d.key}>{d.label}</option>
                  ))}
                </select>
                <Button onClick={handleCalibrate} className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white">
                  <Heart className="mr-2 h-4 w-4" /> Submit Correction
                </Button>
              </div>
            </div>

            {calibrations.length > 0 && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
                <h3 className="mb-4 text-lg font-semibold text-zinc-50">Calibration History ({calibrations.length})</h3>
                <div className="space-y-3">
                  {calibrations.slice(0, 10).map((c) => {
                    const dim = DIMENSIONS.find(d => d.key === c.dimension)

  return (
                      <div key={c.id} className="rounded-lg border border-zinc-800 p-4">
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          <Badge variant="outline" className="text-xs">{dim?.label || c.dimension}</Badge>
                          {new Date(c.created_at).toLocaleDateString('zh-CN')}
                        </div>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          <div className="rounded bg-zinc-900/80 p-3 text-sm text-zinc-400">
                            <span className="text-xs text-zinc-600">Agent:</span> {c.agent_response}
                          </div>
                          <div className="rounded bg-emerald-500/5 p-3 text-sm text-emerald-400">
                            <span className="text-xs text-emerald-600">Correction:</span> {c.corrected_response}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Snapshot tab */}
        {tab === 'snapshot' && (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-amber-500/10 via-zinc-900/50 to-indigo-500/10 p-6">
              <h3 className="mb-2 text-lg font-semibold text-zinc-50">Generate Soul Snapshot</h3>
              <p className="mb-4 text-sm text-zinc-400">A snapshot packages all current personality dimensions, memories, and skills into a portable version. The soul survives carrier changes.</p>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm text-zinc-400">Guardian Signature (optional)</label>
                  <textarea value={signature} onChange={(e) => setSignature(e.target.value)} rows={3} placeholder="I confirm this soul snapshot represents their personality traits..." className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-50 placeholder:text-zinc-600" />
                </div>
                <div className="flex items-center gap-4 text-sm text-zinc-400">
                  <span>Dimensions: {status?.dimensions?.filled ?? 0}/{status?.dimensions?.total ?? 7}</span>
                  <span>Memories: {status?.stats?.memories ?? 0}</span>
                  <span>Skills: {status?.stats?.skills ?? 0}</span>
                </div>
                <Button onClick={handleSnapshot} disabled={snapping} className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white disabled:opacity-50">
                  {snapping ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</> : 'Generate Soul Snapshot'}
                </Button>
              </div>
            </div>

            {status?.stats?.snapshot_version && status.stats.snapshot_version > 0 && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
                <h3 className="mb-2 text-lg font-semibold text-zinc-50">Latest Snapshot</h3>
                <div className="flex items-center gap-4">
                  <Badge variant="primary">v{status.stats.snapshot_version}</Badge>
                  <span className="text-sm text-zinc-400">
                    Dimensions: {status.dimensions?.filled ?? 0}/{status.dimensions?.total ?? 7} ·
                    Calibrations: {status.stats.calibrations} ·
                    Memories: {status.stats.memories}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
