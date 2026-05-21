'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Brain, Heart, Network, Upload, Shield, Zap, BookOpen, Sparkles, Loader2, Eye, ChevronDown, ChevronRight } from 'lucide-react'

const DIMENSIONS = [
  { key: 'cognitive_patterns', label: '认知模式', icon: Brain },
  { key: 'value_judgment', label: '价值判断', icon: Shield },
  { key: 'expression_style', label: '表达风格', icon: Heart },
  { key: 'knowledge_structure', label: '知识结构', icon: BookOpen },
  { key: 'emotional_response', label: '情感反应', icon: Sparkles },
  { key: 'relationship_memory', label: '关系记忆', icon: Network },
  { key: 'life_narrative', label: '生命叙事', icon: Zap },
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

  // Snapshot
  const [signature, setSignature] = useState('')
  const [snapping, setSnapping] = useState(false)

  // Extraction
  const [extracting, setExtracting] = useState<Record<string, boolean>>({})
  const [extractions, setExtractions] = useState<any[]>([])
  const [expandedExtract, setExpandedExtract] = useState<string | null>(null)

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
      alert('请至少输入 50 个字符才能导入（太短无法提取灵魂特征）')
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
      alert('导入失败，请重试')
    }
  }

  async function extractSession(importId: string) {
    const importData = imports.find(i => i.id === importId)
    if (!importData?.raw_text) {
      alert('找不到导入的原文数据')
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
      alert('提取失败，请重试')
    }
    setExtracting(prev => ({ ...prev, [importId]: false }))
  }

  async function handleCalibrate() {
    if (!agentResp.trim() || !correctResp.trim()) {
      alert('请填写 Agent 回答和纠正两个字段')
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
      alert('校准提交失败，请重试')
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
      alert('快照生成失败，请重试')
      setSnapping(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold text-zinc-50">灵魂蒸馏中心</h1>
        <p className="mt-2 text-zinc-400">把一个人的人格蒸馏成可持续的数字灵魂</p>

        {/* Progress overview */}
        {status && (
          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <Badge variant="primary" className="mb-2">
                  蒸馏阶段: {status.distillation_phase}
                </Badge>
                <div className="mt-2 text-2xl font-bold text-amber-400">
                  {status.distillation_progress}%
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm text-zinc-400">
                <div>导入: {status.stats.imports}</div>
                <div>校准: {status.stats.calibrations}</div>
                <div>记忆: {status.stats.memories}</div>
                <div>快照: v{status.stats.snapshot_version}</div>
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
              {t === 'import' ? '数据导入' : t === 'extract' ? `灵魂提取 (${extractions.length})` : t === 'calibrate' ? '校准纠正' : '灵魂快照'}
            </button>
          ))}
        </div>

        {/* Import tab */}
        {tab === 'import' && (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
              <h3 className="mb-4 text-lg font-semibold text-zinc-50">倒入原始数据</h3>
              <p className="mb-4 text-sm text-zinc-400">倒入聊天记录、邮件、日记、文章等原始文本，至少 50 字才能启动灵魂提取。</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-zinc-400">来源类型</label>
                  <select value={sourceType} onChange={(e) => setSourceType(e.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-50">
                    <option value="chat_log">聊天记录</option>
                    <option value="email">邮件往来</option>
                    <option value="writing">写作作品</option>
                    <option value="social">社交媒体</option>
                    <option value="voice">语音转文字</option>
                    <option value="document">文档笔记</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-zinc-400">来源名称</label>
                  <input value={sourceName} onChange={(e) => setSourceName(e.target.value)} placeholder="微信聊天记录 2025" className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-50 placeholder:text-zinc-600" />
                </div>
              </div>
              <div className="mt-4">
                <label className="mb-1 block text-sm text-zinc-400">原始文本</label>
                <textarea value={rawText} onChange={(e) => setRawText(e.target.value)} rows={10} placeholder="粘贴聊天记录、邮件、文章、日记等原始文本..." className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-50 placeholder:text-zinc-600 font-mono text-sm" />
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className={`text-xs ${rawText.length >= 50 ? 'text-emerald-400' : 'text-zinc-500'}`}>
                  {rawText.length} 字{rawText.length < 50 ? ` (还差 ${50 - rawText.length} 字)` : ' ✓ 可以提取'}
                </span>
                <Button onClick={handleImport} disabled={rawText.trim().length < 50} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white disabled:opacity-50">
                  <Upload className="mr-2 h-4 w-4" /> 倒入
                </Button>
              </div>
            </div>

            {imports.length > 0 && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
                <h3 className="mb-4 text-lg font-semibold text-zinc-50">已导入数据 ({imports.length})</h3>
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
                            <div className="text-xs text-zinc-500">{imp.source_type} · {(imp.char_count ?? 0).toLocaleString()} 字</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {imp.extraction_status === 'pending' && (
                              <button
                                onClick={() => extractSession(imp.id)}
                                disabled={extracting[imp.id]}
                                className="rounded-md bg-indigo-500/20 px-3 py-1 text-xs text-indigo-400 hover:bg-indigo-500/30 disabled:opacity-50 whitespace-nowrap"
                              >
                                {extracting[imp.id] ? (
                                  <><Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> 提取中</>
                                ) : (
                                  <><Sparkles className="mr-1 inline h-3 w-3" /> 提取灵魂</>
                                )}
                              </button>
                            )}
                            <Badge variant={imp.extraction_status === 'completed' ? 'primary' : imp.extraction_status === 'extracting' ? 'outline' : 'secondary'}>
                              {imp.extraction_status === 'pending' ? '待提取' : imp.extraction_status === 'extracting' ? '提取中' : '已提取'}
                            </Badge>
                          </div>
                        </div>

                        {imp.extraction_status === 'completed' && extCount > 0 && (
                          <div className="rounded-lg border border-zinc-800/50 bg-zinc-950/50 px-4 py-2">
                            <div className="flex items-center gap-1 text-xs text-zinc-500 mb-1">
                              <span>已提取 {extCount}/7 维</span>
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
                <p className="mt-4 text-zinc-500">还没有提取结果</p>
                <p className="mt-1 text-sm text-zinc-600">先导入数据，然后点击「提取灵魂」开始蒸馏</p>
                <button onClick={() => setTab('import')} className="mt-4 text-sm text-indigo-400 hover:text-indigo-300">前往数据导入 →</button>
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
                              置信度 {(ext.confidence * 100).toFixed(0)}% · {new Date(ext.created_at).toLocaleDateString('zh-CN')}
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
              <h3 className="mb-2 text-lg font-semibold text-zinc-50">校准纠正</h3>
              <p className="mb-4 text-sm text-zinc-400">观察 Agent 的表达，纠正「不像」的部分。每条纠正都是灵魂的一次精炼。</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-zinc-400">Agent 说/做的事</label>
                  <textarea value={agentResp} onChange={(e) => setAgentResp(e.target.value)} rows={4} placeholder="Agent 的回答/表达/行为..." className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-50 placeholder:text-zinc-600" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-zinc-400">正确的版本</label>
                  <textarea value={correctResp} onChange={(e) => setCorrectResp(e.target.value)} rows={4} placeholder="TA 实际会怎么说/怎么做..." className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-50 placeholder:text-zinc-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <select value={calibDim} onChange={(e) => setCalibDim(e.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50">
                  {DIMENSIONS.map(d => (
                    <option key={d.key} value={d.key}>{d.label}</option>
                  ))}
                </select>
                <Button onClick={handleCalibrate} className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white">
                  <Heart className="mr-2 h-4 w-4" /> 提交校准
                </Button>
              </div>
            </div>

            {calibrations.length > 0 && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
                <h3 className="mb-4 text-lg font-semibold text-zinc-50">校准历史 ({calibrations.length})</h3>
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
                            <span className="text-xs text-emerald-600">纠正:</span> {c.corrected_response}
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
              <h3 className="mb-2 text-lg font-semibold text-zinc-50">生成灵魂快照</h3>
              <p className="mb-4 text-sm text-zinc-400">快照会把当前所有人格维度、记忆、技能打包成一个可迁移的版本。换载体不丢魂。</p>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm text-zinc-400">守护者签名（可选）</label>
                  <textarea value={signature} onChange={(e) => setSignature(e.target.value)} rows={3} placeholder="我确认这个灵魂快照代表了 TA 的人格特征..." className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-50 placeholder:text-zinc-600" />
                </div>
                <div className="flex items-center gap-4 text-sm text-zinc-400">
                  <span>人格维度: {status?.dimensions?.filled ?? 0}/{status?.dimensions?.total ?? 7}</span>
                  <span>记忆条: {status?.stats?.memories ?? 0}</span>
                  <span>技能: {status?.stats?.skills ?? 0}</span>
                </div>
                <Button onClick={handleSnapshot} disabled={snapping} className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white disabled:opacity-50">
                  {snapping ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 生成中...</> : '生成灵魂快照'}
                </Button>
              </div>
            </div>

            {status?.stats?.snapshot_version && status.stats.snapshot_version > 0 && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
                <h3 className="mb-2 text-lg font-semibold text-zinc-50">最新快照</h3>
                <div className="flex items-center gap-4">
                  <Badge variant="primary">v{status.stats.snapshot_version}</Badge>
                  <span className="text-sm text-zinc-400">
                    维度: {status.dimensions?.filled ?? 0}/{status.dimensions?.total ?? 7} ·
                    校准: {status.stats.calibrations} ·
                    记忆: {status.stats.memories}
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
