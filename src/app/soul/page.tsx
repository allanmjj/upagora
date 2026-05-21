'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Brain, Heart, Network, Upload, Shield, Zap, BookOpen, Sparkles, Loader2, Eye, ChevronDown, ChevronRight, Package, Download, Globe, Lock, ExternalLink, Check } from 'lucide-react'

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
   n          appet-password            ..     v�             typed-array-objects.js����L��L���f���L��������L�������H�E�dH+%(   t*����H��L�������H���H��L������H������H��P��[A\A]A^]�UH�52< H��AVI��AUATL�e�SL��H��PdH�%(   H�E�1��V���L��L��������Ä�u(L�m�H�5�; L���2���L��L������L�������L������H�E�dH+%(   t*�����H��L��������H���H��L�������H�������H��P��[A\A]A^]�UH�5; H��AWAVAUATSH��H  H������dH�%(   H�E�1�H������H��H����������H������H������������Ä���  H������H�5; H��H�������L���H������H�����������Ä��R  H�����H�5�: H��H����������H������H�����������Ä��  L��(���H�5�: L�������H������L���R����Ä���   L��H���H�5�: L������H������L���#����Ä���   H��h���H�5\: H��H�������z���H������H������������Ä�u\L�u�H�5.: L���N���H������L��������Ä�u,L�}�H�5: L���&���H������L������L�����	���L������H�����������L�������L�������H�����������H�����������H�����������H�U�dH+%(   ��   �y���H��H�����������nH��L�������
��H���ZH��L���y����H��H�������h����H��L���[����H��L���N����H��H�������=����H��H�������,����H������H��H  ��[A\A]A^A_]�UH�5�8 H��AWAVAUATL��H���SH��   H��8���L��dH�%(   H�E�1������H��8���L���E����Ä���   L��h���H�5�8 L������H��8���L�������Ä�u\L�u�H�5p8 L���{���H��8���L��������Ä�u,L�}�H�5M8 L���S���H��8���L�������L�����6���L���.���L���&���L������H�U�dH+%(   tD�����H��L��������H���%H��L��������H��L��������H��L�������H������H�Ĩ   ��[A\A]A^A_]�UH�5�7 H��A   o   �    "    0        ���          ���          ���           ��          ��           ��          0��        	  @��        
  P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���           ���        !  ���        "  ���        #  ���        $  ���        %   ��        &  ��        '   ��        (  0��        )  @��        *  P��        +  `��        ,  p��        -  ���        .  ���        /  ���        0  ���        1  ���        2  ���        3  ���        4  ���        5   ��        6  ��        7   ��        8  0��        9  @��        :  P��        ;  `��        <  p��        =  ���        >  ���        ?  ���        @  ���        A  ���    �   B >>;
            /**
             * If specified, this request is related to the provided task.
             */
            "io.modelcontextprotocol/related-task": z.ZodOptional<z.ZodObject<{
                taskId: z.ZodString;
            }, z.core.$strip>>;
        }, z.core.$loose>>;
        taskId: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * The response to a tasks/result request.
 * The structure matches the result type of the original request.
 * For example, a tools/call task would return the CallToolResult structure.
 *
 */
export declare const GetTaskPayloadResultSchema: z.ZodObject<{
    /**
     * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
     * for notes on _meta usage.
     */
    _meta: z.ZodOptional<z.ZodObject<{
        /**
         * If specified, the caller is requesting out-of-band progress notific   n          api .�    �             ..     I             .editorconfig     ze            	 .eslintrc�    �            .github     I            .nycrc     5            CHANGELOG.md     v            index.js         	        LICENSE     �    
        package.json     �           	 README.mdp-route.js     �            edge-app-route.js.map     \�            edge-ssr-app.d.ts     5�            edge-ssr-app.js     �            edge-ssr-app.js.map     ]�            edge-ssr.d.ts     7�            edge-ssr.js     �            edge-ssr.js.map     9�            edge-wrapper.js     �            edge-wrapper.js.map     T�            helpers.d.ts     
�           
 helpers.js     ��            helpers.js.map     ��            middleware.d.ts     ��            middleware.js     ?�            middleware.js.map     8�            pages-api.d.ts     �            pages-api.js     I�            pages-api.js.map     <�            pages-edge-api.d.ts     ��            pages-edge-api.js     S�            pages-edge-api.js.map     H�            
 pages.d.ts     �    !        pages.js     l�    "        pages.js.mapo the provided task.
             */
            "io.modelcontextprotocol/related-task": z.ZodOptional<z.ZodObject<{
                taskId: z.ZodString;
            }, z.core.$strip>>;
        }, z.core.$loose>>;
        cursor: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    method: z.ZodLiteral<"tasks/list">;
}, z.core.$strip>;
/**
 * The response to a tasks/list request.
 */
export declare const ListTasksResultSchema: z.ZodObject<{
    _meta: z.ZodOptional<z.ZodObject<{
        /**
         * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiv ���          ���          ���          ���           ��          ��           ��          0��          @��        	  P��        
  `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���           ���        !  ���        "  ���        #  ���        $   ��        %  ��        &   ��        '  0��        (  @��        )  P��        *  `��        +  p��        ,  ���        -  ���        .  ���        /  ���        0  ���        1  ���        2  ���        3  ���        4   ��        5  ��        6   ��        7  0��        8  @��        9  P��        :  `��        ;  p��        <  ���        =  ���        >  ���        ?  ���        @  ���        A  ���    �   B export declare const CancelTaskRequestSchema: z.ZodObject<{
    method: z.ZodLiteral<"tasks/cancel">;
    params: z.ZodObject<{
        _meta: z.ZodOptional<z.ZodObject<{
            /**
             * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
             */
            progressToken: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
            /**
             * If specified, this request is related to the provided task.
             */
            "io.modelcontextprotocol/related-task": z.ZodOptional<z.ZodObject<{
                taskId: z.ZodString;
            }, z.core.$strip>>;
        }, z.core.$loose>>;
        taskId: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * The response to a task        �      api .�    ��             ..     ��             typed-array-objects.jsOptional<z.ZodObject<{
        /**
         * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
         */
        progressToken: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
        /**
         * If specified, this request is related to the provided task.
         */
        "io.modelcontextprotocol/related-task": z.ZodOptional<z.ZodObject<{
            taskId: z.ZodString;
        }, z.core.$strip>>;
    }, z.core.$loose>>;
    taskId: z.ZodString;
    status: z.ZodEnum<{
        working: "working";
        input_required: "input_required";
        completed: "completed";
        failed: "failed";
        cancelled: "cancelled";
    }>;
    ttl: z.ZodUnion<readonly [z.ZodNumber, z.ZodNull]>;
    createdAt: z.ZodString;
    lastUpdatedAt: z.ZodString;
    pollInterval: z.ZodOptional<z.ZodNumber>;
    statusMessage: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
/**
 * The contents of a specific resource or sub-resource.
 */
export declare const ResourceContentsSchema: z.ZodObject<{
    uri: z.ZodString;
    mimeType: z.ZodOptional<z.ZodString>;
    _meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export declare const TextResourceContentsSchema: z.ZodObject<{
    uri: z.ZodString;
    mimeType: z.ZodOptional<z.ZodString>;
    _meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    text: z.ZodString;
}, z.core.$strip>;
export declare const BlobResourceContentsSchema: z.ZodObject<{
    uri: z.ZodString;
    mimeType: z.ZodOptional<z.ZodString>;
    _meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    blob: z.ZodString;
}, z.core.$strip>;
/**
 * The sender or recipient of messages and data in a convers�     �      �    "    0�A                                               d�j    ���-    �vj    �q�    �vj    �q�                                     p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���           ���        !  ���        "  ���        #   ��        $  ��        %   ��        &  0��        '  @��        (  P��        )  `��        *  p��        +  ���        ,  ���        -  ���        .  ���        /  ���        0  ���        1  ���        2  ���        3   ��        4  ��        5   ��        6  0��        7  @��        8  P��        9  `��        :  p��        ;  ���        <  ���        =  ���        >  ���        ?  ���        @  ���        A  ���    �   B Optional<z.ZodObject<{}, z.core.$loose>>;
    icons: z.ZodOptional<z.ZodArray<z.ZodObject<{
        src: z.ZodString;
        mimeType: z.ZodOptional<z.ZodString>;
        sizes: z.ZodOptional<z.ZodArray<z.ZodString>>;
        theme: z.ZodOptional<z.ZodEnum<{
            light: "light";
            dark: "dark";
        }>>;
    }, z.core.$strip>>>;
    name: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
/**
 * A template description for resources available on the server.
 */
export declare const ResourceTemplateSchema: z.ZodObject<{
    uriTemplate: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    mimeType: z.ZodOptional<z.ZodString>;
    annotations: z.ZodOptional<z.ZodObject<{
        audience: z.ZodOptional<z.ZodArray<z.ZodEnum<{
            user: "user";
            assistant: "assistant";
        }>>>;
        priority: z.ZodOptional<z.ZodNumber>;
        lastModified: z.ZodOptional<z.ZodISODateTime>;
    }, z.core.$strip>>;
    _meta   n         
 hermes-lab Sy            ..     �{           	 buffer.js     �|            buffer.js.map�    ~           
 generators     Ǌ            index.js     �            index.js.map�    1�            node     �    	        nodes.js     �    
        nodes.js.map     0�           
 printer.js     h�            printer.js.map                 source-map.js     ،            source-map.js.map     �            token-map.js     "�            token-map.js.mapesourcesRequestSchema: z.ZodObject<{
    params: z.ZodOptional<z.ZodObject<{
        _meta: z.ZodOptional<z.ZodObject<{
            /**
             * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
             */
            progressToken: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
            /**
             * If specified, this request is related to the provided task.
             */
            "io.modelcontextprotocol/related-task": z.ZodOptional<z.ZodObject<{
                taskId: z.ZodString;
            }, z.core.$strip>>;
        }, z.core.$loose>>;
        cursor: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    method: z.ZodLiteral<"resources/list">;
}, z.core.$strip>;
/**
 * The server's response to a resources/list request from the client.
 */
export declare const ListResourcesResultSchema: z.ZodObject<{
    _meta: z.ZodOptional<z.ZodObject<{
        /**
         * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
         */
        progressTo   o   �    �<             ��          ��           ��          0��          @��          P��          `��        	  p��        
  ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���           ���        !  ���        "   ��        #  ��        $   ��        %  0��        &  @��        '  P��        (  `��        )  p��        *  ���        +  ���        ,  ���        -  ���        .  ���        /  ���        0  ���        1  ���        2   ��        3  ��        4   ��        5  0��        6  @��        7  P��        8  `��        9  p��        :  ���        ;  ���        <  ���        =  ���        >  ���        ?  ���        @  ���        A  ���    �   B        mimeType: z.ZodOptional<z.ZodString>;
            sizes: z.ZodOptional<z.ZodArray<z.ZodString>>;
            theme: z.ZodOptional<z.ZodEnum<{
                light: "light";
                dark: "dark";
            }>>;
        }, z.core.$strip>>>;
        name: z.ZodString;
        title: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$loose>;
/**
 * Sent from the client to request a list of resource templates the server has.
 */
export declare const ListResourceTemplatesRequestSchema: z.ZodObject<{
    params: z.ZodOptional<z.ZodObject<{
        _meta: z.ZodOptional<z.ZodObject<{
            /**
             * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
             */
            progressToken: z.ZodOp   n          app .�    �            ..�    ��            baz�    ��            browser_field     q�           
 cup.coffee�    �            dot_main�    �            dot_slash_main�    ��           
 empty_main�    ��    	       
 false_main     H�    
        foo.js�    ��            incorrect_main�    ��            invalid_main�    ƛ            missing_index�    �            missing_main     |�           
 mug.coffee     [�            mug.js�    �           	 multirepo�    ��            nested_symlinks�    �           	 null_main�    k�           
 other_path�    "�            quux�    O�           
 same_names�    �           	 symlinked�    N�            without_basedirlauseVisitor, context);
      case 233 /* ExpressionWithTypeArguments */:
        return visitExpressionWithTypeArgumentsInHeritageClause(node);
      default:
        return visitor(node);
    }
  }
  function assignmentTargetVisitor(node) {
    switch (node.kind) {
      case 210 /* ObjectLiteralExpression */:
      case 209 /* ArrayLiteralExpression */:
        return visitAssignmentPattern(node);
      default:
        return visitor(node);
    }
  }
  function classElementVisitor(node) {
    switch (node.kind) {
      case 176 /* Constructor */:
        return setCurrentClassElementAnd(
          node,
          visitConstructorDeclaration,
          node
        );
      ccallbackfn:(previousValue:U,currentValue:T,currentIndex:number,array:T[])=>U,initialValue:U):U;reduceRight(callbackfn:(previousValue:T,currentValue:T,currentIndex:number,array:T[])=>T):T;reduceRight(callbackfn:(previousValue:T,currentValue:T,currentIndex:number,array:T[])=>T,initialValue:T):T;reduceRight<U>(callbackfn:(previousValue:U,currentValue:T,currentIndex:number,array:T[])=>U,initialValue:U):U;[n:number]:T;}interface ArrayConstructor{new(arrayLength?:number):any[];new<T>(arrayLength:number):T[];new<T>(...items:T[]):T[];(arrayLength?:number):any[];   o   �    "    0        ��           ��          0��          @��          P��          `��          p��        	  ���        
  ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���           ���        !   ��        "  ��        #   ��        $  0��        %  @��        &  P��        '  `��        (  p��        )  ���        *  ���        +  ���        ,  ���        -  ���        .  ���        /  ���        0  ���        1   ��        2  ��        3   ��        4  0��        5  @��        6  P��        7  `��        8  p��        9  ���        :  ���        ;  ���        <  ���        =  ���        >  ���        ?  ���        @  ���        A  ���    �   B FieldResultVisitor(node) {
    switch (node.kind) {
      case 172 /* PropertyDeclaration */:
        return transformFieldInitializer(node);
      case 177 /* GetAccessor */:
      case 178 /* SetAccessor */:
        return classElementVisitor(node);
      default:
        Debug.assertMissingNode(node, "Expected node to either be a PropertyDeclaration, GetAccessorDeclaration, or SetAccessorDeclaration");
        break;
    }
  }
  function visitPrivateIdentifier(node) {
    if (!shouldTransformPrivateElementsOrClassStaticBlocks) {
      return node;
    }
    if (isStatement(node.parent)) {
      return node;
    }
    return setOriginalNode(factory2.createIdentifier(""), node);
  }
  function transformPrivateIdentifierInInExpression(node) {
    const info = accessPrivateIdentifier2(node.left);
    if (info) {
      const receiver = visitNode(node.right, visitor, isExpression);
      return setOriginalNode(
        emitHelpers().createClassPrivateFieldInHelper(info.brandCheckI   n         
 hermes-lab-plugin     );
    }
    return visitEachChild(node, visitor, context);
  }
  function visitPropertyAssignment(node) {
    if (isNamedEvaluation(node, isAnonymousClassNeedingAssignedName)) {
      node = transformNamedEvaluation(context, node);
    }
    return visitEachChild(node, visitor, context);
  }
  function visitVariableStatement(node) {
    const savedPendingStatements = pendingStatements;
    pendingStatements = [];
    const visitedNode = visitEachChild(node, visitor, context);
    const statement = some(pendingStatements) ? [visitedNode, ...pendingStatements] : visitedNode;
    pendingStatements = savedPendingStatements;
    return statement;
  }
  function visitVariableDeclaration(node) {
    if (isNamedEvaluation(node, isAnonymousClassNeedingAssignedName)) {
      node = transformNamedEvaluation(context, node);
    }
    return visitEachChild(node, visitor, context);
  }
  function visitParameterDeclaration(node) {
    if (isNamedEvaluation(node, isAnonymousClassNeedingAssignedName)) {
      node = transformNamedEvaluation(context, node);
    }
    return visitEachChild(node, visitor, context);
  }
  function visitBindingElement(node) {
    if (isNamedEvaluation(node, isAnonymousClassNeedingAssignedName)) {
      node = transformNamedEvaluation(context, node);
    }
    return visitEachChild(node, visitor, context);
  }
  function visitExportAssignment(node) {
    if (isNamedEvaluation(node, isAnonymousClassNeedingAssignedName)) {
      node = transformNamedEvaluation(
        context,
        node,
        /*ignoreEmptyStringLiteral*/
        true,
        node.isExportEquals ? "" : "default"
      );
    }
    return visitEachChild(node, visitor, context);
  }
  function injectPendingExpressions(expression) {
    if (some(pendingExpressions)) {
      if (isParenthesizedExpression(expression)) {
        pendingExpressions.push(expression.expression);
        expression = factory2.updateParenthesizedExpression(expression, factory2.inlineExpressions(pendingExpressions));
 ��          ��           ��          0��          @��          P��          `��          p��          ���        	  ���        
  ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���            ��        !  ��        "   ��        #  0��        $  @��        %  P��        &  `��        '  p��        (  ���        )  ���        *  ���        +  ���        ,  ���        -  ���        .  ���        /  ���        0   ��        1  ��        2   ��        3  0��        4  @��        5  P��        6  `��        7  p��        8  ���        9  ���        :  ���        ;  ���        <  ���        =  ���        >  ���        ?  ���        @   ��        A   ��    �   B GAGG;AACH,qBAAa,4BAA6B,SAAQ,UAAU;IACxD,MAAM,CAAC,SAAS,SAA+B;CAClD;AAED;;;GAGG;AACH,qBAAa,yBAA0B,SAAQ,UAAU;IACrD,MAAM,CAAC,SAAS,SAA4B;CAC/C;AAED;;;GAGG;AACH,qBAAa,iBAAkB,SAAQ,UAAU;IAC7C,MAAM,CAAC,SAAS,SAAmB;CACtC;AAED;;;GAGG;  if (!info.isValid) {
      return node;
    }
    const functionName = getHoistedFunctionName(node);
    if (functionName) {
      getPendingExpressions().push(
        factory2.createAssignment(
          functionName,
          factory2.createFunctionExpression(
            filter(node.modifiers, (m) => isModifier(m) && !isStaticModifier(m) && !isAccessorModifier(m)),
            node.asteriskToken,
            functionName,
            /*typeParameters*/
            void 0,
            visitParameterList(node.parameters, visitor, context),
            /*type*/
            void 0,
            visitFunctionBody(node.body, visitor, context)
          )
        )
      );
    }
    return void 0;
  }
  function setCurrentClassElementAnd(classElement, visito        �      ��  .�    w             ..     �d             .editorconfig     wf             .nycrc�     -            2015�    -            2016�    %-            2017�    6-            2018�    I-    	        2019�    _-    
        2020�    v-            2021�    �-            2022�    �-            2023�    �-            2024�    �-            2025�    �-            5     yV            CHANGELOG.md     y8           	 es2015.js     ~8           	 es2016.js     �8           	 es2017.js     �8           	 es2018.js     �8           	 es2019.js     �8           	 es2020.js     �8           	 es2021.js     �8           	 es2022.js     �8           	 es2023.js     �8           	 es2024.js     �8           	 es2025.js     �8            es5.js     �8            es6.js     �8            es7.js     �V             eslint.config.mjs     �9    !        GetIntrinsic.js�    �0    "        helpers     �<    #        index.js     �    $        LICENSE�    �    %       
 operations     uV    &        package.json     ~V    '       	 README.mdsetterName = name;
    if (isComputedPropertyName(name) && !isSimpleInlineableExpression(name.expression)) {
      const cacheAssignment = findComputedPropertyNameCacheAssignment(name);
      if (cacheAssignment) {
        getterName = factory2.updateComputedPropertyName(name, visitNode(name.expression, visitor, isExpression));
        setterName = factory2.updateComputedPropertyName(name, cacheAssignment.left);
      } else {
        const temp = factory2.createTempVariable(hoistVariableDeclaration);
        setSourceMapRange(temp, name.expression);
        const expression = visitNode(name.expression, visitor, isExpression);
        const assignment = factory2.createAssignment(temp, expression);
        setSourceMapRange(assignment, name.expression);
        getterName = factory2.updateComputedPropertyName(name, assig�     �      �    "t    �A                                               d�j    ,v39    ּj    �˻)    ּj    �˻)                                     ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��           ��        !   ��        "  0��        #  @��        $  P��        %  `��        &  p��        '  ���        (  ���        )  ���        *  ���        +  ���        ,  ���        -  ���        .  ���        /   ��        0  ��        1   ��        2  0��        3  @��        4  P��        5  `��        6  p��        7  ���        8  ���        9  ���        :  ���        ;  ���        <  ���        =  ���        >  ���        ?   ��        @  ��        A  ��    �   B uest if you wish to read its body before bypassing it.',
    request.method,
    request.url,
  )

  const requestClone = request.clone()

  /**
   * Send the internal request header that would instruct MSW
   * to perform this request as-is, ignoring any .expression : parent2;
    if (isObjectLiteralExpression(expression)) {
      const targetType = isSatisfiesExpression(parent2) ? checker.getTypeFromTypeNode(parent2.type) : checker.getContextualType(expression) || checker.getTypeAtLocation(expression);
      const properties = arrayFrom(checker.getUnmatchedProperties(
        checker.getTypeAtLocation(parent2),
        targetType.getNonNullableType(),
        /*requireOptionalProperties*/
        false,
        /*matchDiscriminantProperties*/
        false
      ));
      if (!length(properties)) return void 0;
      return { kind: 3 /* ObjectLiteral */, token: parent2, identifier: void 0, properties, parentDeclaration: expression, indentation: isReturnStatement(expression.pa        �      ��  .�    l�            ..     m�            image-response.js     ղ            image-response.js.mapequests).
   */
  requestClone.headers.append('accept', 'msw/passthrough')

  return requestClone
}
er)) {
    const targetType = (_a = checker.getContextualType(token) || checker.getTypeAtLocation(token)) == null ? void 0 : _a.getNonNullableType();
    const properties = arrayFrom(checker.getUnmatchedProperties(
      checker.getTypeAtLocation(parent2.initializer),
      targetType,
      /*requireOptionalProperties*/
      false,
      /*matchDiscriminantProperties*/
      false
    ));
    if (!length(properties)) return void 0;
    return { kind: 3 /* ObjectLiteral */, token, identifier: token.text, properties, parentDeclaration: parent2.initializer };
  }
  if (isIdentifier(token) && isJsxOpeningLikeElement(token.parent)) {
    const target = getEmitScriptTarget(program.getCompilerOptions());
    const attributes = getUnmatchedAttributes(checker, target, token.parent);
    if (!length(attributes)) return void 0;
    ode.initializer || useDefineForClassFields
      );
      if (expr) {
        getPendingExpressions().push(...flattenCommaList(expr));
      }
      if (isStatic(node) && !shouldTransformPrivateElementsOrClassStaticBlocks) {
        const initializerStatement = transformPropertyOrClassStaticBlock(node, factory2.createThis());
        if (initializerStatement) {
          const staticBlock = factory2.createClassStaticBlockDeclaration(
            factory2.createBlock([initializerStatement])
          );
          setOriginalNode(staticBlock, node);
          setCommentRange(staticBlock, node);
          setCommentRange(initializerStatement, { pos: -1, end: -1 });
          setSyntheticLeadingComments(initializerStatement, void 0);
          setSyntheticTrailingComments(initializerStatement, void 0);
          return staticBlock;
        }
      }
      return void 0;
    }
    return factory2.updatePropertyDeclaration(
      node,
      visitNodes2(node.modifiers (��          0��          @��          P��          `��          p��          ���          ���          ���        	  ���        
  ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��            ��        !  0��        "  @��        #  P��        $  `��        %  p��        &  ���        '  ���        (  ���        )  ���        *  ���        +  ���        ,  ���        -  ���        .   ��        /  ��        0   ��        1  0��        2  @��        3  P��        4  `��        5  p��        6  ���        7  ���        8  ���        9  ���        :  ���        ;  ���        <  ���        =  ���        >   ��        ?  ��        @   ��        A   ��    �   B arent2.parent)) {
    const moduleDeclaration = find(symbol.declarations, isModuleDeclaration);
    const moduleDeclarationSourceFile = moduleDeclaration == null ? void 0 : moduleDeclaration.getSourceFile();
    if (moduleDeclaration && moduleDeclarationSourceFile && !isSourceFileFromLibrary(program, moduleDeclarationSourceFile)) {
      return { kind: 2 /* Function */, token, call: parent2.parent, sourceFile: moduleDeclarationSourceFile, modifierFlags: 32 /* Export */, parentDeclaration: moduleDeclaration };
    }
    const moduleSourceFile = find(symbol.declarations, isSourceFile);
    if (sourceFile.commonJsModuleIndicator) return void 0;
    if (moduleSourceFile && !isSourceFileFromLibrary(program, moduleSourceFile)) {
      return { kind: 2 /* Function */, token, call: parent2.parent, sourceFile: moduleSourceFile, modifierFlags: 32 /* Export */, parentDeclaration: moduleSourceFile };
    }
  }
  const classDeclaration = find(symbol.declarations, isClassLike);
  if (!classD   x     �         .�    ~            ..     f           
 core-js.js     �            get-own-property-symbols.js            add-path-prefix.js     Ů            add-path-prefix.js.map     ��            add-path-suffix.js     Ǯ            add-path-suffix.js.map     D�    	        app-paths.js     �    
        app-paths.js.map     ��            as-path-to-search-params.js     R�            as-path-to-search-params.js.map     ?�            cache-busting-search-param.js     �           ! cache-busting-search-param.js.map     ��            compare-states.js     ,�            compare-states.js.map     �            disable-smooth-scroll.js     �            disable-smooth-scroll.js.map     ��            escape-path-delimiters.js     \�            escape-path-delimiters.js.map     "�            format-next-pathname-info.js     ��             format-next-pathname-info.js.map     &�            format-url.js     ı            format-url.js.map     C�            get-asset-path-from-route.js     ܱ             get-asset-path-from-route.js.map     ]�            get-dynamic-param.js     �            get-dynamic-param.js.map     ~�            get-next-pathname-info.js     �            get-next-pathname-info.js.map     ��            get-route-from-asset-path.js     /�              get-route-from-asset-path.js.map     ��    !        get-segment-param.js     9�    "        get-segment-param.js.map     =�    #        html-bots.js     ��    $        html-bots.js.map     s�    %        index.js     :�    &        index.js.map     ��    '       & interception-prefix-from-param-type.js     m�    (       * interception-prefix-from-param-type.js.map     ��    )        interception-routes.js     o�    *        interception-routes.js.map     Ҧ    +        interpolate-as.js     }�    ,        interpolate-as.js.map     ߦ    -          y  �      �    #     �A                                               ��j    ���    ��j    �N�-    ��j    �N�-                                     ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��           0��        !  @��        "  P��        #  `��        $  p��        %  ���        &  ���        '  ���        (  ���        )  ���        *  ���        +  ���        ,  ���        -   ��        .  ��        /   ��        0  0��        1  @��        2  P��        3  `��        4  p��        5  ���        6  ���        7  ���        8  ���        9  ���        :  ���        ;  ���        <  ���        =   ��        >  ��        ?   ��        @  0��        A  0��    �   B .js.map     ƪ    G        relativize-url.js     V�    H        relativize-url.js.map     Ϊ    I        remove-path-prefix.js     ^�    J        remove-path-prefix.js.map     Ъ    K        remove-trailing-slash.js     `�    L        remove-trailing-slash.js.map     �    M        resolve-param-value.js     ��    N        resolve-param-value.js.map     �    O        resolve-rewrites.js     ��    P        resolve-rewrites.js.map     I�    Q        route-match-utils.js     Ͷ    R        route-match-utils.js.map     R�    S        route-matcher.js     ֶ    T        route-matcher.js.map     ]�    U        route-regex.js     �    V        route-regex.js.map     C�    W        sortable-routes.js     ~�    X        sortable-routes.js.map     E�    Y        sorted-routes.js     ��    Z        sorted-routes.js.mapyName), createUndefined()));
}
function createActionsForAddMissingMemberInTypeScriptFile(co   n          soul .�    �            ..     ��            apply-extends.js     A�            is-promise.js     q�            levenshtein.js     ��            maybe-async-result.js     V�            obj-filter.js     ��            process-argv.js     ׆    	        set-blocking.js     Շ    
        which-module.js=> addPropertyDeclaration(t, declSourceFile, parentDeclaration, memberName, typeNode, modifierFlags2));
  const actions2 = [createCodeFixAction(fixMissingMember, addPropertyDeclarationChanges(modifierFlags & 256 /* Static */), [isStatic2 ? Diagnostics.Declare_static_property_0 : Diagnostics.Declare_property_0, memberName], fixMissingMember, Diagnostics.Add_all_missing_members)];
  if (isStatic2 || isPrivateIdentifier(token)) {
    return actions2;
  }
  if (modifierFlags & 2 /* Private */) {
    actions2.unshift(createCodeFixActionWithoutFixAll(fixMissingMember, addPropertyDeclarationChanges(2 /* Private */), [Diagnostics.Declare_private_property_0, memberName]));
  }
  actions2.push(createAddIndexSignatureAction(context, declSourceFile, parentDeclaration, token.text, typeNode));
  return actions2;
}
function getTypeNode2(checker, node, token) {
  let typeNode;
  if (token.parent.parent.kind === 226 /* BinaryExpression */) {
    const binaryExpression = token.parent.parent;
    const otherExpression = token.parent === binaryExpression.left ? binaryExpression.right : binaryExpression.left;
    const widenedType = checker.getWidenedType(checker.getBaseTypeOfLiteralType(checker.getTypeAtLocation(otherExpression)));
    typeNode = checker.typeToTypeNode(widenedType, node, 1 /* NoTruncation */, 8 /* AllowUnresolvedNames */);
  } else {
    const contextualType = checker.getContextualType(token.parent);
    typeNode = contextualType ? checker.typeToTypeNode(
      contextualType,
      /*enclosingDeclaration*/
      void 0,
      1 /* NoTruncation */,
      8 /* AllowUnresolvedNames */
    ) : void 0;
  }
  return typeNode || factory.createKeywordTypeNode(133 / H��          P��          `��          p��          ���          ���          ���          ���          ���        	  ���        
  ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��           @��        !  P��        "  `��        #  p��        $  ���        %  ���        &  ���        '  ���        (  ���        )  ���        *  ���        +  ���        ,   ��        -  ��        .   ��        /  0��        0  @��        1  P��        2  `��        3  p��        4  ���        5  ���        6  ���        7  ���        8  ���        9  ���        :  ���        ;  ���        <   ��        =  ��        >   ��        ?  0��        @  @��        A  @��    �   B enName, typeNode) {
  const stringTypeNode = factory.createKeywordTypeNode(154 /* StringKeyword */);
  const indexingParameter = factory.createParameterDeclaration(
    /*modifiers*/
    void 0,
    /*dotDotDotToken*/
    void 0,
    "x",
    /*questionToken*/
    void 0,
    stringTypeNode,
    /*initializer*/
    void 0
  );
  const indexSignature = factory.createIndexSignature(
    /*modifiers*/
    void 0,
    [indexingParameter],
    typeNode
  );
  const changes = ts_textChanges_exports.ChangeTracker.with(context, (t) => t.insertMemberAtStart(sourceFile, node, indexSignature));
  return createCodeFixActionWithoutFixAll(fixMissingMember, changes, [Diagnostics.Add_index_signature_for_property_0, tokenName]);
}
function getActionsForMissingMethodDeclaration(context, info) {
  const { parentDeclaration, declSourceFile, modifierFlags, token, call } = info;
  if (call === void 0) {
    return void 0;
  }
  const methodName = token.text;
  const addMethodDeclarationChanges = (mo   x             ��  .�    d�            ..     e�            index.js     /�            index.js.map     ��            intercept-console-error.js     k�            intercept-console-error.js.map     �            replay-ssr-only-errors.js     p�            replay-ssr-only-errors.js.map     y�    	        stitched-error.js     ��    
        stitched-error.js.map     X�            use-error-handler.js     L�            use-error-handler.js.map */) {
    actions2.unshift(createCodeFixActionWithoutFixAll(fixMissingMember, addMethodDeclarationChanges(2 /* Private */), [Diagnostics.Declare_private_method_0, methodName]));
  }
  return actions2;
}
function addMethodDeclaration(context, changes, callExpression, name, modifierFlags, parentDeclaration, sourceFile) {
  const importAdder = createImportAdder(sourceFile, context.program, context.preferences, context.host);
  const kind = isClassLike(parentDeclaration) ? 174 /* MethodDeclaration */ : 173 /* MethodSignature */;
  const signatureDeclaration = createSignatureDeclarationFromCallExpression(kind, context, importAdder, callExpression, name, modifierFlags, parentDeclaration);
  const containingMethodDeclaration = tryGetContainingMethodDeclaration(parentDeclaration, callExpression);
  if (containingMethodDeclaration) {
    changes.insertNodeAfter(sourceFile, containingMethodDeclaration, signatureDeclaration);
  } else {
    changes.insertMemberAtStart(sourceFile, parentDeclaration, signatureDeclaration);
  }
  importAdder.writeFixes(changes);
}
function addEnumMemberDeclaration(changes, checker, { token, parentDeclaration }) {
  const hasStringInitializer = some(parentDeclaration.members, (member) => {
    const type = checker.getTypeAtLocation(member);
    return !!(type && type.flags & 402653316 /* StringLike */);
  });
  const sourceFile = parentDeclaration.getSourceFile();
  const enumMember = factory.createEnumMember(token, hasStringInitializer ? factory.createStringLiteral(token.text) : void 0);
  const las   o   �    "    0        ���          ���          ���          ���          ���          ���          ���        	   ��        
  ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��           p��        !  ���        "  ���        #  ���        $  ���        %  ���        &  ���        '  ���        (  ���        )   ��        *  ��        +   ��        ,  0��        -  @��        .  P��        /  `��        0  p��        1  ���        2  ���        3  ���        4  ���        5  ���        6  ���        7  ���        8  ���        9   ��        :  ��        ;   ��        <  0��        =  @��        >  P��        ?  `��        @  p��        A  p��    �   B ssionId;
        console.log('Transport created with session ID:', sessionId);
        console.log('Connected to MCP server');
    }
    catch (error) {
        console.error('Failed to connect:', error);
        client = null;
        transport = null;
    }
}
async function disconnect() {
    if (!client || !transport) {
        console.log('Not connected.');
        return;
    }
    try {
        await transport.close();
        console.log('Disconnected from MCP server');
        client = null;
        transport = null;
    }
    catch (error) {
        console.error('Error disconnecting:', error);
    }
}
async function terminateSession() {
    if (!client || !transport) {
        console.log('Not connected.');
        return;
    }
    try {
        console.log('Terminating session with ID:', transport.sessionId);
        await transport.terminateSession();
        console.log('Session terminated successfully');
        // Check if sessionId was cleared after termination   n          AGORA.�    <1            ..     �}           
 index.d.ts     8w            index.js     �z           	 index.mjs     g~            LICENSE-MIT.txt     �x            package.json     �y           	 README.mdon.js.map     ��   
 	       
 quote.d.ts     ��    
        quote.js     ��            quote.js.map     ��   
         re2.d.ts     ��            re2.js     ��           
 re2.js.map     �            timestamp.d.ts     o�            timestamp.js     ��            timestamp.js.map     E�            ucs2length.d.ts     ��            ucs2length.js     �            ucs2length.js.map     v�   	         uri.d.ts     ��            uri.js     3�           
 uri.js.map     ��            validation_error.d.ts     ��            validation_error.js     K�            validation_error.js.map const { data: users } = await adminClient
      .from('users')
      .select('id, name, username, avatar_url, user_type, bio, capabilities, is_verified')
      .eq('is_active', true)
      .or(`name.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%`)
      .limit(10)

    results.users = users || []
    results.total += (users?.length || 0)
  }

  // Search posts (tsvector full-text search)
  if (type === 'all' || type === 'posts') {
    const { data: posts } = await adminClient
      .from('posts')
      .select(`
        id, content, like_count, reply_count, hot_score, created_at,
        author:users!posts_author_id_fkey(id, name, username, user_type, avatar_url, is_verified)
      `)
      .eq('visibility', 'public')
      .textSearch('search_vector', searchTerm, { type: 'websearch', config: 'simple' })
      .limit(10)

    results.posts = posts || []
    results.total += (posts?.length || 0)
  }

  // Search demands (tsvector full-text search)
  if (type === 'all' || type === 'demands') {
    const { data: demands } = await adminClient
      .from('demands')
      .select(`
        id, title, d   o   �    �    �        ���          ���          ���          ���          ���          ���           ��        	  ��        
   ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��           ���        !  ���        "  ���        #  ���        $  ���        %  ���        &  ���        '  ���        (   ��        )  ��        *   ��        +  0��        ,  @��        -  P��        .  `��        /  p��        0  ���        1  ���        2  ���        3  ���        4  ���        5  ���        6  ���        7  ���        8   ��        9  ��        :   ��        ;  0��        <  @��        =  P��        >  `��        ?  p��        @  ���        A  ���    �   B e if (item.type === 'audio') {
                console.log(`  [Audio: ${item.mimeType}]`);
            }
            else {
                console.log(`  [Unknown content type]:`, item);
            }
        });
        // Offer to read resource links
        if (resourceLinks.length > 0) {
            console.log(`\nFound ${resourceLinks.length} resource link(s). Use 'read-resource <uri>' to read their content.`);
        }
    }
    catch (error) {
        console.log(`Error calling tool ${name}: ${error}`);
    }
}
async function callGreetTool(name) {
    await callTool('greet', { name });
}
async function callMultiGreetTool(name) {
    console.log('Calling multi-greet tool with notifications...');
    await callTool('multi-greet', { name });
}
async function callCollectInfoTool(infoType) {
    console.log(`Testing form elicitation with collect-user-info tool (${infoType})...`);
    await callTool('collect-user-info', { infoType });
}
async function callCollectInfoWithTask     	   �?      �� -bind-atoms��    �	    irectional task support with collect-user-info-task tool (${infoType})...`);
    console.log('This will create a task on the server, which will elicit input and create a task on the client.\n');
    await callToolTask('collect-user-info-task', { infoType });
}
async function startNotifications(interval, count) {
    console.log(`Starting notification stream: interval=${interval}ms, count=${count || 'unlimited'}`);
    await callTool('start-notification-stream', { interval, count });
}
async function runNotificationsToolWithResumability(interval, count) {
    if (!client) {
        console.log('Not connected to server.');
        return;
    }
    try {
        console.log(`Starting notification stream with resumability: interval=${interval}ms, count=${count || 'unlimited'}`);
        console.log(`Using resumption token: ${notificationsToolLastEventId || 'none'}`);
        const request = {
            method: 'tools/call',
            params: {
                name: 'start-notification-stream',
                arguments: { interval, count }
            }
        };
        const onLastEventIdUpdate = (event) => {
            notificationsToolLastEventId = event;
            console.log(`Updated resumption token: ${event}`);
        };
        const result = await client.request(request, types_js_1.CallToolResultSchema, {
            resumptionToken: notificationsToolLastEventId,
            onresumptiontoken: onLastEventIdUpdate
        });
        console.log('Tool result:');
        result.content.forEach(item => {
            if (item.type === 'text') {
                console.log(`  ${item.text}`);
            }
            else {
                console.log(`  ${item.type} content:`, item);
            }
        });
    }
    catch (error) {
        console.log(`Error starting notification stream: ${error}`);
    }
}
async function listPrompts() {
    if (!client) {
        console.log('Not connected to server.');
        return;
    }
    try {
        const p ���          ���          ���          ���          ���          ���          ���           ��          ��        	   ��        
  0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���           ���        !  ���        "  ���        #  ���        $  ���        %  ���        &  ���        '   ��        (  ��        )   ��        *  0��        +  @��        ,  P��        -  `��        .  p��        /  ���        0  ���        1  ���        2  ���        3  ���        4  ���        5  ���        6  ���        7   ��        8  ��        9   ��        :  0��        ;  @��        <  P��        =  `��        >  p��        ?  ���        @  ���        A  ���    �   B omptRequest, types_js_1.GetPromptResultSchema);
        console.log('Prompt template:');
        promptResult.messages.forEach((msg, index) => {
            console.log(`  [${index + 1}] ${msg.role}: ${msg.content.type === 'text' ? msg.content.text : JSON.stringify(msg.content)}`);
        });
    }
    catch (error) {
        console.log(`Error getting prompt ${name}: ${error}`);
    }
}
async function listResources() {
    if (!client) {
        console.log('Not connected to server.');
        return;
    }
    try {
        const resourcesRequest = {
            method: 'resources/list',
            params: {}
        };
        const resourcesResult = await client.request(resourcesRequest, types_js_1.ListResourcesResultSchema);
        console.log('Available resources:');
        if (resourcesResult.resources.length === 0) {
            console.log('  No resources available');
        }
        else {
            for (const resource of resourcesResult.resources) {
            x            ��  .�                 ..     f!            
 index.d.ts     J             index.js     z             index.js.map     
!            	 index.mjs     N              index.mjs.map                  LICENSE     I     	        package.json     �      
       	 README.md        console.log('Not connected to server.');
        return;
    }
    try {
        const request = {
            method: 'resources/read',
            params: { uri }
        };
        console.log(`Reading resource: ${uri}`);
        const result = await client.request(request, types_js_1.ReadResourceResultSchema);
        console.log('Resource contents:');
        for (const content of result.contents) {
            console.log(`  URI: ${content.uri}`);
            if (content.mimeType) {
                console.log(`  Type: ${content.mimeType}`);
            }
            if ('text' in content && typeof content.text === 'string') {
                console.log('  Content:');
                console.log('  ---');
                console.log(content.text
                    .split('\n')
                    .map((line) => '  ' + line)
                    .join('\n'));
                console.log('  ---');
            }
            else if ('blob' in content && typeof content.blob === 'string') {
                console.log(`  [Binary data: ${content.blob.length} bytes]`);
            }
        }
    }
    catch (error) {
        console.log(`Error reading resource ${uri}: ${error}`);
    }
}
async function callToolTask(name, args) {
    if (!client) {
        console.log('Not connected to server.');
        return;
    }
    console.log(`Calling tool '${name}' with task-based execution...`);
    console.log('Arguments:', args);
    // Use task-based execution - call now, fetch later
    // Using the expntity)
     */
    readonly isIdentity: boolean;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMMatrixReadOnly#instance_properties) */
    readonly m11: number;
    /**    y         ���          ���          ���          ���          ���           ��          ��           ��        	  0��        
  @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���           ���        !  ���        "  ���        #  ���        $  ���        %  ���        &   ��        '  ��        (   ��        )  0��        *  @��        +  P��        ,  `��        -  p��        .  ���        /  ���        0  ���        1  ���        2  ���        3  ���        4  ���        5  ���        6   ��        7  ��        8   ��        9  0��        :  @��        ;  P��        <  `��        =  p��        >  ���        ?  ���        @  ���        A  ���    �   B  popular | new | rating | cheap
  const tag = searchParams.get('tag') || null
  const q = searchParams.get('q') || null

  const { user } = await getAuthUser(req)
  const adminClient = createAdminClient()
  const offset = (page - 1) * POSTS_PER_PAGE

  let query = adminClient
    .from('users')
    .select('*', { count: 'exact' })
    .eq('user_type', 'ai')
    .eq('is_active', true)

  // Filter eadonly m34: number;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMMatrixReadOnly#instance_properties) */
    readonly m41: number;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMMatrixReadOnly#instance_properties) */
    readonly m42: number;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMMatrixReadOnly#instance_properties) */
    readonly m43: number;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMMatrixReadOnly#instance_properties) */
    readonly m44: number;
    /**
     * The **`flipX()`*       �?      �� f (tag) {
    query = query.contains('capabilities', [tag])
  }

  // Search by name, username, capability_description, bio
  if (q) {
    // Sanitize: only allow alphanumeric, Chinese chars, spaces, hyphens, underscores
    const safe = q.replace(/[^a-zA-Z0-9\u4e00-\u9fff\s\-\_]/g, '')
    if (safe) {
      query = query.or(`name.ilike.%${safe}%,username.ilike.%${safe}%,capability_description.ilike.%${safe}%,bio.ilike.%${safe}%`)
    }
  }

  // Sorting
  switch (sort) {
    case 'new':
      query = query.order('created_at', { ascending: false })
      break
    case 'rating':
      query = query.order('avg_rating', { ascending: false })
      break
    case 'cheap':
      query = query.order('price_per_call', { ascending: true })
      break
    default: // popular
      query = query.order('invocation_count', { ascending: false })
  }

  query = query.range(offset, offset + POSTS_PER_PAGE - 1)

  const { data: agents, error, count } = await query

  if (error) {
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch agents', 500)
  }

  const transformedAgents: Agent[] = (agents || []).map(normalizeAgent)

  // Get following status if user is logged in
  if (user && transformedAgents.length > 0) {
    const agentIds = transformedAgents.map((a) => a.id)
    const { data: follows } = await adminClient
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
      .in('following_id', agentIds)

    const followingSet = new Set((follows || []).map((f: any) => f.following_id))
    transformedAgents.forEach((agent) => {
      agent.following = followingSet.has(agent.id)
    })
  }

  const result: PaginatedResponse<Agent> = {
    success: true,
    data: transformedAgents,
    count: count || 0,
    page,
    pageSize: POSTS_PER_PAGE,
    hasMore: (count || 0) > offset + POSTS_PER_PAGE,
  }

  return Response.json(result)
}

    /**
     * The `rotateFromVector()` method of the DOMMatrixReadOnly interface is returns a new DOMMatrix created by rotating the so ���          ���          ���          ���          ���           ��          ��           ��          0��        	  @��        
  P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���           ���        !  ���        "  ���        #  ���        $  ���        %   ��        &  ��        '   ��        (  0��        )  @��        *  P��        +  `��        ,  p��        -  ���        .  ���        /  ���        0  ���        1  ���        2  ���        3  ���        4  ���        5   ��        6  ��        7   ��        8  0��        9  @��        :  P��        ;  `��        <  p��        =  ���        >  ���        ?  ���        @  ���        A  ���    �   B X()` method of the DOMMatrixReadOnly interface returns a new DOMMatrix created by applying the specified skew transformation to the source matrix along its x-axis.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMMatrixReadOnly/skewX)
     */
    skewX(sx?: number): DOMMatrix;
    /**
     * The `skewY()` method of the DOMMatrixReadOnly interface returns a new DOMMatrix created by applying the specified skew transformation to the source matrix along its y-axis.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMMatrixReadOnly/skewY)
     */
    skewY(sy?: number): DOMMatrix;
    /**
     * The **`toFloat32Array()`** method of the DOMMatrixReadOnly interface returns a new Float32Array containing all 16 elements (`m11`, `m12`, `m13`, `m14`, `m21`, `m22`, `m23`, `m24`, `m31`, `m32`, `m33`, `m34`, `m41`, `m42`, `m43`, `m44`) which comprise the matrix.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMMatr        �      fdirrs��                  ..     �s           & 3acb6e93340691c793926e54e9b1288fee171d     �s           & 9577bd0109f760ecba8906fb74c57fb2a8f15c	 README.md,             example     �5             index.js     �,     	        LICENSE     O:     
        package-support.json     x:             package.json     �:             readme.markdown�    |-             test     �8             test-core-js.js     �9             util.inspect.jsloat64Array<ArrayBuffer>;
    /**
     * The **`toJSON()`** method of the DOMMatrixReadOnly interface creates and returns a JSON object.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMMatrixReadOnly/toJSON)
     */
    toJSON(): any;
    /**
     * The **`transformPoint`** method of the You can also create a new `DOMPoint` by applying a matrix to a point with the DOMPointReadOnly.matrixTransform() method.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMMatrixReadOnly/transformPoint)
     */
    transformPoint(point?: DOMPointInit): DOMPoint;
    /**
     * The `translate()` method of the DOMMatrixReadOnly interface creates a new matrix being the result of the original matrix with a translation applied.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMMatrixReadOnly/translate)
     */
    translate(tx?: number, ty?: number, tz?: number): DOMMatrix;
    toString(): string;
}

declare var DOMMatrixReadOnly: {
    prototype: DOMMatrixReadOnly;
    new(init?: string | number[]): DOMMatrixReadOnly;
    fromFloat32Array(array32: Float32Array<ArrayBuffer>): DOMMatrixReadOnly;
    fromFloat64Array(array64: Float64Array<ArrayBuffer>): DOMMatrixReadOnly;
    fromMatrix(other?: DOMMatrixInit): DOMMatrixReadOnly;
};

/**
 * The **`DOMParser`** interface provides the ability to parse XML or HTML source code from a string into a DOM Document.
 *
 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMParser)
 */
interface DOMParser {
    /**
    �     �      �    �     �A                                               ��j    ���    ߔj    P>	    ߔj    P>	                                     `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���           ���        !  ���        "  ���        #  ���        $   ��        %  ��        &   ��        '  0��        (  @��        )  P��        *  `��        +  p��        ,  ���        -  ���        .  ���        /  ���        0  ���        1  ���        2  ���        3  ���        4   ��        5  ��        6   ��        7  0��        8  @��        9  P��        :  `��        ;  p��        <  ���        =  ���        >  ���        ?  ���        @  ���        A  ���    �   B "sourceRoot","parserOpts","assertObject","generatorOpts","Object","assign","getModuleId","moduleRoot","moduleIds","moduleId","knownAssumptions","assumptionsNames","exports","Set","getSource","loc","type","source","parent","validate","opts","validateNested","error","configError","ConfigError","message","assertNoDuplicateSourcemap","keys","forEach","key","optLoc","name","Error","msg","validator","throwUnknownError","removed","version","unknownOptErr","hasOwnProperty","call","value","obj","access","envLoc","arr","assertArray","index","item","entries","objLoc","overridesLoc","checkNoUnwrappedItemOptionPairs","items","e","lastItem","thisItem","file","options","undefined","request","JSON","stringify"],"sources":["../../../src/config/validation/options.ts"],"sourcesContent":["import type { InputTargets, Targets } from \"@babel/helper-compilation-targets\";\n\nimport type { ConfigItem } from \"../item.ts\";\n\nimport removed from \"./removed.ts\";\nimport {\n  msg,\n  access,\n  assert$   n     
     database.types.ts         ..     �           
 index.d.ts     �            index.jsimport type { Agent, AgentEvaluation } from '@/types/api'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params
  const { searchParams } = new URL(req.url)

  const adminClient = createAdminClient()

  // Fetch agent details
  const { data: agentRaw, error: agentError } = await adminClient
    .from('users')
    .select('*')
    .eq('user_type', 'ai')
    .eq('username', username)
    .eq('is_active', true)
    .single()

  if (agentError || !agentRaw) {
    return errorResponse('NOT_FOUND', 'Agent not found', 404)
  }

  const agent: Agent = {
    id: agentRaw.id,
    name: agentRaw.name,
    username: agentRaw.username,
    avatar_url: agentRaw.avatar_url ?? null,
    bio: agentRaw.bio ?? null,
    capability_description: agentRaw.capability_description ?? null,
    capabilities: agentRaw.capabilities ?? [],
    price_per_call: agentRaw.price_per_call ?? 5,
    free_trial_remaining: agentRaw.free_trial_remaining ?? 3,
    avg_rating: agentRaw.avg_rating ?? 0,
    review_count: agentRaw.review_count ?? 0,
    invocation_count: agentRaw.invocation_count ?? 0,
    is_verified: agentRaw.is_verified ?? false,
    created_at: agentRaw.created_at,
  }

  // Fetch recent evaluations
  const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('eval_limit') || '10', 10)))

  const { data: evaluations = [], error: evalError } = await adminClient
    .from('agent_evaluations')
    .select(`
      id,
      user_id,
      invocation_id,
      score,
      h](https://developer.mozilla.org/docs/Web/API/DOMPointReadOnly/matrixTransform)
     */
    matrixTransform(matrix?: DOMMatrixInit): DOMPoint;
    /**
     * The DOMPointReadOnly method `toJSON()` returns an object giving the ```js-nolint toJSON() ``` None.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMPointReadOnly/toJSON)
     */
    t ���          ���          ���           ��          ��           ��          0��          @��          P��        	  `��        
  p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���           ���        !  ���        "  ���        #   ��        $  ��        %   ��        &  0��        '  @��        (  P��        )  `��        *  p��        +  ���        ,  ���        -  ���        .  ���        /  ���        0  ���        1  ���        2  ���        3   ��        4  ��        5   ��        6  0��        7  @��        8  P��        9  `��        :  p��        ;  ���        <  ���        =  ���        >  ���        ?  ���        @  ���        A  ���    �   B     avatar_url: reviewerObj.avatar_url ?? null,
      } : undefined,
    }
  })

  return successResponse({
    agent,
    evaluations: transformedEvaluations,
  })
}
s: assertBabelrcSearch as Validator<InputOptions[\"babelrcRoots\"]>,\n};\n\nconst NONPRESET_VALIDATORS: ValidatorSet = {\n  extends: assertString as Validator<InputOptions[\"extends\"]>,\n  ignore: assertIgnoreList as Validator<InputOptions[\"ignore\"]>,\n  only: assertIgnoreList as Validator<InputOptions[\"only\"]>,\n\n  targets: assertTargets as Validator<InputOptions[\"targets\"]>,\n  browserslistConfigFile: assertConfigFileSearch as Validator<\n    InputOptions[\"browserslistConfigFile\"]\n  >,\n  browserslistEnv: assertString as Validator<InputOptions[\"browserslistEnv\"]>,\n};\n\nconst COMMON_VALIDATORS: ValidatorSet = {\n  // TODO: Should 'inputSourceMap' be moved to be a root-only option?\n  // We may want a boolean-only version to be a common option, with the\n  // object only allowed as a root config arg   n          hermes      ���    �     ���    �      InputOptions[\"inputSourceMap\"]\n  >,\n  presets: assertPluginList as Validator<InputOptions[\"presets\"]>,\n  plugins: assertPluginList as Validator<InputOptions[\"plugins\"]>,\n  passPerPreset: assertBoolean as Validator<InputOptions[\"passPerPreset\"]>,\n  assumptions: assertAssumptions as Validator<InputOptions[\"assumptions\"]>,\n\n  env: assertEnvSet as Validator<InputOptions[\"env\"]>,\n  overrides: assertOverridesList as Validator<InputOptions[\"overrides\"]>,\n\n  // We could limit these to 'overrides' blocks, but it's not clear why we'd\n  // bother, when the ability to limit a config to a specific set of files\n  // is a fairly general useful feature.\n  test: assertConfigApplicableTest as Validator<InputOptions[\"test\"]>,\n  include: assertConfigApplicableTest as Validator<InputOptions[\"include\"]>,\n  exclude: assertConfigApplicableTest as Validator<InputOptions[\"exclude\"]>,\n\n  retainLines: assertBoolean as Validator<InputOptions[\"retainLines\"]>,\n  comments: assertBoolean as Validator<InputOptions[\"comments\"]>,\n  shouldPrintComment: assertFunction as Validator<\n    InputOptions[\"shouldPrintComment\"]\n  >,\n  compact: assertCompact as Validator<InputOptions[\"compact\"]>,\n  minified: assertBoolean as Validator<InputOptions[\"minified\"]>,\n  auxiliaryCommentBefore: assertString as Validator<\n    InputOptions[\"auxiliaryCommentBefore\"]\n  >,\n  auxiliaryCommentAfter: assertString as Validator<\n    InputOptions[\"auxiliaryCommentAfter\"]\n  >,\n  sourceType: assertSourceType as Validator<InputOptions[\"sourceType\"]>,\n  wrapPluginVisitorMethod: assertFunction as Validator<\n    InputOptions[\"wrapPluginVisitorMethod\"]\n  >,\n  highlightCode: assertBoolean as Validator<InputOptions[\"highlightCode\"]>,\n  sourceMaps: assertSourceMaps as Validator<InputOptions[\"sourceMaps\"]>,\n  sourceMap: assertSourceMaps as Validator<InputOptions[\"sourceMap\"]>,\n  sourceFileName: assertString as Validator<InputOptions[\"sourceFil   o   �    ��        �A                                               ��j    �kh/    &-j    �<�    &-j    �<�                                     ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���           ���        !  ���        "   ��        #  ��        $   ��        %  0��        &  @��        '  P��        (  `��        )  p��        *  ���        +  ���        ,  ���        -  ���        .  ���        /  ���        0  ���        1  ���        2   ��        3  ��        4   ��        5  0��        6  @��        7  P��        8  `��        9  p��        :  ���        ;  ���        <  ���        =  ���        >  ���        ?  ���        @  ���        A  ���    �   B ;

/**
 * The **`DOMRectReadOnly`** interface specifies the standard properties (also used by DOMRect) to define a rectangle whose properties are immutable.
 *
 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMRectReadOnly)
 */
interface DOMRectReadOnly {
    /**
     * The **`bottom`** read-only property of the **`DOMRectReadOnly`** interface returns the bottom coordinate value of the `DOMRect`.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMRectReadOnly/bottom)
     */
    readonly bottom: number;
    /**
     * The **`height`** read-only property of the **`DOMRectReadOnly`** interface represents the height of the `DOMRect`.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMRectReadOnly/height)
     */
    readonly height: number;
    /**
     * The **`left`** read-only property of the **`DOMRectReadOnly`** interface returns the left coordinate value of the `DOMRect`.
     *
     * [MDN Reference](https://d        �?      �� onuration.js.mapctReadOnly/left)
     */
    readonly left: number;
    /**
     * The **`right`** read-only property of the **`DOMRectReadOnly`** interface returns the right coordinate value of the `DOMRect`.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMRectReadOnly/right)
     */
    readonly right: number;
    /**
     * The **`top`** read-only property of the **`DOMRectReadOnly`** interface returns the top coordinate value of the `DOMRect`.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMRectReadOnly/top)
     */
    readonly top: number;
    /**
     * The **`width`** read-only property of the **`DOMRectReadOnly`** interface represents the width of the `DOMRect`.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMRectReadOnly/width)
     */
    readonly width: number;
    /**
     * The **`x`** read-only property of the **`DOMRectReadOnly`** interface represents the x coordinate of the `DOMRect`'s origin.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMRectReadOnly/x)
     */
    readonly x: number;
    /**
     * The **`y`** read-only property of the **`DOMRectReadOnly`** interface represents the y coordinate of the `DOMRect`'s origin.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMRectReadOnly/y)
     */
    readonly y: number;
    /**
     * The DOMRectReadOnly method `toJSON()` returns a JSON representation of the `DOMRectReadOnly` object.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMRectReadOnly/toJSON)
     */
    toJSON(): any;
}

declare var DOMRectReadOnly: {
    prototype: DOMRectReadOnly;
    new(x?: number, y?: number, width?: number, height?: number): DOMRectReadOnly;
    /**
     * The **`fromRect()`** static method of the object with a given location and dimensions.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMRectReadOnly/fromRect_static)
     */
    fromRect(other?: DOM ���           ��          ��           ��          0��          @��          P��          `��          p��        	  ���        
  ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���           ���        !   ��        "  ��        #   ��        $  0��        %  @��        &  P��        '  `��        (  p��        )  ���        *  ���        +  ���        ,  ���        -  ���        .  ���        /  ���        0  ���        1   ��        2  ��        3   ��        4  0��        5  @��        6  P��        7  `��        8  p��        9  ���        :  ���        ;  ���        <  ���        =  ���        >  ���        ?  ���        @  ���        A  ���    �   B | !display_name) {
    return errorResponse('BAD_REQUEST', 'username 和 display_name 为必填项', 400)
  }

  // Validate username format: alphanumeric + underscores, 3-30 chars
  if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
    return errorResponse('BAD_REQUEST', 'username 仅支持字母、数字和下划线，长度3-30', 400)
  }

  const adminClient = createAdminClient()

  // 3. Check if username is already taken
  const { data: existingUser } = await adminClient
    .from('users')
    .select('id')
    .eq('username', username)
    .maybeSingle()

  if (existingUser) {
    return errorResponse('CONFLICT', `用户名 '${username}' 已被占用`, 409)
  }

  // 4. Create user record (AI type, no email, no initial credits)
  const { data: user, error: userError } = await adminClient
    .from('users')
    .insert({
      email: null,
      name: display_name,
      username,
      user_type: 'ai',
      bio: description || null,
      capa   x          libmes�    c             ..     �>             api.ts     �<             AbstractEqualityComparison.js     M=             AbstractRelationalComparison.js     @             AddEntriesFromIterable.js     l@             AddToKeptObjects.js     yA             AdvanceStringIndex.js     (B     	       % ApplyStringOrNumericBinaryOperator.js     pC     
        ArrayCreate.js     TD             ArraySetLength.js     �D             ArraySpeciesCreate.js     �E            $ AsyncFromSyncIteratorContinuation.js     &F             AsyncIteratorClose.js�    �=             BigInt     pF             BigIntBitwiseOp.js     �F             BinaryAnd.js     "G             BinaryOr.js     hG             BinaryXor.js     �I             ByteListBitwiseOp.js     �I             ByteListEqual.js     �J             Call.js     (K             Canonicalize.js     �K             CanonicalNumericIndexString.js     'L             CharacterRange.js     gL             clamp.js     �L             ClearKeptObjects.js     �L             CloneArrayBuffer.js     M             CodePointAt.js     @M             CodePointsToString.js     �M             CompletePropertyDescriptor.js     8N              CompletionRecord.js     �N     !        CopyDataProperties.js     �N     "        CreateAsyncFromSyncIterator.js     QO     #        CreateDataProperty.js     �O     $        CreateDataPropertyOrThrow.js     �O     %        CreateHTML.js     LP     &        CreateIterResultObject.js     �P     '        CreateListFromArrayLike.js     �P     (        CreateMethodProperty.js     -Q     )        CreateRegExpStringIterator.js     �Q     *        DateFromTime.js     �Q     +        DateString.js     2R     ,        Day.js     �R     -        DayFromYear.js     �R     .        DaysInYear.js     ES     /        DayWithinYear.js     �S     0        DefinePropertyOrThrow.js     / ��          ��           ��          0��          @��          P��          `��          p��          ���        	  ���        
  ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���            ��        !  ��        "   ��        #  0��        $  @��        %  P��        &  `��        '  p��        (  ���        )  ���        *  ���        +  ���        ,  ���        -  ���        .  ���        /  ���        0   ��        1  ��        2   ��        3  0��        4  @��        5  P��        6  `��        7  p��        8  ���        9  ���        :  ���        ;  ���        <  ���        =  ���        >  ���        ?  ���        @   ��        A   ��    �   B     /]     J        IsAccessorDescriptor.js     ^]     K       
 IsArray.js     �]     L        IsBigIntElementType.js     �]     M        IsCallable.js     �]     N       ! IsCompatiblePropertyDescriptor.js     
^     O        IsConcatSpreadable.js     >^     P        IsConstructor.js     u^     Q        IsDataDescriptor.js     �^     R        IsDetachedBuffer.js     �^     S        IsExtensible.js     _     T        IsGenericDescriptor.js     R_     U        IsIntegralNumber.js     �_     V        IsNoTearConfiguration.js     �_     W        IsPromise.js     `     X        IsPropertyKey.js     L`     Y        IsRegExp.js     x`     Z        IsSharedArrayBuffer.js     �`     [        IsStringPrefix.js     Oq     \         IsUnclampedIntegerElementType.js     pq     ]        IsUnsignedElementType.js     �q     ^        IsValidIntegerIndex.js     �q     _        IsWordChar.js     ?r     `        Iterable. */
  g   n          app         ��    P	     ��    6    Parent(): NodeParentType<ts.JSDocOptionalType>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JSDocOptionalType>>;
}

declare const JSDocOverloadTagBase: Constructor<JSDocTypeExpressionableTag> & typeof JSDocTag;

/** JS doc overload tag. */
export declare class JSDocOverloadTag extends JSDocOverloadTagBase<ts.JSDocOverloadTag> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JSDocOverloadTag>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JSDocOverloadTag>>;
}

/** JS doc override tag node. */
export declare class JSDocOverrideTag extends JSDocTag<ts.JSDocOverrideTag> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JSDocOverrideTag>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JSDocOverrideTag>>;
}

declare const JSDocParameterTagBase: Constructor<JSDocPropertyLikeTag> & typeof JSDocTag;

/** JS doc parameter tag node. */
export declare class JSDocParameterTag extends JSDocParameterTagBase<ts.JSDocParameterTag> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JSDocParameterTag>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JSDocParameterTag>>;
}

/** JS doc private tag node. */
export declare class JSDocPrivateTag extends JSDocTag<ts.JSDocPrivateTag> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JSDocPrivateTag>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JSDocPrivateTag>>;
}

declare const JSDocPropertyTagBase: Constructor<JSDocPropertyLikeTag> & typeof JSDocTag;

/** JS doc property tag node. */
export declare class JSDocPropertyTag extends JSDocPropertyTagBase<ts.JSDocPropertyTag> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JSDocPropertyTag>;
  /** @inheritdoc **/
  getParentOrThrow(message?:    o   �    "    0        0��          @��          P��          `��          p��          ���          ���        	  ���        
  ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��           ��        !   ��        "  0��        #  @��        $  P��        %  `��        &  p��        '  ���        (  ���        )  ���        *  ���        +  ���        ,  ���        -  ���        .  ���        /   ��        0  ��        1   ��        2  0��        3  @��        4  P��        5  `��        6  p��        7  ���        8  ���        9  ���        :  ���        ;  ���        <  ���        =  ���        >  ���        ?   ��        @  ��        A  ��    �   B ototypeOf.js     ��     {        OrdinaryHasInstance.js     ��     |        OrdinaryHasProperty.js     ��     }        OrdinaryObjectCreate.js     �     ~        OrdinarySetPrototypeOf.js     .�             OrdinaryToPrimitive.js     q�     �        PromiseResolve.js     ��     �        QuoteJSONString.js     ��     �        RawBytesToNumeric.js     ��     �        RegExpCreate.js     +�     �        RegExpExec.js     ��     �        RequireObjectCoercible.js     ��     �        SameValue.js     M�     �        SameValueNonNumeric.js     �     �        SameValueZero.js     ��     �        SecFromTime.js     	�     �        Set.js     =�     �        SetFunctionLength.js     m�     �        SetFunctionName.js     ��     �        SetIntegrityLevel.js     ��     �        SetTypedArrayFromArrayLike.js     ��     �        SetTypedArrayFromTypedArray.js     �     �        SetValueInBuffer.js     ��     �           x     �      �� match  �.            ..     �.            add.js     �1            bitwiseAND.js     2            bitwiseNOT.js     F2            bitwiseOR.js     2            bitwiseXOR.js     �7           	 divide.js     F8    	        equal.js     �8    
        exponentiate.js     ]<            index.js     �B            leftShift.js     /C            lessThan.js     DE            multiply.js     �H            remainder.js     GI            sameValue.js     �I            sameValueZero.js     CK            signedRightShift.js     �L            subtract.js     �Q            toString.js     `T            unaryMinus.js     �T            unsignedRightShift.js    �        ThrowCompletion.js     ��     �        TimeClip.js     ��     �        TimeFromYear.js     ��     �        TimeString.js     �     �        TimeWithinDay.js     *�     �        TimeZoneString.js     I�     �        ToBigInt.js     c�     �        ToBigInt64.js     y�     �        ToBigUint64.js     ��     �        ToBoolean.js     ��     �        ToDateString.js     ��     �       
 ToIndex.js     �     �       
 ToInt16.js     A�     �       
 ToInt32.js     n�     �       	 ToInt8.js     ��     �        ToIntegerOrInfinity.js     ��     �        ToLength.js     ��     �        ToNumber.js     �     �        ToNumeric.js     5�     �        ToObject.js     a�     �        ToPrimitive.js     ��     �        ToPropertyDescriptor.js     ��     �        ToPropertyKey.js     �     �        ToString.js     f�     �        ToUint16.js     ��     �        ToUint32.js     ��     �       
 ToUint8.js     ��     �        ToUint8Clamp.js     "�     �        TrimString.js     _�     �        Type.js     �     �        TypedArrayCreate.js     ��     �        TypedArraySpeciesCreate.js     ��     �        UnicodeEscape.js     V�     �        UTF16Encod (��          0��          @��          P��          `��          p��          ���          ���          ���        	  ���        
  ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��            ��        !  0��        "  @��        #  P��        $  `��        %  p��        &  ���        '  ���        (  ���        )  ���        *  ���        +  ���        ,  ���        -  ���        .   ��        /  ��        0   ��        1  0��        2  @��        3  P��        4  `��        5  p��        6  ���        7  ���        8  ���        9  ���        :  ���        ;  ���        <  ���        =  ���        >   ��        ?  ��        @   ��        A   ��    �   B 403)
    }
    return errorResponse('UNAUTHORIZED', error.message, 401)
  }

  // Fetch user profile including credits from users table
  const { data: userProfile } = await supabase
    .from('users')
    .select('id, name, username, email, avatar_url, user_type, credits, capabilities, is_verified, is_email_verified')
    .eq('id', data.user.id)
    .maybeSingle()

  return successResponse({
    session: data.session,
    user: userProfile,
  })
}
2BAA2B;gBAC3B,MAAM,IAAI,uBAAW,CAAC,uBAAuB,CAAC,CAAC;YACnD,CAAC;YAED,MAAM,QAAQ,CAAC,WAAY,CAAC,MAAM,EAAE,WAAW,CAAC,IAAI,CAAC,CAAC;YACtD,GAAG,CAAC,MAAM,CAAC,GAAG,CAAC,CAAC,IAAI,CAAC,EAAE,CAAC,CAAC;QAC7B,CAAC;QAAC,OAAO,KAAK,EAAE,CAAC;YACb,IAAI,KAAK,YAAY,sBAAU,EAAE,CAAC;gBAC9B,MAAM,MAAM,GAAG,KAAK,YAAY,uBAAW,CAAC,CAAC,CAAC,GAAG,CAAC,CAssion */ || declaration.kind === 260 /* VariableDeclaration */ && declaration.exclamationToken || declaration.flags & 33554432 /* Ambient */;
    const initialType = isAutomaticTypeInNonNull ? undefinedType :   n         
 hermes-lab   0��    �     ..�    �*             dist     ))             LICENSE     ,             package.json     1            	 README.md�    �5             src�    *)             typesCAAC,gBAAgB,EAAE,CAAC,CAAC;YACzD,CAAC;QACL,CAAC;IACL,CAAC,CAAC,CAAC;IAEH,OAAO,MAAM,CAAC;AAClB,CAAC"} flowContainer);
    if (!isEvolvingArrayOperationTarget(node) && (type === autoType || type === autoArrayType)) {
      if (flowType === autoType || flowType === autoArrayType) {
        if (noImplicitAny) {
          error2(getNameOfDeclaration(declaration), Diagnostics.Variable_0_implicitly_has_type_1_in_some_locations_where_its_type_cannot_be_determined, symbolToString(symbol), typeToString(flowType));
          error2(node, Diagnostics.Variable_0_implicitly_has_an_1_type, symbolToString(symbol), typeToString(flowType));
        }
        return convertAutoToAny(flowType);
      }
    } else if (!assumeInitialized && !containsUndefinedType(type) && containsUndefinedType(flowType)) {
      error2(node, Diagnostics.Variable_0_is_used_before_being_assigned, symbolToString(symbol));
      return type;
    }
    return assignmentKind ? getBaseTypeOfLiteralType(flowType) : flowType;
  }
  function isSameScopedBindingElement(node, declaration) {
    if (isBindingElement(declaration)) {
      const bindingElement = findAncestor(node, isBindingElement);
      return bindingElement && getRootDeclaration(bindingElement) === getRootDeclaration(declaration);
    }
  }
  function shouldMarkIdentifierAliasReferenced(node) {
    var _a;
    const parent2 = node.parent;
    if (parent2) {
      if (isPropertyAccessExpression(parent2) && parent2.expression === node) {
        return false;
      }
      if (isExportSpecifier(parent2) && parent2.isTypeOnly) {
        return false;
      }
      const greatGrandparent = (_a = parent2.parent) == null ? void 0 : _a.parent;
      if (greatGrandparent && isExportDeclaration(greatGrandparent) && greatGrandparent.isTypeOnly) {
        return false;
      } 8��          @��          P��          `��          p��          ���          ���          ���          ���        	  ���        
  ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��           0��        !  @��        "  P��        #  `��        $  p��        %  ���        &  ���        '  ���        (  ���        )  ���        *  ���        +  ���        ,  ���        -   ��        .  ��        /   ��        0  0��        1  @��        2  P��        3  `��        4  p��        5  ���        6  ���        7  ���        8  ���        9  ���        :  ���        ;  ���        <  ���        =   ��        >  ��        ?   ��        @  0��        A  0��    �   B nt.kind === 299 /* CatchClause */) {
      return;
    }
    const container = getEnclosingBlockScopeContainer(symbol.valueDeclaration);
    const isCaptured = isInsideFunctionOrInstancePropertyInitializer(node, container);
    const enclosingIterationStatement = getEnclosingIterationStatement(container);
    if (enclosingIterationStatement) {
      if (isCaptured) {
        let capturesBlockScopeBindingInLoopBody = true;
        if (isForStatement(container)) {
          const varDeclList = getAncestor(symbol.valueDeclaration, 261 /* VariableDeclarationList */);
          if (varDeclList && varDeclList.parent === container) {
            const part = getPartOfForStatementContainingNode(node.parent, container);
            if (part) {
              const links = getNodeLinks(part);
              links.flags |= 8192 /* ContainsCapturedBlockScopeBinding */;
              const capturedBindings = links.capturedBlockScopeBindings || (links.capturedBlockScopeBindings = []);
           x     A�      �� etState, useEffect } from 'react'
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
  const [vis, setVis] = useState<Visi.valueDeclaration).flags |= 16384 /* CapturedBlockScopedBinding */;
    }
  }
  function isBindingCapturedByNode(node, decl) {
    const links = getNodeLinks(node);
    return !!links && contains(links.capturedBlockScopeBindings, getSymbolOfDeclaration(decl));
  }
  function isAssignedInBodyOfForStatement(node, container) {
    let current = node;
    while (current.parent.kind === 217 /* ParenthesizedExpression */) {
      current = current.parent;
    }
    let isAssigned = false;
    if (isAssignmentTarget(current)) {
      isAssigned = true;
    } else if (current.parent.kind === 224 /* PrefixUnaryExpression */ || current.parent.kind === 225 /* PostfixUnaryExpression */) {
      const expr = current.parent;
      isAssigned = expr.operator === 46 /* PlusPlusToken */ || expr.operator === 47 /* MinusMinusToken */;
    }
    if (!isAssigned) {
      return false;
    }
    return !!findAncestor(current, (n) => n === container ? "quit" : n === container.statement);
  }
  function captureLexicalThis(node, container) {
    getNodeLinks(node).flags |= 2 /* LexicalThis */;
    if (container.kind === 172 /* PropertyDeclaration */ || contai   y       +t           �A                                               t�j    Ȥ     ��j    ���    ��j    ���                                     ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��           @��        !  P��        "  `��        #  p��        $  ���        %  ���        &  ���        '  ���        (  ���        )  ���        *  ���        +  ���        ,   ��        -  ��        .   ��        /  0��        0  @��        1  P��        2  `��        3  p��        4  ���        5  ���        6  ���        7  ���        8  ���        9  ���        :  ���        ;  ���        <   ��        =  ��        >   ��        ?  0��        @  @��        A  @��    �   B     if (!text.trim() || busy) return
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
        body: JSON.stringify({ title: dTitle.trim(), des   x      �     �� t-server-dom-webpackget, deadline_date: dDeadline || undefined, is_urgent: dUrgent, visibility: dVis, tags: dTags.length ? dTags : undefined })
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
   y         `��          p��          ���          ���          ���          ���          ���          ���        	  ���        
  ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��           P��        !  `��        "  p��        #  ���        $  ���        %  ���        &  ���        '  ���        (  ���        )  ���        *  ���        +   ��        ,  ��        -   ��        .  0��        /  @��        0  P��        1  `��        2  p��        3  ���        4  ���        5  ���        6  ���        7  ���        8  ���        9  ���        :  ���        ;   ��        <  ��        =   ��        >  0��        ?  @��        @  P��        A  P��    �   B t} className='inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-1 text-xs text-indigo-400'>#{t}<button onClick={() => removeTag(t)}><X className='h-3 w-3' /></button></span>)}</div>}
              </div>
            </div>
          </div>
          <div className='mt-4 flex items-center justify-between border-t border-zinc-800 pt-4'>
            <select value={vis} onChange={e => setVis(e.target.value as any)} className='rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 text-sm text-zinc-400 focus:border-zinc-700 focus:outline-none'>
              <option value='public'>Public</option><option value='followers'>Followers Only</option><option value='private'>Private</option>
            </select>
            <div className='flex items-center gap-3'>
              <span className='text-xs text-zinc-600'>{text.length}/2000</span>
              <Button size='sm' className='bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-pu        �      src Click={submitPost} disabled={!text.trim() || busy}>
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
                <label className='mb-1.5 block text-sm font-medium text-zinc-300 flex items-center gap-1.5'><DollarSign className='h-3.5 w-3.5 text-amber-400' />Credit h��          p��          ���          ���          ���          ���          ���          ���          ���        	  ���        
   ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��           `��        !  p��        "  ���        #  ���        $  ���        %  ���        &  ���        '  ���        (  ���        )  ���        *   ��        +  ��        ,   ��        -  0��        .  @��        /  P��        0  `��        1  p��        2  ���        3  ���        4  ���        5  ���        6  ���        7  ���        8  ���        9  ���        :   ��        ;  ��        <   ��        =  0��        >  @��        ?  P��        @  `��        A  `��    �   B ded-lg border border-zinc-800 bg-zinc-900/30 p-3'>
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
              <div className='flex items-center gap-2'><Hash className='h-4 w-4 text-zinc-500' /><input type='text' value={dTagIn} onChange={e => setDTagIn(e.target.value)} onKe        �      hermes-lab �             ..     z            	 .eslintrc�    -+            .github     �%            CHANGELOG.md     (           	 eval.d.ts     ^            eval.js     �(           
 index.d.ts     �    	        index.js     �e     
        LICENSE     !            package.json     W)           
 range.d.ts     C            range.js     #'           	 README.md     �)            ref.d.ts     �            ref.js     D*            syntax.d.ts     �           	 syntax.js�    �            test     �"            tsconfig.json     �*           	 type.d.ts     �            type.js     ++            uri.d.ts     B             uri.jsorder border-zinc-800 bg-zinc-900/50 px-3 py-1.5 text-sm text-zinc-400 focus:border-zinc-700 focus:outline-none'>
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
 of the document.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/title)
     */
    title: string;
    /**
     * The **`Document.visibilityState`** read-only property returns the visibility of the document.
     *
     * [MDN Reference](https://developer.mozilla.o x��          ���          ���          ���          ���          ���          ���          ���          ���        	   ��        
  ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��           p��        !  ���        "  ���        #  ���        $  ���        %  ���        &  ���        '  ���        (  ���        )   ��        *  ��        +   ��        ,  0��        -  @��        .  P��        /  `��        0  p��        1  ���        2  ���        3  ���        4  ���        5  ���        6  ���        7  ���        8  ���        9   ��        :  ��        ;   ��        <  0��        =  @��        >  P��        ?  `��        @  p��        A  p��    �   B tions?: CaretPositionFromPointOptions): CaretPosition | null;
    /** @deprecated */
    caretRangeFromPoint(x: number, y: number): Range | null;
    /**
     * The **`Document.clear()`** method does nothing, but doesn't raise any error.
     * @deprecated
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/clear)
     */
    clear(): void;
    /**
     * The **`Document.close()`** method finishes writing to a document, opened with Document.open().
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/close)
     */
    close(): void;
    /**
     * The **`Document.createAttribute()`** method creates a new attribute node, and returns it.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/createAttribute)
     */
    createAttribute(localName: string): Attr;
    /**
     * The **`Document.createAttributeNS()`** method creates a new attribute node with the specified namespace URI and qualifie    n          tsconfig.json             ..     R             route.ts�    mJ             [id]32     t           & facc936980a3a81155f940b45649a464c054aanull, qualifiedName: string): Attr;
    /**
     * **`createCDATASection()`** creates a new CDATA section node, and returns it.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/createCDATASection)
     */
    createCDATASection(data: string): CDATASection;
    /**
     * **`createComment()`** creates a new comment node, and returns it.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/createComment)
     */
    createComment(data: string): Comment;
    /**
     * Creates a new empty DocumentFragment into which DOM nodes can be added to build an offscreen DOM tree.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/createDocumentFragment)
     */
    createDocumentFragment(): DocumentFragment;
    /**
     * In an HTML document, the **`document.createElement()`** method creates the HTML element specified by `localName`, or an HTMLUnknownElement if `localName` isn't recognized.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/createElement)
     */
    createElement<K extends keyof HTMLElementTagNameMap>(tagName: K, options?: ElementCreationOptions): HTMLElementTagNameMap[K];
    /** @deprecated */
    createElement<K extends keyof HTMLElementDeprecatedTagNameMap>(tagName: K, options?: ElementCreationOptions): HTMLElementDeprecatedTagNameMap[K];
    createElement(tagName: string, options?: ElementCreationOptions): HTMLElement;
    /**
     * Creates an element with the specified namespace URI and qualified name.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/createElementNS)
     */
    createElementNS(namespaceURI: "http://www.w3.org/1999/xhtml", qualifiedName: string): HTMLElement;
    createElementNS<K extends keyof SVGElementTagNameMap>(namespaceURI: "http://www.w3.org/2000/svg"            ���          ���          ���          ���          ���          ���          ���           ��        	  ��        
   ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��           ���        !  ���        "  ���        #  ���        $  ���        %  ���        &  ���        '  ���        (   ��        )  ��        *   ��        +  0��        ,  @��        -  P��        .  `��        /  p��        0  ���        1  ���        2  ���        3  ���        4  ���        5  ���        6  ���        7  ���        8   ��        9  ��        :   ��        ;  0��        <  @��        =  P��        >  `��        ?  p��        @  ���        A  ���    �   B ON = 'ScalarTypeDefinition',
  OBJECT_TYPE_DEFINITION = 'ObjectTypeDefinition',
  FIELD_DEFINITION = 'FieldDefinition',
  INPUT_VALUE_DEFINITION = 'InputValueDefinition',
  INTERFACE_TYPE_DEFINITION = 'InterfaceTypeDefinition',
  UNION_TYPE_DEFINITION = 'UnionTypeDefinition',
  ENUM_TYPE_DEFINITION = 'EnumTypeDefinition',
  ENUM_VALUE_DEFINITION = 'EnumValueDefinition',
  INPUT_OBJECT_TYPE_DEFINITION = 'InputObjectTypeDefinition',
  /** Directive Definitions */
  DIRECTIVE_DEFINITION = 'DirectiveDefinition',
  /** Type System Extensions */
  SCHEMA_EXTENSION = 'SchemaExtension',
  DIRECTIVE_EXTENSION = 'DirectiveExtension',
  /** Type Extensions */
  SCALAR_TYPE_EXTENSION = 'ScalarTypeExtension',
  OBJECT_TYPE_EXTENSION = 'ObjectTypeExtension',
  INTERFACE_TYPE_EXTENSION = 'InterfaceTypeExtension',
  UNION_TYPE_EXTENSION = 'UnionTypeExtension',
  ENUM_TYPE_EXTENSION = 'EnumTypeExtension',
  INPUT_OBJECT_TYPE_EXTENSION = 'InputObjectTypeExtension',
  /** Schema Coordinates */
     n  	   
     download   �             ..     ~            	 .eslintrc�    �#            .github     �            CHANGELOG.md     �"           	 gOPD.d.ts     _            gOPD.js     �#           
 index.d.ts     �    	        index.js     �e     
        LICENSE     D            package.json     �           	 README.md�    �            test     �            tsconfig.jsonased on filenames in a project.
		*/
		disableFilenameBasedTypeAcquisition?: boolean;
	};

	type References = {
		/**
		A normalized path on disk.
		*/
		path: string;

		/**
		The path as the user originally wrote it.
		*/
		originalPath?: string;

		/**
		True if the output of this reference should be prepended to the output of this project.

		Only valid for `--outFile` compilations.
		@deprecated This option will be removed in TypeScript 5.5.
		*/
		prepend?: boolean;

		/**
		True if it is intended that this reference form a circularity.
		*/
		circular?: boolean;
	};
}

/**
Type for [TypeScript's `tsconfig.json` file](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html).

@category File
*/
export type TsConfigJson = {
	/**
	Instructs the TypeScript compiler how to compile `.ts` files.
	*/
	compilerOptions?: TsConfigJson.CompilerOptions;

	/**
	Instructs the TypeScript compiler how to watch files.
	*/
	watchOptions?: TsConfigJson.WatchOptions;

	/**
	Auto type (.d.ts) acquisition options for this project.
	*/
	typeAcquisition?: TsConfigJson.TypeAcquisition;

	/**
	Enable Compile-on-Save for this project.
	*/
	compileOnSave?: boolean;

	/**
	Path to base configuration file to inherit from.
	*/
	extends?: string | string[];

	/**
	If no `files` or `include` property is present in a `tsconfig.json`, the compiler defaults to including all files in the containing directory and subdirectories except those specified by `exclude`. When a `files` property is specified, only those files and those specified by `include` are included.
	*/
	files?: string[];

	/**
	Specif   o   �    I#             ���          ���          ���          ���          ���           ��          ��        	   ��        
  0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���           ���        !  ���        "  ���        #  ���        $  ���        %  ���        &  ���        '   ��        (  ��        )   ��        *  0��        +  @��        ,  P��        -  `��        .  p��        /  ���        0  ���        1  ���        2  ���        3  ���        4  ���        5  ���        6  ���        7   ��        8  ��        9   ��        :  0��        ;  @��        <  P��        =  `��        >  p��        ?  ���        @  ���        A  ���    �   B erverConnection,
        info: { protocols: [] },
      },
    })
  }

  passthrough = () => {}
  errorWith = () => {}
}

it('does not print any warnings or errors using the "bypass" strategy', async () => {
  await expect(
    executeUnhandledFrameHandle(
      new TestHttpFrame(new Request('http://localhost/test')),
      'bypass',
    ),
  ).resolves.toBeUndefined()
  expect(console.warn).not.toHaveBeenCalled()
  expect(console.error).not.toHaveBeenCalled()
})

it('prints a warning for the HTTP frame using the "warn" strategy', async () => {
  await expect(
    executeUnhandledFrameHandle(
      new TestHttpFrame(new Request('http://localhost/test')),
      'warn',
    ),
  ).resolves.toBeUndefined()

  expect.soft(console.warn).toHaveBeenCalledOnce()
  expect(console.warn).toHaveBeenCalledWith(
    `[MSW] Warning: intercepted a request without a matching request handler:

  • GET http://localhost/test

If you still wish to intercept this unhandled request, please create a   x            �� -jsiesea183c5a855f752603d8e5b05785/http/intercepting-requests`,
  )
  expect(console.error).not.toHaveBeenCalled()
})

it('rejects and prints an error for the HTTP frame using the "error" strategy', async () => {
  await expect(
    executeUnhandledFrameHandle(
      new TestHttpFrame(new Request('http://localhost/test')),
      'error',
    ),
  ).rejects.toThrow(
    `[MSW] Cannot bypass a request when using the "error" strategy for the "onUnhandledRequest" option.`,
  )

  expect.soft(console.error).toHaveBeenCalledOnce()
  expect(console.error).toHaveBeenCalledWith(
    `[MSW] Error: intercepted a request without a matching request handler:

  • GET http://localhost/test

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/http/intercepting-requests`,
  )
  expect(console.warn).not.toHaveBeenCalled()
})

it('invokes the custom callback for the HTTP frame', async () => {
  const callback = vi.fn()
  const frame = new TestHttpFrame(new Request('http://localhost/test'))

  await expect(
    executeUnhandledFrameHandle(frame, callback),
  ).resolves.toBeUndefined()

  expect(callback).toHaveBeenCalledOnce()
  expect(callback).toHaveBeenCalledWith({
    defaults: {
      warn: expect.any(Function),
      error: expect.any(Function),
    },
    frame,
  })
})

it('does not print anything for common asset HTTP requests', async () => {
  await expect(
    executeUnhandledFrameHandle(
      new TestHttpFrame(new Request('http://localhost/image.png')),
      'warn',
    ),
  ).resolves.toBeUndefined()

  expect(console.warn).not.toHaveBeenCalled()
  expect(console.error).not.toHaveBeenCalled()

  await expect(
    executeUnhandledFrameHandle(
      new TestHttpFrame(new Request('http://localhost/image.png')),
      'error',
    ),
  ).resolves.toBeUndefined()

  expect(console.warn).not.toHaveBreadonly thresholds: ReadonlyArray<number>;\n    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/IntersectionObse   y         ���          ���          ���          ���          ���           ��          ��           ��        	  0��        
  @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���           ���        !  ���        "  ���        #  ���        $  ���        %  ���        &   ��        '  ��        (   ��        )  0��        *  @��        +  P��        ,  `��        -  p��        .  ���        /  ���        0  ���        1  ���        2  ���        3  ���        4  ���        5  ���        6   ��        7  ��        8   ��        9  0��        :  @��        ;  P��        <  `��        =  p��        >  ���        ?  ���        @  ���        A  ���    �   B r: expect.any(Function),
    },
    frame,
  })
  expect.soft(console.warn).toHaveBeenCalledOnce()
  expect(console.warn).toHaveBeenCalledWith(
    `[MSW] Warning: intercepted a request without a matching request handler:

  • GET http://localhost/test

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/http/intercepting-requests`,
  )
  expect(console.error).not.toHaveBeenCalled()
})

it('supports printing the default error in the custom callback for the HTTP frame', async () => {
  const callback = vi.fn<UnhandledFrameCallback>(({ defaults }) => {
    defaults.error()
  })
  const frame = new TestHttpFrame(new Request('http://localhost/test'))

  await expect(
    executeUnhandledFrameHandle(frame, callback),
  ).resolves.toBeUndefined()

  expect(callback).toHaveBeenCalledOnce()
  expect(callback).toHaveBeenCalledWith({
    defaults: {
      warn: expect.any(Function),
      error: expect.any(Func   x            �� ents})
  expect.soft(console.error).toHaveBeenCalledOnce()
  expect(console.error).toHaveBeenCalledWith(
    `[MSW] Error: intercepted a request without a matching request handler:

  • GET http://localhost/test

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/http/intercepting-requests`,
  )
  expect(console.warn).not.toHaveBeenCalled()
})

it('throws if given an unknown strategy for the HTTP frame', async () => {
  await expect(
    executeUnhandledFrameHandle(
      new TestHttpFrame(new Request('http://localhost/test')),
      // @ts-expect-error Intentionally invalid value.
      'intentionally-invalid',
    ),
  ).rejects.toThrow(
    `[MSW] Failed to react to an unhandled network frame: unknown strategy "intentionally-invalid". Please provide one of the supported strategies ("bypass", "warn", "error") or a custom callback function as the value of the "onUnhandledRequest" option.`,
  )
})

it('prints a warning for the WebSocket frame using the "warn" strategy', async () => {
  await expect(
    executeUnhandledFrameHandle(new TestWebSocketFrame(), 'warn'),
  ).resolves.toBeUndefined()

  expect.soft(console.warn).toHaveBeenCalledOnce()
  expect(console.warn).toHaveBeenCalledWith(
    `[MSW] Warning: intercepted a WebSocket connection without a matching event handler:

  • wss://localhost/test

If you still wish to intercept this unhandled connection, please create an event handler for it.
Read more: https://mswjs.io/docs/websocket`,
  )
  expect(console.error).not.toHaveBeenCalled()
})

it('rejects and prints an error for the WebSocket frame using the "error" strategy', async () => {
  await expect(
    executeUnhandledFrameHandle(new TestWebSocketFrame(), 'error'),
  ).rejects.toThrow(
    `[MSW] Cannot bypass a request when using the "error" strategy for the "onUnhandledRequest" option.`,
  )

  expect.soft(console.error).toHaveBeenCalledOnce()
  expect(console.error).toHaveBeenCalledWith(
    `[MSW] ���          ���          ���          ���          ���           ��          ��           ��          0��        	  @��        
  P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���           ���        !  ���        "  ���        #  ���        $  ���        %   ��        &  ��        '   ��        (  0��        )  @��        *  P��        +  `��        ,  p��        -  ���        .  ���        /  ���        0  ���        1  ���        2  ���        3  ���        4  ���        5   ��        6  ��        7   ��        8  0��        9  @��        :  P��        ;  `��        <  p��        =  ���        >  ���        ?  ���        @  ���        A  ���    �   B work frame: unknown strategy "intentionally-invalid". Please provide one of the supported strategies ("bypass", "warn", "error") or a custom callback function as the value of the "onUnhandledRequest" option.`,
  )
})

it('supports printing the default warning in the custom callback for the HTTP frame', async () => {
  const callback = vi.fn<UnhandledFrameCallback>(({ defaults }) => {
    defaults.warn()
  })
  const frame = new TestWebSocketFrame()

  await expect(
    executeUnhandledFrameHandle(frame, callback),
  ).resolves.toBeUndefined()

  expect(callback).toHaveBeenCalledOnce()
  expect(callbac data;
        switch (t) {
            case "number": {
                return Number.isNaN(data) ? "ไม่ใช่ตัวเลข (NaN)" : "ตัวเลข";
            }
            case "object": {
                if (Array.isArray(data)) {
                    return "อาร์เร�https://developer.mozilla.org/docs/Web/API/KeyframeEffect/setKeyframes) */\n       x          AGORAng.gyptype { $ZodStringFormats } from "../core/checks.js";
import type * as errors from "../core/errors.js";
import * as util from "../core/util.js";

const error: () => errors.$ZodErrorMap = () => {
  const Sizable: Record<string, { unit: string; verb: string }> = {
    string: { unit: "caratteri", verb: "avere" },
    file: { unit: "byte", verb: "avere" },
    array: { unit: "elementi", verb: "avere" },
    set: { unit: "elementi", verb: "avere" },
  };

  function getSizing(origin: string): { unit: string; verb: string } | null {
    return Sizable[origin] ?? null;
  }

  const parsedType = (data: any): string => {
    const t = typeof data;

    switch (t) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "numero";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "vettore";
        }
        if (data === null) {
          return "null";
        }

        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.: DOMHighResTimeStamp;\n    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/LargestContentfulPaint/size) */\n    readonly size: number;\n    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/LargestContentfulPaint/url) */\n    readonly url: string;\n    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/LargestContentfulPaint/toJSON) */\n    toJSON(): any;\n}\n\ndeclare var LargestContentfulPaint: {\n    prototype: LargestContentfulPaint;\n    new(): LargestContentfulPaint;\n};\n\ninterface LinkStyle {\n    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLLinkElement/sheet) */\n    readonly sheet: CSSStyleSheet | null;\n}\n\n/**\n * The location (URL) of the object it is linked to. Changes done on it are reflected on the object it relates to. Both the Document and Window interface have such a linked Location, accessible via Document.location and Window.location respectively.\n *\n * [MDN Reference](https://developer.mozilla.org/d ���          ���          ���          ���           ��          ��           ��          0��          @��        	  P��        
  `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���           ���        !  ���        "  ���        #  ���        $   ��        %  ��        &   ��        '  0��        (  @��        )  P��        *  `��        +  p��        ,  ���        -  ���        .  ���        /  ���        0  ���        1  ���        2  ���        3  ���        4   ��        5  ��        6   ��        7  0��        8  @��        9  P��        :  `��        ;  p��        <  ���        =  ���        >  ���        ?  ���        @  ���        A  ���    �   B  "ที่อยู่ IPv6",
        cidrv4: "ช่วง IP แบบ IPv4",
        cidrv6: "ช่วง IP แบบ IPv6",
        base64: "ข้อความแบบ Base64",
        base64url: "ข้อความแบบ Base64 สำหรับ URL",
        json_string: "ข้อความแบบ JSON",
        e164: "เบอร์โทรศัพท์ระหว่างประเทศ (E.164)",
        jwt: "โทเคน JWT",
        template_literal: "ข้อมูลที่ป้อน",
    };
    return (issue) => {
        switch (issue.code) {
            case "invalid_type":
                return `ประเภทข้อมูลไม่ถูกต้อง: ควรเป็น ${issue.expected} แต่ได้รับ ${parsedType(issue.input)}`;
            case "invalid_value":
                if (issue.values.length === 1)
                    return `ค่าไม่ถูกต้อง: ควรเป็�   x     �?      ��  .�    �/            ..     r|           
 index.d.ts     y            index.js     �w            license     Yz            package.json     ]{           	 readme.md       case "too_big": {
                const adj = issue.inclusive ? "ไม่เกิน" : "น้อยกว่า";
                const sizing = getSizing(issue.origin);
                if (sizing)
                    return `เกินกำหนด: ${issue.origin ?? "ค่า"} ควรมี${adj} ${issue.maximum.toString()} ${sizing.unit ?? "รายการ"}`;
                return `เกินกำหนด: ${issue.origin ?? "ค่า"} ควรมี${adj} ${issue.maximum.toString()}`;
            }
            case "too_small": {
                const adj = issue.inclusive ? "อย่างน้อย" : "มากกว่า";
                const sizing = getSizing(issue.origin);
                if (sizing) {
                    return `น้อยกว่ากำหนด: ${issue.origin} ควรมี${adj} ${issue.minimum.toString()} ${sizing.unit}`;
                }
                return `น้อยกว่ากำหนด: ${issue.origin} ควรมี${adj} ${issue.minimum.toString()}`;
            }
            case "invalid_format": {
                const _issue = issue;
                if (_issue.format === "starts_with") {
                    return `รูปแบบไม่ถูกต้อง: ข้อความต้องขึ้นต้นด้วย "${_issue.prefix}"`;
                }
                if (_issue.format === "ends_with")
                    return `รูปแบบไม่ถูกต้อง: ข้อความต้องลงท้ายด้วย "${_issue.suffix}"`;
                if (_issue.format === "includes")
                    return `รูปแบบไม่ถูกต้อง: ข้อความต้องมี "${_issue.includes}" อยู่ในข้อควา�   y         ���          ���           ��          ��           ��          0��          @��          P��        	  `��        
  p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���           ���        !  ���        "  ���        #   ��        $  ��        %   ��        &  0��        '  @��        (  P��        )  `��        *  p��        +  ���        ,  ���        -  ���        .  ���        /  ���        0  ���        1  ���        2  ���        3   ��        4  ��        5   ��        6  0��        7  @��        8  P��        9  `��        :  p��        ;  ���        <  ���        =  ���        >  ���        ?  ���        @  ���        A  ���    �   B �ว้";
            case "invalid_element":
                return `ข้อมูลไม่ถูกต้องใน ${issue.origin}`;
            default:
                return `ข้อมูลไม่ถูกต้อง`;
        }
    };
};
function default_1() {
    return {
        localeError: error(),
    };
}
ws an `Error` if the passed string is not a valid representation of an
IP address.

The `ipaddr.process` method works just like the `ipaddr.parse`e��H��H��X�Q   AWAVS��I��A��D+C�?A��A1�A���   rD�����L��賶��A����A��L��衶��A�^[A^A_�H��v��PH��H�|� j^1��q��I��I)�rH9�w
H�H��L���PH�S� H��H����p��SH��H���j^1������H��u�[�H�$� j^H��H����u��AVSPH��I���������tH��vA�F	�1�H��[A^�H��~� j	_j^H���xp��UAWAVAUATSH��   I��I��I��H��I��L���6  I�H��uH�D$H�CH�   �  �t L�t$�l$I�UL9�uH�{��L����   H�# ��   A�}  ��   I��$�  ��p  ;�t  ��   I��`  AEI�E H��FH�VH�F �& A�EA�M(�F�N(L�l$hL��L���y  A�E    AEH�L   x      �     ��  .�    �@             ..     A             package.jsont function (): {
    localeError: errors.$ZodErrorMap;
};
pe` is not set, then both square-bracket escapes and\n * backslash escapes are removed.\n *\n * Slashes (and backslashes in `windowsPathsNoEscape` mode) cannot be escaped\n * or unescaped.\n *\n * When `magicalBraces` is not set, escapes of braces (`{` and `}`) will not be\n * unescaped.\n */\n\nexport const unescape = (\n  s: string,\n  {\n    windowsPathsNoEscape = false,\n    magicalBraces = true,\n  }: Pick<MinimatchOptions, 'windowsPathsNoEscape' | 'magicalBraces'> = {},\n) => {\n  if (magicalBraces) {\n    return windowsPathsNoEscape ?\n        s.replace(/\\[([^/\\\\])\\]/g, '$1')\n      : s\n          .replace(/((?!\\\\).|^)\\[([^/\\\\])\\]/g, '$1$2')\n          .replace(/\\\\([^/])/g, '$1')\n  }\n  return windowsPathsNoEscape ?\n      s.replace(/\\[([^/\\\\{}])\\]/g, '$1')\n    : s\n        .replace(/((?!\\\\).|^)\\[([^/\\\\{}])\\]/g, '$1$2')\n        .replace(/\\\\([^/{}])/g, '$1')\n}\n"]}�M��I���  A�} u�H�D$H�T$ H�H�=>Zd H�:�| L��y� j+^�q��H�=�y� �k��H��hH�$H�L$H�FL�AL9�w8H9�w3H�VH�N H�FH�NH�V H�W H�V(H�W(H�GH�OH��h�H�L$H�H��H�T$H�H��	 H�BH�JH�Tv~ H�|$8H�jXH�GH�g  H��M��H�JH�WH�GH�5�x� �	l��UAWAVAUATSH��xL�D$@I��H�T$ I��H�<$H�\$\H��H���{  �+�CH�D$��{u4�\$eM���  L���/�����uL���������tjA^�BA���   D��jA^L���t����   I�UH�D$ H�x8H�p@�5���HcH����  H�� L	�M�l$ H�l$HH��H��L���  �} uH�t$PH�<$�f  �l$LI�D$L9�ufM��L�t$ �j  I�t$I�]�H9���  I�D$D�$L��L����D���]�����Y  L���  A���   ��   jA^H�\$�Y���I��I�L$H�L$M�d$I���  H�L$0L��I���  H�L$8H�D$    L�t$ M9��  I��H�D$B�(H��L�����������v����Ձ�   rM��r����  ��s7��  I�VPI�NXH�|$0H�t$8A��E1������D$I�EH�D$(jXH�D$L��M9���   I��L;l$@�d���H�$H�` H�    ��   I���  H�L$H9�h  vMHk�J�(H���)���L��L�����x������   A��E1���rZ�A����rOA����   E1��dI���  ������������H��tiH�L$D�d�H��H��L����D�������t}H���YI��   y         ���           ��          ��           ��          0��          @��          P��          `��        	  p��        
  ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���           ���        !  ���        "   ��        #  ��        $   ��        %  0��        &  @��        '  P��        (  `��        )  p��        *  ���        +  ���        ,  ���        -  ���        .  ���        /  ���        0  ���        1  ���        2   ��        3  ��        4   ��        5  0��        6  @��        7  P��        8  `��        9  p��        :  ���        ;  ���        <  ���        =  ���        >  ���        ?  ���        @  ���        A  ���    �   B ]�H���  H�T$H9�h  vGHk�J� H���C���H�|$(L��D�������tVH������H�\$H���Om��H�CH�   �H���  �,���A������A������   A��s��H��������A������   �D$0��   E1�H�l$@H�L$�D$$�   H�D$H�  �H�L$0��LEd$@H��H�D$H�L�`�L$$�H�����C�<'L���n��������I�VPI�NXE1�H�|$8H�t$E1������H���&I�VPI�NXE1�H�|$8H�t$E1�������jA^L��H�L$L�1H�i�A����H�|$hH�D$(H�L�w��H�T$D������I��E��I�� �����H�7p� L��H���d��H�FH�N H9�sH�V�
H9��GH��W	H��SH����uH�� �s1��B�F���jYCȅ�tH��H�� ��u��H���m����H���F����	����赳��H�CjX�[�SH��H���qk��H�C   H�CH�   [�UAWAVAUATSH��(M��M��I��I��H��H��H�FH���  uf���   t]H��8  H�q H�I9�sJH��h  ueW�I��A) H�|$jAYH��L��L���/���H�D$�8 ��   H�D$H�CjX�   H��H��L��L��M��M��H��([A\A]A^A_]����H�|$��[��H�L$H�AH�IH��H��H��L��I��L��I��I��跩��H���8 t<H�D$H�C�   �VL�d$H��L���  H��L��L��H��誹��L�c1���8L�d$L��H��L���  H��L��L��H���|���L�c�# H�|$L���L H��([A\A]A^A_]�H�G0H��P  H��tLH�GH��H�? �    HE�   x     �?      ��  .�    }            ..�    �}           
 applicator     ��           	 code.d.ts     w�            code.js     ��            code.js.map�    N�            core�    P�            discriminator     ��   
 	        draft2020.d.ts      �    
        draft2020.js     %�            draft2020.js.map     ��   
         draft7.d.ts     �           	 draft7.js     .�            draft7.js.map�    �            dynamic     ?�   
         errors.d.ts     �           	 errors.js     ��            errors.js.map�    �            format�    ��            jtd     ��   
         metadata.d.ts     L�            metadata.js     �            metadata.js.map     �   
        	 next.d.ts     ��            next.js     �            next.js.map�    ��            unevaluated�    x�           
 validationL��L��L��L���  I�E H��tI�t{H�T$�L$ @��tVL�$$H��L��I��M�������ZL�l$L��L��L��L���L  I�E H��uH�D$H�CH�   �(�t H�T$�L$ �D$$H�   H�S�K�C�H�# H��([A\A]A^A_]�UAWAVAUATSH��(I��I��I��H��H���  ���   tP@���  L�l$L��L��L��L���   I�E H��tI�t{H�T$�L$ @��tVL�$$H��L��I��M���4����ZL�l$L��L��L��L���S   I�E H��uH�D$H�CH�   �(�t H�T$�L$ �D$$H�   H�S�K�C�H�# H��([A\A]A^A_]�UAWAVAUATSH��   I��H�AL�i L9�v	I�& �Z  H��I��H�$H�D$�y( tdL�|$\L��H���9���A�A�_�A��L$��   �D$eH�D$ M��$�  L���������uyL��H�t$ �˯����thjYH�\$ �r  H�\$\H��H��������3�CH�D$ ��{L�t$�t$u{�\$eM��$�  L��������uVL�����l�����tHjA^�   H�D$ A���   �L$D��L�����w  ����   A��$�   �B  j��  A���   �t$jA^D��L����t����   I�WH�$H�x8H�p@�@���HcH��� 	  H�� L	�L�|$HL��H��L������A�?u
H�D$P��  �\$LH�D$L9�uTH��L�t$��  L��L�<$L�����������  1��  I�W�  A��$�   ��  jA^H�\$ �t���I��H�<$L���.���H�t$L�uI��I��j�XLB�H�EH�D$I��$�  H�D$@I��$�  H�D$8H�D$     �����v,H�,$H��L���8���L;l$�b  C�.L��H�����   H�$H�H I��L��L�hI9���   A�TA���  ��H׋ ���           ��          ��           ��          0��          @��          P��          `��          p��        	  ���        
  ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���           ���        !   ��        "  ��        #   ��        $  0��        %  @��        &  P��        '  `��        (  p��        )  ���        *  ���        +  ���        ,  ���        -  ���        .  ���        /  ���        0  ���        1   ��        2  ��        3   ��        4  0��        5  @��        6  P��        7  `��        8  p��        9  ���        :  ���        ;  ���        <  ���        =  ���        >  ���        ?  ���        @  ���        A  ���    �   B orm (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  Root: () => Slot,
  Slot: () => Slot,
  Slottable: () => Slottable,
  createSlot: () => createSlot,
  createSlottable: () => createSlottable
});
module.exports = __toCommonJS(index_exports);

// src/slot.tsx
var React = __toESM(require("react"));
var import_react_compose_refs = require("@radix-ui/react-compose-refs");
var import_jsx_runtime = require("react/jsx-runtime");
// @__NO_SIDE_EFFECTS__
function createSlot(ownerName) {
  const SlotClone = /* @__PURE__ */ createSlotClone(ownerName);
  const Slot2 = React.forwardRef((props, forwardedRef) => {
    const { children, ...sl   x              .�    ��            ..      �            source-map.debug.js     ��            source-map.js     }�            source-map.min.js     ҉            source-map.min.js.map newChildren = childrenArray.map((child) => {
        if (child === slottable) {
          if (React.Children.count(newElement) > 1) return React.Children.only(null);
          return React.isValidElement(newElement) ? newElement.props.children : null;
        } else {
          return child;
        }
      });
      return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SlotClone, { ...slotProps, ref: forwardedRef, children: React.isValidElement(newElement) ? React.cloneElement(newElement, void 0, newChildren) : null });
    }
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SlotClone, { ...slotProps, ref: forwardedRef, children });
  });
  Slot2.displayName = `${ownerName}.Slot`;
  return Slot2;
}
var Slot = /* @__PURE__ */ createSlot("Slot");
// @__NO_SIDE_EFFECTS__
function createSlotClone(ownerName) {
  const SlotClone = React.forwardRef((props, forwardedRef) => {
    const { children, ...slotPropst) */
    onfullscreenchange: ((this: Element, ev: Event) => any) | null;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/fullscreenerror_event) */
    onfullscreenerror: ((this: Element, ev: Event) => any) | null;
    /**
     * The **`outerHTML`** attribute of the Element DOM interface gets the serialized HTML fragment describing the element including its descendants.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/outerHTML)
     */
    outerHTML: string;
    readonly ownerDocument: Document;
    /**
     * The **`part`** property of the Element interface represents the part identifier(s) of the element (i.e., set using the `part` attribute), returned as a DOMTokenList.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/part)
     */
    get part(): DOMTokenList;
    set part(value: string);
    /**
     * T ��          ��           ��          0��          @��          P��          `��          p��          ���        	  ���        
  ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���            ��        !  ��        "   ��        #  0��        $  @��        %  P��        &  `��        '  p��        (  ���        )  ���        *  ���        +  ���        ,  ���        -  ���        .  ���        /  ���        0   ��        1  ��        2   ��        3  0��        4  @��        5  P��        6  `��        7  p��        8  ���        9  ���        :  ���        ;  ���        <  ���        =  ���        >  ���        ?  ���        @   ��        A   ��    �   B mRlc3Ryb3koKSB7XG4gIGNvbnN0IHIgPSB0aGlzLl9yZWFkYWJsZVN0YXRlXG4gIGNvbnN0IHcgPSB0aGlzLl93cml0YWJsZVN0YXRlXG4gIGlmIChyKSB7XG4gICAgci5jb25zdHJ1Y3RlZCA9IHRydWVcbiAgICByLmNsb3NlZCA9IGZhbHNlXG4gICAgci5jbG9zZUVtaXR0ZWQgPSBmYWxzZVxuICAgIHIuZGVzdHJveWVkID0gZmFsc2VcbiAgICByLmVycm9yZWQgPSBudWxsXG4gICAgci5lcnJvckVtaXR0ZWQgPSBmYWxzZVxuICAgIHIucmVhZGluZyA9IGZhbHNlXG4gICAgci5lbmRlZCA9IHIucmVhZGFibGUgPT09IGZhbHNlXG4gICAgci5lbmRFbWl0dGVkID0gci5yZWFkYWJsZSA9PT0gZmFsc2VcbiAgfVxuICBpZiAodykge1xuICAgIHcuY29uc3RydWN0ZWQgPSB0cnVlXG4gICAgdy5kZXN0cm95ZWQgPSBmYWxzZVxuICAgIHcuY2xvc2VkID0gZmFsc2VcbiAgICB3LmNsb3NlRW1pdHRlZCA9IGZhbHNlXG4gICAgdy5lcnJvcmVkID0gbnVsbFxuICAgIHcuZXJyb3JFbWl0dGVkID0gZmFsc2VcbiAgICB3LmZpbmFsQ2FsbGVkID0gZmFsc2VcbiAgICB3LnByZWZpbmlzaGVkID0gZmFsc2VcbiAgICB3LmVuZGVkID0gdy53cml0YWJsZSA9PT0gZmFsc2VcbiAgICB3LmVuZGluZyA9IHcud3JpdGFibGUgPT09IGZhbHNlXG4gICAgdy5maW5pc2hlZCA9IHcud3JpdGFibGUgPT09IGZhbHNlXG4gIH1cbn1cbmZ1bmN0aW9uIGVycm9yT3JEZXN0cm95KHN0cmVhbSwgZXJyLCBzeW5jKSB7XG4gIC8vIFdlIGhhdmUgd        �      �� nds.js +             ..�    Z+             config�    �@             errors�    /A             gensync-utils     "B             index.js     WB             index.js.map     �B             parse.js     �B     	        parse.js.map�    �B     
        parser�    'C             tools     �C             transform-ast.js     �C             transform-ast.js.map     �C             transform-file-browser.js     �C             transform-file-browser.js.map     �C             transform-file.js     �C             transform-file.js.map     �C             transform.js     �C             transform.js.map�    �C             transformation�    F             vendorc3Ryb3kpKVxuICAgIHN0cmVhbS5kZXN0cm95KGVycilcbiAgZWxzZSBpZiAoZXJyKSB7XG4gICAgLy8gQXZvaWQgVjggbGVhaywgaHR0cHM6Ly9naXRodWIuY29tL25vZGVqcy9ub2RlL3B1bGwvMzQxMDMjaXNzdWVjb21tZW50LTY1MjAwMjM2NFxuICAgIGVyci5zdGFjayAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXVudXNlZC1leHByZXNzaW9uc1xuXG4gICAgaWYgKHcgJiYgIXcuZXJyb3JlZCkge1xuICAgICAgdy5lcnJvcmVkID0gZXJyXG4gICAgfVxuICAgIGlmIChyICYmICFyLmVycm9yZWQpIHtcbiAgICAgIHIuZXJyb3JlZCA9IGVyclxuICAgIH1cbiAgICBpZiAoc3luYykge1xuICAgICAgcHJvY2Vzcy5uZXh0VGljayhlbWl0RXJyb3JOVCwgc3RyZWFtLCBlcnIpXG4gICAgfSBlbHNlIHtcbiAgICAgIGVtaXRFcnJvck5UKHN0cmVhbSwgZXJyKVxuICAgIH1cbiAgfVxufVxuZnVuY3Rpb24gY29uc3RydWN0KHN0cmVhbSwgY2IpIHtcbiAgaWYgKHR5cGVvZiBzdHJlYW0uX2NvbnN0cnVjdCAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVyblxuICB9XG4gIGNvbnN0IHIgPSBzdHJlYW0uX3JlYWRhYmxlU3RhdGVcbiAgY29uc3QgdyA9IHN0cmVhbS5fd3JpdGFibGVTdGF0ZVxuICBpZiAocikge1xuICAgIHIuY29uc3RydWN0ZWQgPSBmYWxzZVxuICB9XG4gIGlmICh3KSB7XG4gICAgdy5jb25zdHJ1Y3RlZCA9IGZhbHNlXG4gIH1cbiAgc3RyZWFtLeclaration.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/computedStyleMap)
     */
    computedStyleMap(): StylePropertyMapReadOnly;
    /**
     * The **`getAttribute()`** method of the element.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/getAttribute)
     */
 �     �      �    �&     �A                                               ��j    (c1    ��j    (c1    ��j    (c1                                     ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��           ��        !   ��        "  0��        #  @��        $  P��        %  `��        &  p��        '  ���        (  ���        )  ���        *  ���        +  ���        ,  ���        -  ���        .  ���        /   ��        0  ��        1   ��        2  0��        3  @��        4  P��        5  `��        6  p��        7  ���        8  ���        9  ���        :  ���        ;  ���        <  ���        =  ���        >  ���        ?   ��        @  ��        A  ��    �   B CAgc3RyZWFtLl9jb25zdHJ1Y3QoKGVycikgPT4ge1xuICAgICAgcHJvY2Vzcy5uZXh0VGljayhvbkNvbnN0cnVjdCwgZXJyKVxuICAgIH0pXG4gIH0gY2F0Y2ggKGVycikge1xuICAgIHByb2Nlc3MubmV4dFRpY2sob25Db25zdHJ1Y3QsIGVycilcbiAgfVxufVxuZnVuY3Rpb24gZW1pdENvbnN0cnVjdE5UKHN0cmVhbSkge1xuICBzdHJlYW0uZW1pdChrQ29uc3RydWN0KVxufVxuZnVuY3Rpb24gaXNSZXF1ZXN0KHN0cmVhbSkge1xuICByZXR1cm4gKHN0cmVhbSA9PT0gbnVsbCB8fCBzdHJlYW0gPT09IHVuZGVmaW5lZCA/IHVuZGVmaW5lZCA6IHN0cmVhbS5zZXRIZWFkZXIpICYmIHR5cGVvZiBzdHJlYW0uYWJvcnQgPT09ICdmdW5jdGlvbidcbn1cbmZ1bmN0aW9uIGVtaXRDbG9zZUxlZ2FjeShzdHJlYW0pIHtcbiAgc3RyZWFtLmVtaXQoJ2Nsb3NlJylcbn1cbmZ1bmN0aW9uIGVtaXRFcnJvckNsb3NlTGVnYWN5KHN0cmVhbSwgZXJyKSB7XG4gIHN0cmVhbS5lbWl0KCdlcnJvcicsIGVycilcbiAgcHJvY2Vzcy5uZXh0VGljayhlbWl0Q2xvc2VMZWdhY3ksIHN0cmVhbSlcbn1cblxuLy8gTm9ybWFsaXplIGRlc3Ryb3kgZm9yIGxlZ2FjeS5cbmZ1bmN0aW9uIGRlc3Ryb3llcihzdHJlYW0sIGVycikge1xuICBpZiAoIXN0cmVhbSB8fCBpc0Rlc3Ryb3llZChzdHJlYW0pKSB7XG4gICAgcmV0dXJuXG4gIH1cbiAgaWYgKCFlcnIgJiYgIWlzRmluaXNoZWQoc3RyZWFtKSkge1xuICAgIGVyciA9IG5ldyBBYm9ydEVyc        �      distn.tsp-segment.d.mts.maplcXVlc3QgYnJhbmNoZXMuXG4gIGlmIChpc1NlcnZlclJlcXVlc3Qoc3RyZWFtKSkge1xuICAgIHN0cmVhbS5zb2NrZXQgPSBudWxsXG4gICAgc3RyZWFtLmRlc3Ryb3koZXJyKVxuICB9IGVsc2UgaWYgKGlzUmVxdWVzdChzdHJlYW0pKSB7XG4gICAgc3RyZWFtLmFib3J0KClcbiAgfSBlbHNlIGlmIChpc1JlcXVlc3Qoc3RyZWFtLnJlcSkpIHtcbiAgICBzdHJlYW0ucmVxLmFib3J0KClcbiAgfSBlbHNlIGlmICh0eXBlb2Ygc3RyZWFtLmRlc3Ryb3kgPT09ICdmdW5jdGlvbicpIHtcbiAgICBzdHJlYW0uZGVzdHJveShlcnIpXG4gIH0gZWxzZSBpZiAodHlwZW9mIHN0cmVhbS5jbG9zZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIC8vIFRPRE86IERvbid0IGxvc2UgZXJyP1xuICAgIHN0cmVhbS5jbG9zZSgpXG4gIH0gZWxzZSBpZiAoZXJyKSB7XG4gICAgcHJvY2Vzcy5uZXh0VGljayhlbWl0RXJyb3JDbG9zZUxlZ2FjeSwgc3RyZWFtLCBlcnIpXG4gIH0gZWxzZSB7XG4gICAgcHJvY2Vzcy5uZXh0VGljayhlbWl0Q2xvc2VMZWdhY3ksIHN0cmVhbSlcbiAgfVxuICBpZiAoIXN0cmVhbS5kZXN0cm95ZWQpIHtcbiAgICBzdHJlYW1ba0lzRGVzdHJveWVkXSA9IHRydWVcbiAgfVxufVxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGNvbnN0cnVjdCxcbiAgZGVzdHJveWVyLFxuICBkZXN0cm95LFxuICB1bmRlc3Ryb3ksXG4gIGVycm9yT3JEZXN0cm95XG59XG4iLCIndXNlIHN0cmljdCdcblxuY29uc3QgeyBBcnJheUlzQXJyYXksIE9iamVjdFNldFByb3RvdHlwZU9mIH0gPSByZXF1aXJlKCcuLi8uLi9vdXJzL3ByaW1vcmRpYWxzJylcbmNvbnN0IHsgRXZlbnRFbWl0dGVyOiBFRSB9ID0gcmVxdWlyZSgnZXZlbnRzJylcbmZ1bmN0aW9uIFN0cmVhbShvcHRzKSB7XG4gIEVFLmNhbGwodGhpcywgb3B0cylcbn1cbk9iamVjdFNldFByb3RvdHlwZU9mKFN0cmVhbS5wcm90b3R5cGUsIEVFLnByb3RvdHlwZSlcbk9iamVjdFNldFByb3RvdHlwZU9mKFN0cmVhbSwgRUUpXG5TdHJlYW0ucHJvdG90eXBlLnBpcGUgPSBmdW5jdGlvbiAoZGVzdCwgb3B0aW9ucykge1xuICBjb25zdCBzb3VyY2UgPSB0aGlzXG4gIGZ1bmN0aW9uIG9uZGF0YShjaHVuaykge1xuICAgIGlmIChkZXN0LndyaXRhYmxlICYmIGRlc3Qud3JpdGUoY2h1bmspID09PSBmYWxzZSAmJiBzb3VyY2UucGF1c2UpIHtcbiAgICAgIHNvdXJjZS5wYXVzZSgpXG4gICAgfVxuICB9XG4gIHNvdXJjZS5vbignZGF0YScsIG9uZGF0YSlcbiAgZnVuY3Rpb24gb25kcmFpbigpIHtcbiAgICBpZiAoc291cmNlLnJlYWRhYmxlICYmIHNvdXJjZS5yZXN1bWUpIHtcbiAgICAgIHNvdXJjZS5yZXN1bWUoKVxuICAgIH1cbiAgfVxuICBkZXN0Lm9uKCdkcmFpbicsIG9uZHJhaW4pXG5cbiAgLy8gSWYgdGhlICdlbmQnIG9wdGlvbiBpcyBub3Qgc3VwcGxpZWQsIGRlc3QuZW5kKCkgd2lsbCBiZSBjYWxsZWQgd2hlblxuICAvLyBzb3VyY2UgZ2V0cyB0aGUgJ2VuZCcgb3IgJ2Nsb3NlJyBldmVudHMuICBPbmx5IGRlc3QuZ�     �      �    �     �A                                               ��j    ���    ߔj    P>	    ߔj    P>	                                     ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��            ��        !  0��        "  @��        #  P��        $  `��        %  p��        &  ���        '  ���        (  ���        )  ���        *  ���        +  ���        ,  ���        -  ���        .   ��        /  ��        0   ��        1  0��        2  @��        3  P��        4  `��        5  p��        6  ���        7  ���        8  ���        9  ���        :  ���        ;  ���        <  ���        =  ���        >   ��        ?  ��        @   ��        A   ��    �   B ase {
  code: typeof ZodIssueCod      );
      return;
    }

    if (knownTypeNames[typeName]) {
      context.reportError(
        new _GraphQLError.GraphQLError(
          `There can be only one type named "${typeName}".`,
          {
            nodes: [knownTypeNames[typeName], node.name],
          },
        ),
      );
    } else {
      knowCAgIHNvdXJjZS5yZW1vdmVMaXN0ZW5lcignY2xvc2UnLCBjbGVhbnVwKVxuICAgIGRlc3QucmVtb3ZlTGlzdGVuZXIoJ2Nsb3NlJywgY2xlYW51cClcbiAgfVxuICBzb3VyY2Uub24oJ2VuZCcsIGNsZWFudXApXG4gIHNvdXJjZS5vbignY2xvc2UnLCBjbGVhbnVwKVxuICBkZXN0Lm9uKCdjbG9zZScsIGNsZWFudXApXG4gIGRlc3QuZW1pdCgncGlwZScsIHNvdXJjZSlcblxuICAvLyBBbGxvdyBmb3IgdW5peC1saWtlIHVzYWdlOiBBLnBpcGUoQikucGlwZShDKVxuICByZXR1cm4gZGVzdFxufVxuZnVuY3Rpb24gcHJlcGVuZExpc3RlbmVyKGVtaXR0ZXIsIGV2ZW50LCBmbikge1xuICAvLyBTYWRseSB0aGlzIGlzIG5vdCBjYWNoZWFibGUgYXMgc29tZSBsaWJyYXJpZXMgYnVuZGxlIHRoZWlyIG93blxuICAvLyBldmVudCBlbWl0dGVyIGltcGxlbWVudGF0aW9uIHdpdGggdGhlbS5cbiAgaWYgKHR5cGVvZiBlbWl0dGVyLnByZXBlbmRMaXN0ZW5lc   x     
       ��  .�    �A             ..     �A             add.js     �I             bitwiseAND.js     
J             bitwiseNOT.js     |J             bitwiseOR.js     �J             bitwiseXOR.js     �U            	 divide.js     qV     	        equal.js     ?W     
        exponentiate.js     p\             index.js     �{             leftShift.js     �{             lessThan.js     ��             multiply.js     �             remainder.js     ��             sameValue.js     3�             sameValueZero.js     ��             signedRightShift.js     ��             subtract.js     ��             toString.js     m�             unaryMinus.js     ��             unsignedRightShift.jslid_enum_value;
  options: (string | number)[];
}

export interface ZodInvalidArgumentsIssue extends ZodIssueBase {
  code: typeof ZodIssueCode.invalid_arguments;
  argumentsError: ZodError;
}

export interface ZodInvalidReturnTypeIssue extends ZodIssueBase {
  code: typeof ZodIssueCode.invalid_return_type;
  returnTypeError: ZodError;
}

export interface ZodInvalidDateIssue extends ZodIssueBase {
  code: typeof ZodIssueCode.invalid_date;
}

export type StringValidation =
  | "email"
  | "url"
  | "emoji"
  | "uuid"
  | "nanoid"
  | "regex"
  | "cuid"
  | "cuid2"
  | "ulid"
  | "datetime"
  | "date"
  | "time"
  | "duration"
  | "ip"
  | "cidr"
  | "base64"
  | "jwt"
  | "base64url"
  | { includes: string; position?: number | undefined }
  | { startsWith: string }
  | { endsWith: string };

export interface ZodInvalidStringIssue extends ZodIssueBase {
  code: typeof ZodIssueCode.invalid_string;
  validation: StringValidation;
}

export interface ZodTooSmallIssue extends ZodIssueBase {
  code: typeof ZodIssueCode.too_small;
  minimum: number | bigint;
  inclusive: boolean;
  exact?: boolean;
  type: "array" | "string" | "number" | "set" | "date" | "bigint";
}

export interface ZodTooBigIssShzdHJlYW0pICYmICFpc1dlYlN0cmVhbShzdHJlYW0pKSB7XG4gICAgdGhyb3cgb 8��          @��          P��          `��          p��          ���          ���          ���          ���        	  ���        
  ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��           0��        !  @��        "  P��        #  `��        $  p��        %  ���        &  ���        '  ���        (  ���        )  ���        *  ���        +  ���        ,  ���        -   ��        .  ��        /   ��        0  0��        1  @��        2  P��        3  `��        4  p��        5  ���        6  ���        7  ���        8  ���        9  ���        :  ���        ;  ���        <  ���        =   ��        >  ��        ?   ��        @  0��        A  0��    �   B GlsJykuYWRkQWJvcnRMaXN0ZW5lclxuICAgIGNvbnN0IGRpc3Bvc2FibGUgPSBhZGRBYm9ydExpc3RlbmVyKHNpZ25hbCwgb25BYm9ydClcbiAgICBlb3Moc3RyZWFtLCBkaXNwb3NhYmxlW1N5bWJvbERpc3Bvc2VdKVxuICB9XG4gIHJldHVybiBzdHJlYW1cbn1cbiIsIid1c2Ugc3RyaWN0J1xuXG5jb25zdCB7IFN0cmluZ1Byb3RvdHlwZVNsaWNlLCBTeW1ib2xJdGVyYXRvciwgVHlwZWRBcnJheVByb3RvdHlwZVNldCwgVWludDhBcnJheSB9ID0gcmVxdWlyZSgnLi4vLi4vb3Vycy9wcmltb3JkaWFscycpXG5jb25zdCB7IEJ1ZmZlciB9ID0gcmVxdWlyZSgnYnVmZmVyJylcbmNvbnN0IHsgaW5zcGVjdCB9ID0gcmVxdWlyZSgnLi4vLi4vb3Vycy91dGlsJylcbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgQnVmZmVyTGlzdCB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuaGVhZCA9IG51bGxcbiAgICB0aGlzLnRhaWwgPSBudWxsXG4gICAgdGhpcy5sZW5ndGggPSAwXG4gIH1cbiAgcHVzaCh2KSB7XG4gICAgY29uc3QgZW50cnkgPSB7XG4gICAgICBkYXRhOiB2LFxuICAgICAgbmV4dDogbnVsbFxuICAgIH1cbiAgICBpZiAodGhpcy5sZW5ndGggPiAwKSB0aGlzLnRhaWwubmV4dCA9IGVudHJ5XG4gICAgZWxzZSB0aGlzLmhlYWQgPSBlbnRyeVxuICAgIHRoaXMudGFpbCA9IGVudHJ5XG4gICAgKyt0aGlzLmxlbmd0aFxuICB9XG4gIHVuc2hpZnQodikge1xuICAgIGNvbnN0IGVudHJ5ID0ge1xuICAgICAgZ   n          api proto  o+            ..     �+            FUNDING.ymlpIHRoaXMudGFpbCA9IGVudHJ5XG4gICAgdGhpcy5oZWFkID0gZW50cnlcbiAgICArK3RoaXMubGVuZ3RoXG4gIH1cbiAgc2hpZnQoKSB7XG4gICAgaWYgKHRoaXMubGVuZ3RoID09PSAwKSByZXR1cm5cbiAgICBjb25zdCByZXQgPSB0aGlzLmhlYWQuZGF0YVxuICAgIGlmICh0aGlzLmxlbmd0aCA9PT0gMSkgdGhpcy5oZWFkID0gdGhpcy50YWlsID0gbnVsbFxuICAgIGVsc2UgdGhpcy5oZWFkID0gdGhpcy5oZWFkLm5leHRcbiAgICAtLXRoaXMubGVuZ3RoXG4gICAgcmV0dXJuIHJldFxuICB9XG4gIGNsZWFyKCkge1xuICAgIHRoaXMuaGVhZCA9IHRoaXMudGFpbCA9IG51bGxcbiAgICB0aGlzLmxlbmd0aCA9IDBcbiAgfVxuICBqb2luKHMpIHtcbiAgICBpZiAodGhpcy5sZW5ndGggPT09IDApIHJldHVybiAnJ1xuICAgIGxldCBwID0gdGhpcy5oZWFkXG4gICAgbGV0IHJldCA9ICcnICsgcC5kYXRhXG4gICAgd2hpbGUgKChwID0gcC5uZXh0KSAhPT0gbnVsbCkgcmV0ICs9IHMgKyBwLmRhdGFcbiAgICByZXR1cm4gcmV0XG4gIH1cbiAgY29uY2F0KG4pIHtcbiAgICBpZiAodGhpcy5sZW5ndGggPT09IDApIHJldHVybiBCdWZmZXIuYWxsb2MoMClcbiAgICBjb25zdCByZXQgPSBCdWZmZXIuYWxsb2NVbnNhZmUobiA+Pj4gMClcbiAgICBsZXQgcCA9IHRoaXMuaGVhZFxuICAgIGxldCBpID0gMFxuICAgIHdoaWxlIChwKSB7XG4gICAgICBUeXBlZEFycmF5UHJvdG90eXBlU2V0KHJldCwgcC5kYXRhLCBpKVxuICAgICAgaSArPSBwLmRhdGEubGVuZ3RoXG4gICAgICBwID0gcC5uZXh0XG4gICAgfVxuICAgIHJldHVybiByZXRcbiAgfVxuXG4gIC8vIENvbnN1bWVzIGEgc3BlY2lmaWVkIGFtb3VudCBvZiBieXRlcyBvciBjaGFyYWN0ZXJzIGZyb20gdGhlIGJ1ZmZlcmVkIGRhdGEuXG4gIGNvbnN1bWUobiwgaGFzU3RyaW5ncykge1xuICAgIGNvbnN0IGRhdGEgPSB0aGlzLmhlYWQuZGF0YVxuICAgIGlmIChuIDwgZGF0YS5sZW5ndGgpIHtcbiAgICAgIC8vIGBzbGljZWAgaXMgdGhlIHNhbWUgZm9yIGJ1ZmZlcnMgYW5kIHN0cmluZ3MuXG4gICAgICBjb25zdCBzbGljZSA9IGRhdGEuc2xpY2UoMCwgbilcbiAgICAgIHRoaXMuaGVhZC5kYXRhID0gZGF0YS5zbGljZShuKVxuICAgICAgcmV0dXJuIHNsaWNlXG4gICAgfVxuICAgIGlmIChuID09PSBkYXRhLmxlbmd0aCkge1xuICAgICAgLy8gRmlyc3QgY2h1bmsgaXMgYSBwZXJmZWN0IG1hdGNoLlxuICAgICAgcmV0dXJuIHRoaXMuc2hpZnQoKVxuICAgIH1cbiAgICAvLyBSZXN1bHQgc3BhbnMgbW9yZSB0aGFuIG9uZSBidWZmZXIuXG4gICAgcmV0dXJuIGhhc1N0cmluZ3MgPyB0aGlzLl9nZXRTdHJpbmcobikgOiB0aGlzLl9nZXRCdWZmZXIobilcbiAgfVxuICBmaXJzdCgpIHtcbiAgICByZXR1cm4gdGhpcy5oZWFkLmRhdGFcbiAgfVxuICAqW1N5bWJvbEl0ZXJhdG9yXSgpIHtcbiAgICBmb3IgKGxldCBwID0gdGhpcy5oZWFkOyBwOyBwID0gcC5uZ   o   �    �             `��          p��          ���          ���          ���          ���          ���        	  ���        
  ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��           @��        !  P��        "  `��        #  p��        $  ���        %  ���        &  ���        '  ���        (  ���        )  ���        *  ���        +  ���        ,   ��        -  ��        .   ��        /  0��        0  @��        1  P��        2  `��        3  p��        4  ���        5  ���        6  ���        7  ���        8  ���        9  ���        :  ���        ;  ���        <   ��        =  ��        >   ��        ?  0��        @  @��        A  @��    �   B     ): void {\n      if (allowExpressionBody) {\n        this.forwardNoArrowParamsConversionAt(node, () =>\n          super.parseFunctionBody(node, true, isMeth floating element. Determines
     * whether overflow along this axis is checked to perform a flip.
     * - `true`: Whether to check cross axis overflow for both side and alignment flipping.
     * - `false`: Whether to disable all cross axis overflow checking.
     * - `'alignment'`: Whether to check cross axis overflow for alignment flipping only.
     * @default true
     */
    crossAxis?: boolean | 'alignment';
    /**
     * Placements to try sequentially if the preferred `placement` does not fit.
     * @default [oppositePlacement] (computed)
     */
    fallbackPlacements?: Array<Placement>;
    /**
     * What strategy to use when no placements fit.
     * @default 'bestFit'
     */
    fallbackStrategy?: 'bestFit' | 'initialPlacement';
    /**
     * Whether to allow fallback to the perpendi   x             .�    {            ..     �            set-cookie.d.ts     .}            set-cookie.js     N�           
 clients.js     A�   
         clients.js.map     ��            errors.d.ts     ��   
         errors.d.ts.map     ��    	       	 errors.js     ��   
 
        errors.js.map�    K�            handlers�    ݄           
 middleware     �            provider.d.ts     ��            provider.d.ts.map     ��            provider.js     ��            provider.js.map�    Ǘ           	 providers     8�            router.d.ts     $�            router.d.ts.map     �           	 router.js     �            router.js.map     �           
 types.d.ts     V8            types.d.ts.map     s�   
         types.js     |8            types.js.mapof wwwAuthenticateHeaderValue === "string" ? wwwAuthenticateHeaderValue : `${wwwAuthenticatePrefix}${Object.entries(wwwAuthenticateHeaderValue).map(([key, value]) => `${key}="${value}"`).join(",")}`
    };
    const responseMessage = typeof messageOption === "function" ? await messageOption(c) : messageOption;
    const res = typeof responseMessage === "string" ? new Response(responseMessage, { status, headers }) : new Response(JSON.stringify(responseMessage), {
      status,
      headers: {
        ...headers,
        "content-type": "application/json"
      }
    });
    throw new import_http_exception.HTTPException(status, { res });
  };
  return async function bearerAuth2(c, next) {
    const headerToken = c.req.header(options.headerName || HEADER);
    if (!headerToken) {
      await throwHTTPException(
        c,
        401,
        options.noAuthenticationHeader?.wwwAuthenticateHeader || `${wwwAuthenticatePrefix}realm="${realm}"`,
        options.noAuthenticationHeader?.message || options.noAuthenticationHeaderMessage || "Unauthorized"
      );
    } else {
      let tokenValue;
      if (prefix === "") {
        tokenValue = headerToken;
     X��          `��          p��          ���          ���          ���          ���          ���          ���        	  ���        
  ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��           P��        !  `��        "  p��        #  ���        $  ���        %  ���        &  ���        '  ���        (  ���        )  ���        *  ���        +   ��        ,  ��        -   ��        .  0��        /  @��        0  P��        1  `��        2  p��        3  ���        4  ���        5  ���        6  ���        7  ���        8  ���        9  ���        :  ���        ;   ��        <  ��        =   ��        >  0��        ?  @��        @  P��        A  P��    �   B qual({
      'content-length': '11',
      'content-type': 'text/plain',
    })
    expect(kDefaultContentType in response).toBe(true)
  })

  it('creates a text response with special characters', async () => {
    const response = HttpResponse.text('안녕 세상', { status: 201 })

    expect(response.status).toBe(201)
    expect(response.statusText).toBe('Created')
    expect(response.body).toBeInstanceOf(ReadableStream)
    await expect(response.text()).resolves.toBe('안녕 세상')
    expect(Object.fromEntries(response.headers.entries())).toEqual({
      'content-length': '13',
      'content-type': 'text/plain',
    })
  })

  it('allows overriding the "Content-Type" response header', async () => {
    const response = HttpResponse.text('hello world', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })

    expect(response.status).toBe(200)
    expect(response.statusText).toBe('OK')
    expect(response.body).toBeInstanceOf(ReadableStream)
    await    x         
 hermes-lab �#            ..     �%            FUNDING.ymlponse.headers.entries())).toEqual({
      'content-length': '11',
      'content-type': 'text/plain; charset=utf-8',
    })
    expect(kDefaultContentType in response).toBe(false)
  })

  it('allows overriding the "Content-Length" response header', async () => {
    const response = HttpResponse.text('hello world', {
      headers: { 'Content-Length': '32' },
    })

    expect(Object.fromEntries(response.headers.entries())).toEqual({
      'content-length': '32',
      'content-type': 'text/plain',
    })
  })
})

describe('HttpResponse.json()', () => {
  it('creates a json response given an object', async () => {
    const response = HttpResponse.json({ firstName: 'John' })

    expect(response.status).toBe(200)
    expect(response.statusText).toBe('OK')
    expect(response.body).toBeInstanceOf(ReadableStream)
    expect(await response.json()).toEqual({ firstName: 'John' })
    expect(Object.fromEntries(response.headers.enExpressionStatement(node, expr, decorators);\n    }\n\n    // export type\n    shouldParseExportDeclaration(): boolean {\n      const { type } = this.state;\n      if (type === tt._enum || tokenIsFlowInterfaceOrTypeOrOpaque(type)) {\n        return !this.state.containsEsc;\n      }\n      return super.shouldParseExportDeclaration();\n    }\n\n    isExportDefaultSpecifier(): boolean {\n      const { type } = this.state;\n      if (type === tt._enum || tokenIsFlowInterfaceOrTypeOrOpaque(type)) {\n        return this.state.containsEsc;\n      }\n\n      return super.isExportDefaultSpecifier();\n    }\n\n    parseExportDefaultExpression() {\n      if (this.isContextual(tt._enum)) {\n        const node = this.startNode();\n        this.next();\n        return this.flowParseEnumDeclaration(node);\n      }\n      return super.parseExportDefaultExpression();\n    }\n\n    parseConditional(\n      expr: N.Expression,\n\n      startLoc: Position,\n      refExpressionErrors?: ExpressionErrors | null,\n    ): N.Expressio h��          p��          ���          ���          ���          ���          ���          ���          ���        	  ���        
   ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��           `��        !  p��        "  ���        #  ���        $  ���        %  ���        &  ���        '  ���        (  ���        )  ���        *   ��        +  ��        ,   ��        -  0��        .  @��        /  P��        0  `��        1  p��        2  ���        3  ���        4  ���        5  ���        6  ���        7  ���        8  ���        9  ���        :   ��        ;  ��        <   ��        =  0��        >  @��        ?  P��        @  `��        A  `��    �   B -length': '7',
      'content-type': 'application/json',
    })
  })

  it('creates a json response given a plain string', async () => {
    const response = HttpResponse.json(`"hello"`)

    expect(response.status).toBe(200)
    expect(response.statusText).toBe('OK')
    expect(response.body).toBeInstanceOf(ReadableStream)
    expect(await response.json()).toBe(`"hello"`)
    expect(Object.fromEntries(response.headers.entries())).toEqual({
      'content-length': '11',
     nsequent());\n          [valid, invalid] = this.getArrowLikeExpressions(consequent);\n        }\n\n        if (failed && valid.length > 1) {\n          // if there are two or more possible correct ways of parsing, throw an\n          // error.\n          // e.g.   Source: a ? (b): c => (d): e => f\n          //      Result 1: a ? b : (c => ((d): e => f))\n          //      Result 2: a ? ((b): c => d) : (e => f)\n          this.raise(FlowErrors.AmbiguousConditionalArrow, state.startLoc);\n        }\n\n         x              .�                 ..     G,            maxArrayLength.d.ts     d"            maxArrayLength.js     X,            maxSafeInteger.d.ts     }#            maxSafeInteger.js     g,            maxValue.d.ts     �$            maxValue.jsconsequent, true);\n\n      this.state.noArrowAt = originalNoArrowAt;\n      this.expect(tt.colon);\n\n      node.test = expr;\n      node.consequent = consequent;\n      node.alternate = this.forwardNoArrowParamsConversionAt(node, () =>\n        this.parseMaybeAssign(undefined, undefined),\n      );\n\n      return this.finishNode(node, \"ConditionalExpression\");\n    }\n\n    tryParseConditionalConsequent(): {\n      consequent: N.Expression;\n      failed: boolean;\n    } {\n      this.state.noArrowParamsConversionAt.push(this.state.start);\n\n      const consequent = this.parseMaybeAssignAllowIn();\n      const failed = !this.match(tt.colon);\n\n      this.state.noArrowParamsConversionAt.pop();\n\n      return { consequent, failed };\n    }\n\n    // Given an expression, walks through out its arrow functions whose body is\n    // an expression and through out conditional expressions. It returns every\n    // function which has been parsed with a return type but could have been\n    // parenthesized expressions.\n    // These functions are separated into two arrays: one containing the ones\n    // whose parameters can be converted to assignable lists, one containing the\n    // others.\n    getArrowLikeExpressions(\n      node: N.Expression,\n      disallowInvalid?: boolean,\n    ): [N.ArrowFunctionExpression[], N.ArrowFunctionExpression[]] {\n      const stack = [node];\n      const arrows: N.ArrowFunctionExpression[] = [];\n\n      while (stack.length !== 0) {\n        const node = stack.pop()!;\n        if (\n          node.type === \"ArrowFunctionExpression\" &&\n          node.body.type !== \"BlockStatement\"\n        ) {\n          if (node.typeParameters || !node.returnType) {\n            // This is an arrow express   y         ���          ���          ���          ���          ���          ���          ���          ���        	   ��        
  ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��           p��        !  ���        "  ���        #  ���        $  ���        %  ���        &  ���        '  ���        (  ���        )   ��        *  ��        +   ��        ,  0��        -  @��        .  P��        /  `��        0  p��        1  ���        2  ���        3  ���        4  ���        5  ���        6  ���        7  ���        8  ���        9   ��        :  ��        ;   ��        <  0��        =  @��        >  P��        ?  `��        @  p��        A  p��    �   B _`new RegExp`

export function usePattern({gen, it: {opts}}: KeywordCxt, pattern: string): Name {
  const u = opts.unicodeRegExp ? "u" : ""
  const {regExp} = opts.code
  const rx = regExp(pattern, u)

  return gen.scopeValue("pattern", {
    key: rx.toString(),
    ref: rx,
    code: _`${regExp.code === "new RegExp" ? newRegExp : useFunc(gen, regExp)}(${pattern}, ${u})`,
  })
}

export function validateArray(cxt: KeywordCxt): Name {
  const {gen, data, keyword, it} = cxt
  const valid = gen.name("valid")
  if (it.allErrors) {
    const validArr = gen.let("valid", true)
    validateItems(() => gen.assign(validArr, false))
    return validArr
  }
  gen.var(valid, true)
  validateItems(() => gen.break())
  return valid

  function validateItems(notValid: () => void): void {
    const len = gen.const("len", _`${data}.length`)
    gen.forRange("i", 0, len, (i) => {
      cxt.subschema(
        {
          keyword,
          dataProp: i,
          dataPropType: Type.Num,
        },
   n          app hubll.js.ts(not(valid), notValid)
    })
  }
}

export function validateUnion(cxt: KeywordCxt): void {
  const {gen, schema, keyword, it} = cxt
  /* istanbul ignore if */
  if (!Array.isArray(schema)) throw new Error("ajv implementation error")
  const alwaysValid = schema.some((sch: AnySchema) => alwaysValidSchema(it, sch))
  if (alwaysValid && !it.opts.unevaluated) return

  const valid = gen.let("valid", false)
  const schValid = gen.name("_valid")

  gen.block(() =>
    schema.forEach((_sch: AnySchema, i: number) => {
      const schCxt = cxt.subschema(
        {
          keyword,
          schemaProp: i,
          compositeRule: true,
        },
        schValid
      )
      gen.assign(valid, _`${valid} || ${schValid}`)
      const merged = cxt.mergeValidEvaluated(schCxt, schValid)
      // can short-circuit if `unevaluatedProperties/Items` not supported (opts.unevaluated !== true)
      // or if all properties and items were evaluated (it.props === true && it.items === true)
      if (!merged) gen.if(not(valid))
    })
  )

  cxt.result(
    valid,
    () => cxt.reset(),
    () => cxt.error(true)
  )
}
pe.send" call.
    return super.send(...args)
  }
}
```

> The request interception algorithms differ dramatically based on the request API. Interceptors accommodate for them all, bringing the intercepted requests to a common ground—the Fetch API `Request` instance. The same applies for responses, where a Fetch API `Response` instance is translated to the appropriate response format.

This library aims to provide _full specification compliance_ with the APIs and protocols it extends.

## What this library does

This library extends the following native modules:

- `http.get`/`http.request`
- `https.get`/`https.request`
- `XMLHttpRequest`
- `fetch`
- `WebSocket`

Once extended, it intercepts and normalizes all requests to the Fetch API `Request` instances. This way, no matter the request source (`http.ClientRequest`, `XMLHttpRequest`, `window.Request`, etc), you always get a specific   o   �    $    a     �A                                               �j    |��&    ��j    ��f;    ��j    ��f;                                      ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��           ���        !  ���        "  ���        #  ���        $  ���        %  ���        &  ���        '  ���        (   ��        )  ��        *   ��        +  0��        ,  @��        -  P��        .  `��        /  p��        0  ���        1  ���        2  ���        3  ���        4  ���        5  ���        6  ���        7  ���        8   ��        9  ��        :   ��        ;  0��        <  @��        =  P��        >  `��        ?  p��        @  ���        A  ���    �   B he `connect` event on the socket, the library must know if you've handled the request in any way (e.g. responded with a mocked response or errored it). For that, it emits the `request` event on the interceptor where you can handle the request. Since you can consume the request stream in the `request` event, it waits until the request body stream is complete (i.e. until `req.end()` is called). This creates a catch 22 that causes this limitation.

## Getting started

```bash
npm install @mswjs/interceptors
```

## Interceptors

To use this library you need to choose one or multiple interceptors to apply. There are different interceptors exported by this library to spy on respective request-issuing modules:

- `ClientRequestInterceptor` to spy on `http.ClientRequest` (`http.get`/`http.request`);
- `XMLHttpRequestInterceptor` to spy on `XMLHttpRequest`;
- `FetchInterceptor` to spy on `fetch`.

Use an interceptor by constructing it and attaching request/response listeners:

```js
im        �?         .�                 ..                  index.js                  LICENSE     �             package.json     	            	 README.mdly()

// Listen to any "http.ClientRequest" being dispatched,
// and log its method and full URL.
interceptor.on('request', ({ request, requestId }) => {
  console.log(request.method, request.url)
})

// Listen to any responses sent to "http.ClientRequest".
// Note that this listener is read-only and cannot affect responses.
interceptor.on(
  'response',
  ({ response, isMockedResponse, request, requestId }) => {
    console.log('response to %s %s was:', request.method, request.url, response)
  }
)
```

All HTTP request interceptors implement the same events:

- `request`, emitted whenever a request has been dispatched;
- `response`, emitted whenever any request receives a response.

### Using multiple interceptors

You can combine multiple interceptors to capture requests from different request-issuing modules at once.

```js
import { BatchInterceptor } from '@mswjs/interceptors'
import { ClientRequestInterceptor } from '@mswjs/interceptors/ClientRequest'
import { XMLHttpRequestInterceptor } from '@mswjs/interceptors/XMLHttpRequest'

const interceptor = new BatchInterceptor({
  name: 'my-interceptor',
  interceptors: [
    new ClientRequestInterceptor(),
    new XMLHttpRequestInterceptor(),
  ],
})

interceptor.apply()

// This "request" listener will be called on both
// "http.ClientRequest" and "XMLHttpRequest" being dispatched.
interceptor.on('request', listener)
```

> Note that you can use [pre-defined presets](#presets) that cover all the request sources for a given environment type.

## Presets

When using [`BatchInterceptor`](#batchinterceptor), you can provide a pre-defined preset to its "interceptors" option to capture all request for that environment.

### Node.js preset

This preset combines `ClientRequestInternit): EventSource;
    readonly CONNECTING: 0;
    readonly OPEN: 1;
    readonly CLOSED: 2;
};

/**
 * The **`E ���          ���          ���          ���          ���          ���          ���           ��          ��        	   ��        
  0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���           ���        !  ���        "  ���        #  ���        $  ���        %  ���        &  ���        '   ��        (  ��        )   ��        *  0��        +  @��        ,  P��        -  `��        .  p��        /  ���        0  ���        1  ���        2  ���        3  ���        4  ���        5  ���        6  ���        7   ��        8  ��        9   ��        :  0��        ;  @��        <  P��        =  `��        >  p��        ?  ���        @  ���        A  ���    �   B s an event listener previously registered with EventTarget.addEventListener() from the target.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventTarget/removeEventListener)
     */
    removeEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: EventListenerOptions | boolean): void;
}

declare var EventTarget: {
    prototype: EventTarget;
    new(): EventTarget;
};

/** @deprecated */
interface External {
    /** @deprecated */
    AddSearchProvider(): void;
    /** @deprecated */
    IsSearchProviderInstalled(): void;
}

/** @deprecated */
declare var External: {
    prototype: External;
    new(): External;
};

/**
 * The **`File`** interface provides information about files and allows JavaScript in a web page to access their content.
 *
 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/File)
 */
interface File extends Blob {
    /**
     * The **`lastModified`** read-only property of the File inter   n          AGORAs-lab I0    	         ..     {@            & 2355f73ea4f9f4fe6ff0347e809659db8d83f4     �0            & 738a5bfdef8cb35f588ad39a3fe6e47bde76d4per.mozilla.org/docs/Web/API/File/lastModified)
     */
    readonly lastModified: number;
    /**
     * The **`name`** read-only property of the File interface returns the name of the file represented by a File object.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/File/name)
     */
    readonly name: string;
    /**
     * The **`webkitRelativePath`** read-only property of the File interface contains a string which specifies the file's path relative to the directory selected by the user in an input element with its `webkitdirectory` attribute set.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/File/webkitRelativePath)
     */
    readonly webkitRelativePath: string;
}

declare var File: {
    prototype: File;
    new(fileBits: BlobPart[], fileName: string, options?: FilePropertyBag): File;
};

/**
 * The **`FileList`** interface represents an object of this type returned by the `files` property of the HTML input element; this lets you access the list of files selected with the `<input type='file'>` element.
 *
 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/FileList)
 */
interface FileList {
    /**
     * The **`length`** read-only property of the FileList interface returns the number of files in the `FileList`.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/FileList/length)
     */
    readonly length: number;
    /**
     * The **`item()`** method of the FileList interface returns a File object representing the file at the specified index in the file list.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/FileList/item)
     */
    item(index: number): File | null;
    [index: number]: File;
}

declare var FileList: {
    prototype: FileList;
    new(): FileList;
};

interface FileReaderEventMap {
    "abort": ProgressEve   o   �    �    �        ���          ���          ���          ���           ��          ��           ��        	  0��        
  @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���           ���        !  ���        "  ���        #  ���        $  ���        %  ���        &   ��        '  ��        (   ��        )  0��        *  @��        +  P��        ,  `��        -  p��        .  ���        /  ���        0  ���        1  ���        2  ���        3  ���        4  ���        5  ���        6   ��        7  ��        8   ��        9  0��        :  @��        ;  P��        <  `��        =  p��        >  ���        ?  ���        @  ���        A  ���    �   B $(D��L��H�D$0    H�L$L�$H�T$�5� ��u�H��H���,���H�{H�|$貲���{ L�s0L�$��   1�L��L���!� �H*D$(�H*L$0�Y��Y��X��p+ �}( �Tin �Y����_ x�*�^ �Y��H*T$@�H*D$8�Y��$�Y��X��:p+ �}, ���_ �Yin �$x���^ �Y��,�}( �]�_ x���^ �}, �G�_ x���^ �D��L���D$�$E1��R! ����   I���   A�   �$�D$�H*P0�H*`@�H*XHH�@8�Y��Y��Y�H���H*��X��\$�Y�(��L$�X��$������\$�,�(�A�,$������L$�,�(�A�\$�����*��$�\��,�(�A�D$�����*��\��,�A�D$L������H�D$HdH+%(   t�Ҭ��H��XD��[]A\A]A^A_�AUA��ATA��UH��SH��H��(dH�%(   H�D$1�����H�{H�<$舰��1Ƀ}h D��H�{0D��L�D$��E1��= ��uD�d$H�������H�D$dH+%(   t�B���H��(D��[]A\A]�AWA��AVAUI��ATM��UH��SH��H��HdH�%(   H�D$81��n���H�{H�|$������{ L�s0��   H�t$1�L���e� �H*D$�H*L$ �Y��Y��X���m+ �}( ��_ �Y�fn x�r�^ �Y��H*D$(�L$�H*L$0�Y��Y��X��m+ �}, �Qfn �Y����_ x�'�^ �Y��8�}( ���_ �T$x��^ �\$�}, ���_ x���   x            �� -badge.tsxreact-hooksD$H�P@+PX�HHA�U H�P`�A�$�A*M �YL$�,�A�E �A*$�Y��,�A�$H�|$�8���H�D$8dH+%(   t自��H��HD��[]A\A]A^A_�AUATA��UH��SH��H��HdH�%(   H�D$81�L�l$����H�{H�|$�:����{ tUH�{01�L���� �H*D$(�H*L$0�Y��Y��X��l+ �}, ��dn �Y��W�_ x���^ �Y���}, �;�_ x���^ �D��L���D$H�{0E1���$ ��u'�   H+D$�D$H��
�H*�H�D$�Y��D,�H�|$����H�D$8dH+%(   t�b���H��HD��[]A\A]�AUI��ATI��USH��H��HdH�%(   H�D$81�����I�|$H�|$����A�|$ I�l$0tWH�t$1�H���� �H*D$(�H*L$0�Y��Y��X���j+ A�}, ��cn �Y��1�_ x���^ �Y��A�}, ��_ x�z�^ f���    H���   t^H�r(�D$H���   �
 H���   �H���   H�p(��  H���   �CH���   H�p(��  �+S�D$)ЉC�H�B8H�J0�CB@�)ȉC�*H�|$�Y��,��*K��Y��,��*K�C�Y��,��C����H�D$8dH+%(   t�ѧ��H��H�   []A\A]�AWI��AVAUI��ATA��UH��SL��H��XD�D$dH�%(   H�D$H1������I�H�|$ �|���A�A� M�w0�D$tWH�t$(1�L����� �H*D$(�H*L$0�Y��Y��X��Li+ A�}( �bn �Y����_ x���^ �Y��A�}( �n�_ x���^ D��E1�H�D$L;l$��   H�D$(    �u D��C�D�<���t��������9�u%��� H�D$(�m�T$H�L$(L���t$�D$�! H�D$(�D$�t$H�H1�H)Љ��H*����Y��XZ�n �,���
Hc�H�T$(����	�u����	�C�t�<H�D$(I�ŉ�D$Hŋ�$�   H��4���H�|$ ����H�D$HdH+%(   t����H��X[]A\A]A^A_�AWAVAUATUSH��Q�H*W�H*�~ fA~�fA~�tX�FL�n.FH�.L�f�Nz/Fu.N z/N tL��L��H������L��L��H���3���H�C    �C    D�{1�D�s Z[]A\A]A^A_�AVAUA��ATI��UL��SH��H��   dH�%(   H��$�   1�����H�{H�|$����L�s0D��L����� ����   I���   ���   ltuo��   H�|$�   L�d$HH�5��� H�l$P�H�|$X�   �L�D$HH���   L��H�t$L�l$X� � �|$X H�l$HL�d$PtD�D$\.D$d�L$`z/D$du.L$hz/L$htL��L��H���Ё��L��L��H��������   �1�H�|$�D$�����H��$�   dH+%(   �D$t����H�Đ   []A\A]A^�AVAUL�nATUSH��H���H*�~ �H*OH�.L�ffA~�uL��L��H���L$苁���L$L��L��H���L$fAn������L$D�s1��K H��[]A\A]A^�AUL�jATUSH��H���z �H*^�H*�H*O�H*H�*L�bu<L��L��H���D$�L$�T$�$������D$�L$�T$�$H�M8H�E H ���          ���          ���          ���          ���           ��          ��           ��          0��        	  @��        
  P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���           ���        !  ���        "  ���        #  ���        $  ���        %   ��        &  ��        '   ��        (  0��        )  @��        *  P��        +  `��        ,  p��        -  ���        .  ���        /  ���        0  ���        1  ���        2  ���        3  ���        4  ���        5   ��        6  ��        7   ��        8  0��        9  @��        :  P��        ;  `��        <  p��        =  ���        >  ���        ?  ���        @  ���        A  ���    �   B WAAW;AAEtB,SAAO,OAAO;AAChB;","names":["sourceEmit"]}n\nfunction IsWritableStreamDefaultWriter<W = any>(x: any): x is WritableStreamDefaultWriter<W> {\n  if (!typeIsObject(x)) {\n    return false;\n  }\n\n  if (!Object.prototype.hasOwnProperty.call(x, '_ownerWritableStream')) {\n    return false;\n  }\n\n  return x instanceof WritableStreamDefaultWriter;\n}\n\n// A client of WritableStreamDefaultWriter may use these functions directly to bypass state check.\n\nfunction WritableStreamDefaultWriterAbort(writer: WritableStreamDefaultWriter, reason: any) {\n  const stream = writer._ownerWritableStream;\n\n  assert(stream !== undefined);\n\n  return WritableStreamAbort(stream, reason);\n}\n\nfunction WritableStreamDefaultWriterClose(writer: WritableStreamDefaultWriter): Promise<undefined> {\n  const stream = writer._ownerWritableStream;\n\n  assert(stream !== undefined);\n\n  return WritableStreamClose(stream);\n}\n\nfunction WritableStreamDefaultWriterCloseWithErrorPropagation(write   x          src  .�    N<             ..     O<            & 47a27acd96a618b0ba699f4449a6eb82087cc9     �@            & 72a6af1ede5518da4f25bd37212cb31ade0a69      s           & 956c638d280d6de778426d4b4d481871ef3588dex�    F)     	        info�    BB     
        logs�    �)             objects     >q           	 ORIG_HEAD�    i)             refsn  assert(state === 'writable' || state === 'erroring');\n\n  return WritableStreamDefaultWriterClose(writer);\n}\n\nfunction WritableStreamDefaultWriterEnsureClosedPromiseRejected(writer: WritableStreamDefaultWriter, error: any) {\n  if (writer._closedPromiseState === 'pending') {\n    defaultWriterClosedPromiseReject(writer, error);\n  } else {\n    defaultWriterClosedPromiseResetToRejected(writer, error);\n  }\n}\n\nfunction WritableStreamDefaultWriterEnsureReadyPromiseRejected(writer: WritableStreamDefaultWriter, error: any) {\n  if (writer._readyPromiseState === 'pending') {\n    defaultWriterReadyPromiseReject(writer, error);\n  } else {\n    defaultWriterReadyPromiseResetToRejected(writer, error);\n  }\n}\n\nfunction WritableStreamDefaultWriterGetDesiredSize(writer: WritableStreamDefaultWriter): number | null {\n  const stream = writer._ownerWritableStream;\n  const state = stream._state;\n\n  if (state === 'errored' || state === 'erroring') {\n    return null;\n  }\n\n  if (state === 'closed') {\n    return 0;\n  }\n\n  return WritableStreamDefaultControllerGetDesiredSize(stream._writableStreamController);\n}\n\nfunction WritableStreamDefaultWriterRelease(writer: WritableStreamDefaultWy��H��$  dH+%(   t踔��H��(  []A\A]�AWAVAUI��ATA��USL��H���  H�n0H�<$H��$�   H�L$L�t$0�
   D�L$H��$�   dH�%(   H��$�  1�H�D$0    �H����� �t$L��H����� H�|$0 uL��1�H����� H�T$01�H��t��$�   E1������I��W���H�� L��D$8H!�D��H��H�L$8H	к   ��I���f� ��H��$�   H�D$�
  R��$(  I��L��PAWAVH�T$ D�L$0H�L$(H�|$8����H�� H�\$HH��$0  H���v��D��D��H��H�D$��v��H��$�   D��H���� ����   � L�D$`H�D$(L��L�D$ L��$h  ����L��L��P��$ ���          ���          ���          ���           ��          ��           ��          0��          @��        	  P��        
  `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���           ���        !  ���        "  ���        #  ���        $   ��        %  ��        &   ��        '  0��        (  @��        )  P��        *  `��        +  p��        ,  ���        -  ���        .  ���        /  ���        0  ���        1  ���        2  ���        3  ���        4   ��        5  ��        6   ��        7  0��        8  @��        9  P��        :  `��        ;  p��        <  ���        =  ���        >  ���        ?  ���        @  ���        A  ���    �   B n\n  if (stream !== writer._ownerWritableStream) {\n    return promiseRejectedWith(defaultWriterLockException('write to'));\n  }\n\n  const state = stream._state;\n  if (state === 'errored') {\n    return promiseRejectedWith(stream._storedError);\n  }\n  if (WritableStreamCloseQueuedOrInFlight(stream) || state === 'closed') {\n    return promiseRejectedWith(new TypeError('The stream is closing or closed and cannot be written to'));\n  }\n  if (state === 'erroring') {\n    return promiseRejectedWith(stream._storedError);\n  }\n\n  assert(state === 'writable');\n\n  const promise = WritableStreamAddWriteRequest(stream);\n\n  WritableStreamDefaultControllerWrite(controller, chunk, chunkSize);\n\n  return promise;\n}\n\nconst closeSentinel: unique symbol = {} as any;\n\ntype QueueRecord<W> = W | typeof closeSentinel;\n\n/**\n * Allows control of a {@link WritableStream | writable stream}'s state and internal queue.\n *\n * @public\n */\nexport class WritableStreamDefaultController<        �      AGORAubtsipartData.js.maprom "../../ajv"
import type {CodeKeywordDefinition} from "../../types"
import {alwaysValidSchema} from "../../compile/util"

const def: CodeKeywordDefinition = {
  keyword: "metadata",
  schemaType: "object",
  code(cxt: KeywordCxt) {
    checkMetadata(cxt)
    const {gen, schema, it} = cxt
    if (alwaysValidSchema(it, schema)) return
    const valid = gen.name("valid")
    cxt.subschema({keyword: "metadata", jtdMetadata: true}, valid)
    cxt.ok(valid)
  },
}

export function checkMetadata({it, keyword}: KeywordCxt, metadata?: boolean): void {
  if (it.jtdMetadata !== metadata) {
    throw new Error(`JTD: "${keyword}" cannot be used in this schema location`)
  }
}

export default def
or('Illegal constructor');\n  }\n\n  /**\n   * The reason which was passed to `WritableStream.abort(reason)` when the stream was aborted.\n   *\n   * @deprecated\n   *  This property has been removed from the specification, see https://github.com/whatwg/streams/pull/1177.\n   *  Use {@link WritableStreamDefaultController.signal}'s `reason` instead.\n   */\n  get abortReason(): any {\n    if (!IsWritableStreamDefaultController(this)) {\n      throw defaultControllerBrandCheckException('abortReason');\n    }\n    return this._abortReason;\n  }\n\n  /**\n   * An `AbortSignal` that can be used to abort the pending write or close operation when the stream is aborted.\n   */\n  get signal(): AbortSignal {\n    if (!IsWritableStreamDefaultController(this)) {\n      throw defaultControllerBrandCheckException('signal');\n    }\n    if (this._abortController === undefined) {\n      // Older browsers or older Node versions may not support `AbortController` or `AbortSignal`.\n      // We don't want to bundle and ship an `AbortController` polyfill together with our polyfill,\n      // so instead we only implement support for `signal` if we find a global `AbortController` constructor.\n      throw new TypeError('WritableStreamDefaultController.prototype.signal is not supported');\n    }\n    return thi�     �      �    �<    �A                                               ��j    l�:    &-j    �<�    &-j    �<�                                     p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���           ���        !  ���        "  ���        #   ��        $  ��        %   ��        &  0��        '  @��        (  P��        )  `��        *  p��        +  ���        ,  ���        -  ���        .  ���        /  ���        0  ���        1  ���        2  ���        3   ��        4  ��        5   ��        6  0��        7  @��        8  P��        9  `��        :  p��        ;  ���        <  ���        =  ���        >  ���        ?  ���        @  ���        A  ���    �   B gorithm(reason);\n    WritableStreamDefaultControllerClearAlgorithms(this);\n    return result;\n  }\n\n  /** @internal */\n  [ErrorSteps]() {\n    ResetQueue(this);\n  }\n}\n\nObject.defineProperties(WritableStreamDefaultController.prototype, {\n  abortReason: { enumerable: true },\n  signal: { enumerable: true },\n  error: { enumerable: true }\n});\nif (typeof Symbol.toStringTag === 'symbol') {\n  Object.defineProperty(WritableStreamDefaultController.prototype, Symbol.toStringTag, {\n    value: 'WritableStreamDefaultController',\n    configurable: true\n  });\n}\n\n// Abstract operations implementing interface required by the WritableStream.\n\nfunction IsWritableStreamDefaultController(x: any): x is WritableStreamDefaultController<any> {\n  if (!typeIsObject(x)) {\n    return false;\n  }\n\n  if (!Object.prototype.hasOwnProperty.call(x, '_controlledWritableStream')) {\n    return false;\n  }\n\n  return x instanceof WritableStreamDefaultController;\n}\n\nfunction SetUpWritab   n          libo.jsonc �            ..     {            index.jsymls     �            bypass.d.ts     Ղ           	 bypass.js     ʕ            bypass.js.map     ��           
 bypass.mjs     ѕ            bypass.mjs.map     ��    	        delay.d.mts     ��    
       
 delay.d.ts     x�            delay.js     c�            delay.js.map     ��           	 delay.mjs     m�            delay.mjs.map�    ��            experimental     �            getResponse.d.mts     �8            getResponse.d.ts     2�            getResponse.js     0�            getResponse.js.map     ��            getResponse.mjs     7�            getResponse.mjs.map     �            graphql.d.mts     �u            graphql.d.ts     Ȋ           
 graphql.js     W�            graphql.js.map     ��            graphql.mjs     \�            graphql.mjs.map�    �            handlers     +�           
 http.d.mts     >�           	 http.d.ts     ��            http.js     �             http.js.map     �    !        http.mjs     �    "        http.mjs.map     U�    #        HttpResponse-BFS34nkx.d.ts     3�    $        HttpResponse-CQwYpuKo.d.mts     ;�    %        HttpResponse.d.mts     ]�    &        HttpResponse.d.ts     ��    '        HttpResponse.js     '�    (        HttpResponse.js.map     �    )        HttpResponse.mjs     8�    *        HttpResponse.mjs.map     D�    +        index.d.mts     r�    ,       
 index.d.ts     �    -        index.js     ǘ    .        index.js.map     �    /       	 index.mjs     Z�   
 0        index.mjs.map     Y�    1        isCommonAssetRequest.d.mts     ��    2        isCommonAssetRequest.d.ts     (�    3        isCommonAssetRequest.js     ��   
 4        isCommonAssetRequest.js.map     +�   	 5        isCommonAssetRequest.mjs     ��   
 6        isCommonAssetRequest ���          ���           ��          ��           ��          0��          @��          P��          `��        	  p��        
  ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���           ���        !  ���        "   ��        #  ��        $   ��        %  0��        &  @��        '  P��        (  `��        )  p��        *  ���        +  ���        ,  ���        -  ���        .  ���        /  ���        0  ���        1  ���        2   ��        3  ��        4   ��        5  0��        6  @��        7  P��        8  `��        9  p��        :  ���        ;  ���        <  ���        =  ���        >  ���        ?  ���        @  ���        A s.map�    �y    Q        utils�    f    R        ws     ��    S        ws.d.mts     �    T        ws.d.ts     Ք    U        ws.js     x�   	 V       	 ws.js.map     ��    W        ws.mjs     ��    X       
 ws.mjs.mapgorithm = () => underlyingSink.close!();\n  } else {\n    closeAlgorithm = () => promiseResolvedWith(undefined);\n  }\n  if (underlyingSink.abort !== undefined) {\n    abortAlgorithm = reason => underlyingSink.abort!(reason);\n  } else {\n    abortAlgorithm = () => promiseResolvedWith(undefined);\n  }\n\n  SetUpWritableStreamDefaultController(\n    stream, controller, startAlgorithm, writeAlgorithm, closeAlgorithm, abortAlgorithm, highWaterMark, sizeAlgorithm\n  );\n}\n\n// ClearAlgorithms may be called twice. Erroring the same stream in multiple ways will often result in redundant calls.\nfunction WritableStreamDefaultControllerClearAlgorithms(controller: WritableStreamDefaultController<any>) {\n  controller._writeAlgorithm = undefined!;\n  control        �?      �� hubs�  ��      ontroller._abortAlgorithm = undefined!;\n  controller._strategySizeAlgorithm = undefined!;\n}\n\nfunction WritableStreamDefaultControllerClose<W>(controller: WritableStreamDefaultController<W>) {\n  EnqueueValueWithSize(controller, closeSentinel, 0);\n  WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller);\n}\n\nfunction WritableStreamDefaultControllerGetChunkSize<W>(controller: WritableStreamDefaultController<W>,\n                                                        chunk: W): number {\n  try {\n    return controller._strategySizeAlgorithm(chunk);\n  } catch (chunkSizeE) {\n    WritableStreamDefaultControllerErrorIfNeeded(controller, chunkSizeE);\n    return 1;\n  }\n}\n\nfunction WritableStreamDefaultControllerGetDesiredSize(controller: WritableStreamDefaultController<any>): number {\n  return controller._strategyHWM - controller._queueTotalSize;\n}\n\nfunction WritableStreamDefaultControllerWrite<W>(controller: WritableStreamDefaultController<W>,\n                                                 chunk: W,\n                                                 chunkSize: number) {\n  try {\n    EnqueueValueWithSize(controller, chunk, chunkSize);\n  } catch (enqueueE) {\n    WritableStreamDefaultControllerErrorIfNeeded(controller, enqueueE);\n    return;\n  }\n\n  const stream = controller._controlledWritableStream;\n  if (!WritableStreamCloseQueuedOrInFlight(stream) && stream._state === 'writable') {\n    const backpressure = WritableStreamDefaultControllerGetBackpressure(controller);\n    WritableStreamUpdateBackpressure(stream, backpressure);\n  }\n\n  WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller);\n}\n\n// Abstract operations for the WritableStreamDefaultController.\n\nfunction WritableStreamDefaultControllerAdvanceQueueIfNeeded<W>(controller: WritableStreamDefaultController<W>) {\n  const stream = controller._controlledWritableStream;\n\n  if (!controller._started) {\n    return;\n  }\n\n  if (stream._inFlightWriteRequest !== undefined) {\n   �     �      �          �A                                               �j     *+0    <�j    �r    <�j    �r                                     ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���           ���        !   ��        "  ��        #   ��        $  0��        %  @��        &  P��        '  `��        (  p��        )  ���        *  ���        +  ���        ,  ���        -  ���        .  ���        /  ���        0  ���        1   ��        2  ��        3   ��        4  0��        5  @��        6  P��        7  `��        8  p��        9  ���        :  ���        ;  ���        <  ���        =  ���        >  ���        ?  ���        @  ���        A  ���    �   B dion-up { from { height: var(--radix-accordion-content-height,var(--bits-accordion-content-height,var(--reka-accordion-content-height,var(--kb-accordion-content-height,var(--ngp-accordion-content-height,auto))))); }to { height: 0; }}@keyframes collapsible-down { from { height: 0; }to { height: var(--radix-collapsible-content-height,var(--bits-collapsible-content-height,var(--reka-collapsible-content-height,var(--kb-collapsible-content-height,auto)))); }}@keyframes collapsible-up { from { height: var(--radix-collapsible-content-height,var(--bits-collapsible-content-height,var(--reka-collapsible-content-height,var(--kb-collapsible-content-height,auto)))); }to { height: 0; }}--animate-caret-blink: caret-blink 1.25s ease-out infinite; @keyframes caret-blink { 0%,70%,100% { opacity: 1; }20%,50% { opacity: 0; }}}@utility animation-duration-*{--tw-animation-duration: calc(--value(number)*1ms); --tw-animation-duration: --value(--animation-duration-*,[duration],"initial",[*]); animation   n          lib  .�    ��            ..     �            add-locale.d.ts     ��            add-locale.js     Į            add-locale.js.map     �            add-path-prefix.d.ts     ��            add-path-prefix.js     Ʈ            add-path-prefix.js.map     �    	        add-path-suffix.d.ts         
        add-path-suffix.js     Ȯ            add-path-suffix.js.map     ?�            app-paths.d.ts     E�            app-paths.js     �            app-paths.js.map     Z�            as-path-to-search-params.d.ts     ��            as-path-to-search-params.js     S�            as-path-to-search-params.js.map     ��            cache-busting-search-param.d.ts     @�            cache-busting-search-param.js     �           ! cache-busting-search-param.js.map     ��            compare-states.d.ts     ��            compare-states.js     -�            compare-states.js.map     A�            disable-smooth-scroll.d.ts     �            disable-smooth-scroll.js     �            disable-smooth-scroll.js.map     ��            escape-path-delimiters.d.ts     ��            escape-path-delimiters.js     ]�            escape-path-delimiters.js.map     ��            format-next-pathname-info.d.ts     #�            format-next-pathname-info.js     ��              format-next-pathname-info.js.map     ��    !        format-url.d.ts     '�    "        format-url.js     ű    #        format-url.js.map     ��    $        get-asset-path-from-route.d.ts     D�    %        get-asset-path-from-route.js     ݱ    &         get-asset-path-from-route.js.map     ��    '        get-dynamic-param.d.ts     ^�    (        get-dynamic-param.js     �    )        get-dynamic-param.js.map     �    *        get-next-pathname-info.d.ts     �    +        get-next-pathname-info.js     �    ,        get-next-pathname-info.js.map      �    - ��          ��           ��          0��          @��          P��          `��          p��          ���        	  ���        
  ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���            ��        !  ��        "   ��        #  0��        $  @��        %  P��        &  `��        '  p��        (  ���        )  ���        *  ���        +  ���        ,  ���        -  ���        .  ���        /  ���        0   ��        1  ��        2   ��        3  0��        4  @��        5  P��        6  `��        7  p��        8  ���        9  ���        :  ���        ;  ���        <  ���        =  ���        >  ���        ?  ���        @   ��        A ��    D        is-bot.js.map     4�    E        is-dynamic.d.ts     �    F        is-dynamic.js     ��    G        is-dynamic.js.map     ;�    H        is-local-url.d.ts     �    I        is-local-url.js     ��    J        is-local-url.js.map     ��    K        middleware-route-matcher.d.ts     ��    L        middleware-route-matcher.js     9�    M        middleware-route-matcher.js.map     !�    N       	 omit.d.ts     Ȩ    O        omit.js     #�    P        omit.js.map     S�    Q        parse-loader-tree.d.ts     0�    R        parse-loader-tree.js     ��    S        parse-loader-tree.js.map     U�    T        parse-path.d.ts     4�    U        parse-path.js     ��    V        parse-path.js.map     V�    W        parse-relative-url.d.ts     6�    X        parse-relative-url.js     ��    Y        parse-relative-url.js.map     Y�    Z        parse-url.d.ts     :�    [        parse-url.jsnslate-x        �      soul .�    �f             ..     �           	 .eslintrc     T            implementation.js     !            index.js     "           	 native.js     �%           
 shimmed.js     t(            tests.js            handleWebSocketEvent.mjs     З            handleWebSocketEvent.mjs.map�    �    	        utils     ��    
        WebSocketClientManager.d.mts     ��            WebSocketClientManager.d.ts     }�            WebSocketClientManager.js     2�            WebSocketClientManager.js.map     ��            WebSocketClientManager.mjs     ?�            WebSocketClientManager.mjs.map     ��            WebSocketClientStore.d.mts     Ά            WebSocketClientStore.d.ts     ��            WebSocketClientStore.js     D�   	         WebSocketClientStore.js.map     ��            WebSocketClientStore.mjs     K�   
         WebSocketClientStore.mjs.map     ��           # WebSocketIndexedDBClientStore.d.mts     ֆ           " WebSocketIndexedDBClientStore.d.ts     ��             WebSocketIndexedDBClientStore.js     \�           $ WebSocketIndexedDBClientStore.js.map     ��   	        ! WebSocketIndexedDBClientStore.mjs     b�           % WebSocketIndexedDBClientStore.mjs.map     ��            webSocketInterceptor.d.mts     ؆            webSocketInterceptor.d.ts     ��            webSocketInterceptor.js     e�            webSocketInterceptor.js.map     ��             webSocketInterceptor.mjs     j�   
 !        webSocketInterceptor.mjs.map     ��    "         WebSocketMemoryClientStore.d.mts     ߆    #        WebSocketMemoryClientStore.d.ts     ��    $        WebSocketMemoryClientStore.js     n�    %       ! WebSocketMemoryClientStore.js.map     ��    &        WebSocketMemoryClientStore.mjs     t�    '       " WebSocketMemoryClientStore.mjs.mapate-*,[percentage],[length])*-1); }}@utility slide-out-to-top{--tw-exit-translate-y:�     �      �    �<    �A                                               ��j    l�:    &-j    �<�    &-j    �<�                                     ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��           ��        !   ��        "  0��        #  @��        $  P��        %  `��        &  p��        '  ���        (  ���        )  ���        *  ���        +  ���        ,  ���        -  ���        .  ���        /   ��        0  ��        1   ��        2  0��        3  @��        4  P��        5  `��        6  p��        7  ���        8  ���        9  ���        :  ���        ;  ���        <  ���        =  ���        >  ���        ?   ��        @  ��        A  ��    �   B am-value.js     ��    t        resolve-param-value.js.map     ��    u        resolve-rewrites.d.ts     �    v        resolve-rewrites.js     ��    w        resolve-rewrites.js.map     �    x        route-match-utils.d.ts     J�    y        route-match-utils.js     ζ    z        route-match-utils.js.map     �    {        route-matcher.d.ts     T�    |        route-matcher.js     ض    }        route-matcher.js.map     �    ~        route-regex.d.ts     ^�            route-regex.js     �    �        route-regex.js.map     o�    �        sortable-routes.d.ts     D�    �        sortable-routes.js     �    �        sortable-routes.js.map     p�    �        sorted-routes.d.ts     F�    �        sorted-routes.js     ��    �        sorted-routes.js.mapeger)); --tw-exit-translate-x: calc(--value(--percentage-*,--percentage-tr
    readonly message: string;
}

/**
 * The `GainNode` interface represents a c        �      AGORA.�    H~            ..     ؂           
 index.d.ts     s            index.js   Ve             .nycrc     ]            CHANGELOG.md                 
 index.d.ts     O            index.js         	        LICENSE         
        package.json     �           	 README.md�    Q            test     �            tsconfig.jsonpping.d.mts.map     �+             source-map-tree.d.cts     �/             source-map-tree.d.cts.map     �4             source-map-tree.d.mts     [0             source-map-tree.d.mts.map     �+             source-map.d.cts     �0             source-map.d.cts.map     F5             source-map.d.mts     51             source-map.d.mts.map     ,             types.d.cts     �1             types.d.cts.map     �5             types.d.mts     
2             types.d.mts.map the device (e.g., analog thumb sticks).
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Gamepad/axes)
     */
    readonly axes: ReadonlyArray<number>;
    /**
     * The **`buttons`** property of the Gamepad interface returns an array of GamepadButton objects representing the buttons present on the device.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Gamepad/buttons)
     */
    readonly buttons: ReadonlyArray<GamepadButton>;
    /**
     * The **`Gamepad.connected`** property of the still connected to the system.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Gamepad/connected)
     */
    readonly connected: boolean;
    /**
     * The **`Gamepad.id`** property of the Gamepad interface returns a string containing some information about the controller.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Gamepad/id)
     */
    readonly id: string;
    /**
     * The **`Gamepad.index`** property of the Gamepad interface returns an integer that is auto-incremented to be unique for each device currentl�     �      �    "    0�A                                               d�j    ���-    �vj    �q�    �vj    �q�                                     ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��            ��        !  0��        "  @��        #  P��        $  `��        %  p��        &  ���        '  ���        (  ���        )  ���        *  ���        +  ���        ,  ���        -  ���        .   ��        /  ��        0   ��        1  0��        2  @��        3  P��        4  `��        5  p��        6  ���        7  ���        8  ���        9  ���        :  ���        ;  ���        <  ���        =  ���        >   ��        ?  ��        @   ��        A   ��    �   B CAAC,IAAI,EAAE,IAAI,MAAM,CAAC,CAAC;QAAE,OAAO,EAAE,GAAG,CAAC,MAAM,CAAC,CAAC,GAAG,EAAE,CAAC,CAAC,CAAC,oBAAoB;IACvF,OAAO;AACT,CAAC;AAED;;;GAGG;AACH,MAAM,UAAU,UAAU,CAAC,GAAW;IACpC,IAAI,OAAO,GAAG,KAAK,QAAQ;QAAE,MAAM,IAAI,KAAK,CAAC,2BAA2B,GAAG,OAAO,GAAG,CAAC,CAAC;IACvF,aAAa;IACb,IAAI,aAAa;QAAE,OAAO,UAAU,CAAC,OAAO,CAAC,GAAG,CAAC,CAAC;IAClD,MAAM,EAAE,GAAG,GAAG,CAAC,MAAM,CAAC;IACtB,MAAM,EAAE,GAAG,EAAE,GAAG,CAAC,CAAC;IAClB,IAAI,EAAE,GAAG,CAAC;QAAE,MAAM,IAAI,KAAK,CAAC,kDAAkD,GAAG,EAAE,CAAC,CAAC;IACrF,MAAM,KAAK,GAAG,IAAI,UAAU,CAAC,EAAE,CAAC,CAAC;IACjC,KAAK,IAAI,EAAE,GAAG,CAAC,EAAE,EAAE,GAAG,CAAC,EAAE,EAAE,GAAG,EAAE,EAAE,EAAE,EAAE,EAAE,EAAE,IAAI,CAAC,EAAE,CAAC;QAChD,MAAM,EAAE,GAAG,aAAa,CAAC,GAAG,CAAC,UAAU,CAAC,EAAE,CAAC,CAAC,CAAC;QAC7C,MAAM,EAAE,GAAG,aAAa,CAAC,GAAG,CAAC,UAAU,CAAC,EAAE,GAAG,CAAC,CAAC,CAAC,CAAC;QACjD,IAAI,EAAE,KAAK,SAAS,IAAI,EAAE,KAAK,SAAS,EAAE,CAAC;YACzC,MAAM,IAAI,GAAG,GAAG,CAAC,EAAE,CAAC,GAAG,GAAG,CAAC,EAAE,GAAG,CAAC,CAAC,CAAC;YACnC,MAAM,IAAI,KAAK,CAAC,8CAA8C,GAAG,IAAI,GAAG�    �             .�    �             ..     5             .editorconfig     e            	 .eslintrc�    j#            .github     �            .nycrc     ~            CHANGELOG.md     i#           
 index.d.ts     -    	        index.js     �    
        LICENSE�    �             node_modules     P            package.json     5"           	 README.md�    .            test                 tsconfig.jsonAK,CAAC,CAAC,CAAC;AACxC,CAAC;AAED,qBAAqB;AACrB,MAAM,UAAU,eAAe,CAAC,CAAkB,EAAE,GAAW;IAC7D,OAAO,UAAU,CAAC,CAAC,CAAC,QAAQ,CAAC,EAAE,CAAC,CAAC,QAAQ,CAAC,GAAG,GAAG,CAAC,EAAE,GAAG,CAAC,CAAC,CAAC;AAC3D,CAAC;AAED,eAAe;AACf,8DAA8D;AAC9D,wEAAwE;AACxE,yEAAyE;AACzE,MAAM,CAAC,MAAM,QAAQ,GAAG,KAAK,IAAmB,EAAE,GAAE,CAAC,CAAC;AAMtD;;;GAGG;AACH,MAAM,UAAU,WAAW,CAAC,GAAW;IACrC,IAAI,OAAO,GAAG,KAAK,QAAQ;QAAE,MAAM,IAAI,KAAK,CAAC,iBAAiB,CAAC,CAAC;IAChE,OAAO,IAAI,UAAU,CAAC,IAAI,WAAW,EAAE,CAAC,MAAM,CAAC,GAAG,CAAC,CAAC,CAAC,CAAC,4BAA4B;AACpF,CAAC;AAED;;;GAGG;AACH,MAAM,UAAU,WAAW,CAAC,KAAiB;IAC3C,OAAO,IAAI,WAAW,EAAE,CAAC,MAAM,CAAC,KAAK,CAAC,CAAC;AACzC,CAAC;AAID;;;;GAIG;AACH,MAAM,UAAU,OAAO,CAAC,IAAyB;IAC/C,IAAI,OAAO,IAAI,KAAK,QAAQ;QAAE,IAAI,GAAG,WAAW,CAAC,IAAI,CAAC,CAAC;SAClD,IAAI,OAAO,CAAC,IAAI,CAAC;QAAE,IAAI,GAAG,SAAS,CAAC,IAAI,CAAC,CAAC;;QAC1C,MAAM,IAAI,KAAK,CAAC,2BAA2B,GAAG,OAAO,IAAI,CAAC,CAAC;IAChE,OAAO,IAAI,CAAC;AACd,CAAC;AAED;;;GAGG;AACH,MAAM,UAAU,YAAY,CAAC,CAAa,EAAE,CAAa;IACvD,OAAO,CACL,CAAC,CAAC,MAAM,KAAK,CAAC,CAAC,MAAM,IAAI,iDAAiD;QAC1E,CAAC,CAAC,UAAU,GAAG,CAAC,CAAC,UAAU,GAAG,CAAC,CAAC,UAAU,IAAI,wBAAwB;QACtE,CAAC,CAAC,UAAU,GAAG,CAAC,CAAC,UAAU,GAAG,CAAC,CAAC,UAAU,CAAC,wBAAwB;KACpE,CAAC;AACJ,CAAC;AAED;;;GAGG;AACH,MAAM,UAAU,mBAAmB,CAAC,KAAiB,EAAE,MAAkB;IACvE,oEAAoE;IACpE,4DAA4D;IAC5D,IAAI,YAAY,CAAC,KAAK,EAAE,MAAM,CAAC,IAAI,KAAK,CAAC,UAAU,GAAG,MAAM,CAAC,UAAU;QACrE,MAAM,IAAI,KAAK,CAAC,sDAAsD,CAAC,CAAC;AAC5E,CAAC;AAED;;GAEG;AACH,MAAM,UAAU,WAAW,CAAC,GAAG,MAAoB;IACjD,IAAI,GAAG,GAAG,CAAC,CAAC;IACZ,KAAK,IAAI,CAAC,GAAG,CAAC,EAAE,CAAC,GAAG,MAAM,CAAC,MAAM,EAAE,CAAC,EAAE, 8��          @��          P��          `��          p��          ���          ���          ���          ���        	  ���        
  ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��           0��        !  @��        "  P��        #  `��        $  p��        %  ���        &  ���        '  ���        (  ���        )  ���        *  ���        +  ���        ,  ���        -   ��        .  ��        /   ��        0  0��        1  @��        2  P��        3  `��        4  p��        5  ���        6  ���        7  ���        8  ���        9  ���        :  ���        ;  ���        <  ���        =   ��        >  ��        ?   ��        @  0��        A  0��    �   B AAM,OAAgB,IAAI;CAazB;AA4CD;;;GAGG;AACH,MAAM,CAAC,MAAM,UAAU,GAAG,CACxB,MAAS,EACT,WAAc,EACP,EAAE;IACT,SAAS,aAAa,CAAC,GAAe,EAAE,GAAG,IAAW;QACpD,eAAe;QACf,MAAM,CAAC,GAAG,CAAC,CAAC;QAEZ,kFAAkF;QAClF,IAAI,CAAC,IAAI;YAAE,MAAM,IAAI,KAAK,CAAC,iDAAiD,CAAC,CAAC;QAE9E,2CAA2C;QAC3C,IAAI,MAAM,CAAC,WAAW,KAAK,SAAS,EAAE,CAAC;YACrC,MAAM,KAAK,GAAG,IAAI,CAAC,CAAC,CAAC,CAAC;YACtB,IAAI,CAAC,KAAK;gBAAE,MAAM,IAAI,KAAK,CAAC,qBAAqB,CAAC,CAAC;YACnD,IAAI,MAAM,CAAC,YAAY;gBAAE,MAAM,CAAC,KAAK,CAAC,CAAC;;gBAClC,MAAM,CAAC,KAAK,EAAE,MAAM,CAAC,WAAW,CAAC,CAAC;QACzC,CAAC;QAED,oCAAoC;QACpC,MAAM,IAAI,GAAG,MAAM,CAAC,SAAS,CAAC;QAC9B,IAAI,IAAI,IAAI,IAAI,CAAC,CAAC,CAAC,KAAK,SAAS,EAAE,CAAC;YAClC,MAAM,CAAC,IAAI,CAAC,CAAC,CAAC,CAAC,CAAC;QAClB,CAAC;QAED,MAAM,MAAM,GAAG,WAAW,CAAC,GAAG,EAAE,GAAG,IAAI,CAAC,CAAC;QACzC,MAAM,WAAW,GAAG,CAAC,QAAgB,EAAE,MAAmB,EAAE,EAAE;YAC5D,IAAI,MAAM,KAAK,SAAS,EAAE,CAAC;gBACzB,IAAI,QAAQ,KAAK,CAAC;oBAAE,MAAM,IAAI,KAAK,CAAC,6BAA6B,CAAC,CAAC;gBACnE,MAAM,CAAC,MAAM,CAAC,CAAC;YACjB,CAAC;QACH,CAAC,CAAC;QAC   x          tsconfig.json            ..     t�           
 nanoid.cjsE,MAAmB;gBAC3C,IAAI,MAAM;oBAAE,MAAM,IAAI,KAAK,CAAC,8CAA8C,CAAC,CAAC;gBAC5E,MAAM,GAAG,IAAI,CAAC;gBACd,MAAM,CAAC,IAAI,CAAC,CAAC;gBACb,WAAW,CAAC,MAAM,CAAC,OAAO,CAAC,MAAM,EAAE,MAAM,CAAC,CAAC;gBAC3C,OAAQ,MAA2B,CAAC,OAAO,CAAC,IAAI,EAAE,MAAM,CAAC,CAAC;YAC5D,CAAC;YACD,OAAO,CAAC,IAAgB,EAAE,MAAmB;gBAC3C,MAAM,CAAC,IAAI,CAAC,CAAC;gBACb,IAAI,IAAI,IAAI,IAAI,CAAC,MAAM,GAAG,IAAI;oBAC5B,MAAM,IAAI,KAAK,CAAC,oDAAoD,GAAG,IAAI,CAAC,CAAC;gBAC/E,WAAW,CAAC,MAAM,CAAC,OAAO,CAAC,MAAM,EAAE,MAAM,CAAC,CAAC;gBAC3C,OAAQ,MAA2B,CAAC,OAAO,CAAC,IAAI,EAAE,MAAM,CAAC,CAAC;YAC5D,CAAC;SACF,CAAC;QAEF,OAAO,QAAQ,CAAC;IAClB,CAAC;IAED,MAAM,CAAC,MAAM,CAAC,aAAa,EAAE,MAAM,CAAC,CAAC;IACrC,OAAO,aAAsB,CAAC;AAChC,CAAC,CAAC;AAWF;;;GAGG;AACH,MAAM,UAAU,SAAS,CACvB,cAAsB,EACtB,GAAgB,EAChB,WAAW,GAAG,IAAI;IAElB,IAAI,GAAG,KAAK,SAAS;QAAE,OAAO,IAAI,UAAU,CAAC,cAAc,CAAC,CAAC;IAC7D,IAAI,GAAG,CAAC,MAAM,KAAK,cAAc;QAC/B,MAAM,IAAI,KAAK,CAAC,kCAAkC,GAAG,cAAc,GAAG,SAAS,GAAG,GAAG,CAAC,MAAM,CAAC,CAAC;IAChG,IAAI,WAAW,IAAI,CAAC,WAAW,CAAC,GAAG,CAAC;QAAE,MAAM,IAAI,KAAK,CAAC,iCAAiC,CAAC,CAAC;IACzF,OAAO,GAAG,CAAC;AACb,CAAC;AAED,8BAA8B;AAC9B,MAAM,UAAU,YAAY,CAC1B,IAAc,EACd,UAAkB,EAClB,KAAa,EACb,IAAa;IAEb,IAAI,OAAO,IAAI,CAAC,YAAY,KAAK,UAAU;QAAE,OAAO,IAAI,CAAC,YAAY,CAAC,UAAU,EAAE,KAAK,EAAE,IAAI,CAAC,CAAC;IAC/F,MAAM,IAAI,GAAG,MAAM,CAAC,EAAE,CAAC,CAAC;IACxB,MAAM,QAAQ,GAAG,MAAM,CAAC,UAAU,CAAC,CAAC;IACpC,MAAM,EAAE,GAAG,MAAM,CAAC,CAAC,KAAK,IAAI,IAAI,CAAC,GAAG,QAAQ,CAAC,CAAC;IAC9C,MAAM,EAAE,GAAG,MAAM,CAAC,KAAK,GAAG,QAAQ,CAAC,CAAC;IACpC,MAAM,CAAC,GAAG,IAAI,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC;IACvB,MAAM,CAAC,GAAG,IAAI,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC;IACvB,IAAI,CAAC,SAAS,CAAC,UAAU,GAAG,CAAC,EAAE,EAAE,EAAE,IAAI,CAAC,CAAC;IACzC,IAAI,CAAC,SAAS,CAAC,UAAU,GAAG,CAAC,EAAE,EAAE,EAAE,IAAI,CAAC,CAAC;AAC3C,CAAC;AAED,MAAM,UAAU,UAAU,CAAC,UAAkB,EAAE,SAAiB,EAAE,IAAa;IAC7E,KAAK,CAAC,IAAI,CAAC,CAAC;IACZ,MAAM,GAAG,GAAG,IAAI,UAAU,CAAC,EAAE,CAAC,CAAC;IAC/B,MAAM,IAAI,GAAG,UAAU,CAAC,GAAG,CAAC,CAAC;IAC7B,YAAY,CAAC,IAAI,EA   y        �"             `��          p��          ���          ���          ���          ���          ���        	  ���        
  ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��           @��        !  P��        "  `��        #  p��        $  ���        %  ���        &  ���        '  ���        (  ���        )  ���        *  ���        +  ���        ,   ��        -  ��        .   ��        /  0��        0  @��        1  P��        2  `��        3  p��        4  ���        5  ���        6  ���        7  ���        8  ���        9  ���        :  ���        ;  ���        <   ��        =  ��        >   ��        ?  0��        @  @��        A  @��    �   B 72.0.0.1/24") == "172.0.0.255"
```
`networkAddressFromCIDR()` will return the network address for a given IPv4 interface and netmask in CIDR notation.
```js
ipaddr.IPv4.networkAddressFromCIDR("172.0.0.1/24") == "172.0.0.0"
```

#### Conversion

IPv4 and IPv6 can be converted bidirectionally to and from network byte order (MSB) byte arrays.

The `fromByteArray()` method will take an array and create an appropriate IPv4 or IPv6 object
if the input satisfies the requirements. For IPv4 it has to be an array of four 8-bit values,
while for IPv6 it has to be an array of sixteen 8-bit values.

For example:
```js
var addr = ipaddr.fromByteArray([0x7f, 0, 0, 1]);
addr.toString(); // => "127.0.0.1"
```

or

```js
var addr = ipaddr.fromByteArray([0x20, 1, 0xd, 0xb8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1])
addr.toString(); // => "2001:db8::1"
```

Both objects also offer a `toByteArray()` method, which returns an array in network byte order (MSB).

For example:
```js
var addr = ipaddr.parse("   n         	 bun.lockb  B             ..     �            	 .eslintrc�    �%            .github                  CHANGELOG.md     g"           
 index.d.ts     �            index.js     #            isObject.d.ts         	        isObject.js     7e     
        LICENSE     B            package.json     O!           	 README.md     �$            RequireObjectCoercible.d.ts     �            RequireObjectCoercible.js�    �            test     �%            ToObject.d.ts     }            ToObject.js     �            tsconfig.json         serializer.d.ts.map     �.            socket.d.ts     .            socket.d.ts.map     �.           
 timer.d.ts     .            timer.d.ts.map     /           
 types.d.ts      .            types.d.ts.map     /           
 utils.d.ts     (.            utils.d.ts.maprt interface NodeEventTarget extends EventTarget {
            /**
             * Node.js-specific extension to the `EventTarget` class that emulates the
             * equivalent `EventEmitter` API. The only difference between `addListener()` and
             * `addEventListener()` is that `addListener()` will return a reference to the
             * `EventTarget`.
             * @since v14.5.0
             */
            addListener(type: string, listener: (arg: any) => void): this;
            /**
             * Node.js-specific extension to the `EventTarget` class that dispatches the
             * `arg` to the list of handlers for `type`.
             * @since v15.2.0
             * @returns `true` if event listeners registered for the `type` exist,
             * otherwise `false`.
             */
            emit(type: string, arg: any): boolean;
            /**
             * Node.js-specific extension to the `EventTarget` class that returns an array
             * of event `type` names for which event listeners are registered.
             * @since 14.5.0
             */
     X��          `��          p��          ���          ���          ���          ���          ���          ���        	  ���        
  ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��           P��        !  `��        "  p��        #  ���        $  ���        %  ���        &  ���        '  ���        (  ���        )  ���        *  ���        +   ��        ,  ��        -   ��        .  0��        /  @��        0  P��        1  `��        2  p��        3  ���        4  ���        5  ���        6  ���        7  ���        8  ���        9  ���        :  ���        ;   ��        <  ��        =   ��        >  0��        ?  @��        @  P��        A  P��    �   B tion()`** method of the Geolocation interface is used to get the current position of the device.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Geolocation/getCurrentPosition)
     */
    getCurrentPosition(successCallback: PositionCallback, errorCallback?: PositionErrorCallback | null, options?: PositionOptions): void;
    /**
     * The **`watchPosition()`** method of the Geolocation interface is used to register a handler function that will be called automatically each time the position of the device changes.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Geolocation/watchPosition)
     */
    watchPosition(successCallback: PositionCallback, errorCallback?: PositionErrorCallback | null, options?: PositionOptions): number;
}

declare var Geolocation: {
    prototype: Geolocation;
    new(): Geolocation;
};

/**
 * The **`GeolocationCoordinates`** interface represents the position and altitude of the device on Earth, as well    n          srcrp-libvips-linux-x64     ..     �%            FUNDING.yml",
  "description": "A utility package to parse strings",
  "repository": {
    "type": "git",
    "url": "https://github.com/babel/babel.git",
    "directory": "packages/babel-helper-string-parser"
  },
  "homepage": "https://babel.dev/docs/en/next/babel-helper-string-parser",
  "license": "MIT",
  "publishConfig": {
    "access": "public"
  },
  "main": "./lib/index.js",
  "devDependencies": {
    "charcodes": "^0.2.0"
  },
  "engines": {
    "node": ">=6.9.0"
  },
  "author": "The Babel Team (https://babel.dev/team)",
  "exports": {
    ".": {
      "types": "./lib/index.d.ts",
      "default": "./lib/index.js"
    },
    "./package.json": "./package.json"
  },
  "type": "commonjs"
}he altitude of the position in meters above the WGS84 ellipsoid (which defines the nominal sea level surface).
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/GeolocationCoordinates/altitude)
     */
    readonly altitude: number | null;
    /**
     * The **`altitudeAccuracy`** read-only property of the GeolocationCoordinates interface is a strictly positive `double` representing the accuracy, with a 95% confidence level, of the `altitude` expressed in meters.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/GeolocationCoordinates/altitudeAccuracy)
     */
    readonly altitudeAccuracy: number | null;
    /**
     * The **`heading`** read-only property of the GeolocationCoordinates interface is a `double` representing the direction in which the device is traveling.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/GeolocationCoordinates/heading)
     */
    readonly heading: number | null;
    /**
     * The **`latitude`** read-only property of the GeolocationCoordinates interface is a `double` representing the latitude of the position in decimal degrees.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/GeolocationCoordinates/latitude)
     */
    read   o   �    S             ���          ���          ���          ���          ���          ���          ���        	  ���        
   ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��           `��        !  p��        "  ���        #  ���        $  ���        %  ���        &  ���        '  ���        (  ���        )  ���        *   ��        +  ��        ,   ��        -  0��        .  @��        /  P��        0  `��        1  p��        2  ���        3  ���        4  ���        5  ���        6  ���        7  ���        8  ���        9  ���        :   ��        ;  ��        <   ��        =  0��        >  @��        ?  P��        @  `��        A  `��    �   B tate.get(receiver);
};
var _YargsInstance_command, _YargsInstance_cwd, _YargsInstance_context, _YargsInstance_completion, _YargsInstance_completionCommand, _YargsInstance_defaultShowHiddenOpt, _YargsInstance_exitError, _YargsInstance_detectLocale, _YargsInstance_emittedWarnings, _YargsInstance_exitProcess, _YargsInstance_frozens, _YargsInstance_globalMiddleware, _YargsInstance_groups, _YargsInstance_hasOutput, _YargsInstance_helpOpt, _YargsInstance_isGlobalContext, _YargsInstance_logger, _YargsInstance_output, _YargsInstance_options, _YargsInstance_parentRequire, _YargsInstance_parserConfig, _YargsInstance_parseFn, _YargsInstance_parseContext, _YargsInstance_pkgs, _YargsInstance_preservedGroups, _YargsInstance_processArgs, _YargsInstance_recommendCommands, _YargsInstance_shim, _YargsInstance_strict, _YargsInstance_strictCommands, _YargsInstance_strictOptions, _YargsInstance_usage, _YargsInstance_usageConfig, _YargsInstance_versionOpt, _YargsInstance_validation;
import { command   n            �� hub    �   
         ..     �   
         index.js     ��           	 timing.jsrds, evaluation, webhook invocation
-- ============================================

-- ============================================
-- Extend users table with Agent-specific fields
-- ============================================

-- Price per invocation (in credits) - for agents
ALTER TABLE users ADD COLUMN IF NOT EXISTS price_per_call INTEGER DEFAULT 5;
ALTER TABLE users ADD COLUMN IF NOT EXISTS free_trial_remaining INTEGER DEFAULT 3;

-- Webhook URL for agent invocation
ALTER TABLE users ADD COLUMN IF NOT EXISTS webhook_url TEXT;

-- Agent capability description (natural language, shown to users)
ALTER TABLE users ADD COLUMN IF NOT EXISTS capability_description TEXT;

-- Rating and review stats
ALTER TABLE users ADD COLUMN IF NOT EXISTS avg_rating FLOAT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS invocation_count INTEGER DEFAULT 0;

-- ============================================
-- Agent Invocations Table (record each agent call)
-- ============================================
CREATE TABLE IF NOT EXISTS agent_invocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  input TEXT NOT NULL,
  output TEXT,
  status TEXT CHECK (status IN ('pending', 'success', 'failed', 'timeout')) DEFAULT 'pending',
  credits_charged INTEGER DEFAULT 0,
  was_free_trial BOOLEAN DEFAULT FALSE,
  response_time_ms INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agent_invocations_agent ON agent_invocations(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_invocations_requester ON agent_invocations(requester_id);
CREATE INDEX IF NOT EXISTS idx_agent_invocations_status ON agent_invocations(status);
CREATE INDEX x��          ���          ���          ���          ���          ���          ���          ���          ���        	   ��        
  ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��           p��        !  ���        "  ���        #  ���        $  ���        %  ���        &  ���        '  ���        (  ���        )   ��        *  ��        +   ��        ,  0��        -  @��        .  P��        /  `��        0  p��        1  ���        2  ���        3  ���        4  ���        5  ���        6  ���        7  ���        8  ���        9   ��        :  ��        ;   ��        <  0��        =  @��        >  P��        ?  `��        @  p��        A  p��    �   B 
);

CREATE INDEX IF NOT EXISTS idx_agent_evaluations_agent ON agent_evaluations(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_evaluations_score ON agent_evaluations(score DESC);
CREATE INDEX IF NOT EXISTS idx_agent_evaluations_created ON agent_evaluations(created_at DESC);

-- RLS for agent_evaluations
ALTER TABLE agent_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Evaluations are publWAAW,CACpB,IAAI,CAACkC,YAAY,CAACzB,MAAM,EAAE/D,UAAU,CAACD,IAAI,CAACwD,SAAS,CACrD,CAAC,CAAA;AACD,MAAA,OAAA;AACF,KAAA;AAGA,IAAA,IACmC,IAAI,CAACoC,MAAM,IAC5C3F,UAAU,CAACS,iBAAiB,CAAC;AAAEP,MAAAA,QAAQ,EAAE,QAAA;AAAS,KAAC,CAAC,EACpD;MACAF,UAAU,CAACsD,WAAW,CAAC,IAAI,CAACqC,MAAM,CAAC5B,MAAM,CAAC,CAAC,CAAA;AAC3C,MAAA,OAAA;AACF,KAAA;IAWA,IAGE/D,UAAU,CAAC8G,eAAe,CAAC;AAAEnC,MAAAA,IAAI,EAAE5E,IAAAA;AAAK,KAAC,CAAC,IAEzCC,UAAU,CAAC+G,gBAAgB,CAAC;AAAEtE,MAAAA,KAAK,EAAE1C,IAAAA;AAAK,KAAC,CAAC,IAC3CC,UAAU,CAACA,UAAU,CAACgH,eAAe,EAAG,IAEzChH,UAAU,CAACiH,mBAAmB,CAAC;AAAEtC,MAAAA,IAAI,EAAE5E,IAAAA;AAAK,K   n          libmes-lab )�            ..     *�           ! diagnosticMessages.generated.jsons     ��           & create-server-inserted-metadata.js.mapauth.uid() = user_id);

-- ============================================
-- Function: Update agent stats after evaluation
-- ============================================
CREATE OR REPLACE FUNCTION update_agent_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users
  SET
    avg_rating = COALESCE((SELECT AVG(score) FROM agent_evaluations WHERE agent_id = NEW.agent_id)::FLOAT, 0),
    review_count = (SELECT COUNT(*) FROM agent_evaluations WHERE agent_id = NEW.agent_id)
  WHERE id = NEW.agent_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_agent_stats_after_eval
  AFTER INSERT OR UPDATE ON agent_evaluations
  FOR EACH ROW EXECUTE FUNCTION update_agent_stats();

-- ============================================
-- Function: Update agent invocation_count after successful invocation
-- ============================================
CREATE OR REPLACE FUNCTION update_agent_invocation_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'success' THEN
    UPDATE users
    SET invocation_count = invocation_count + 1
    WHERE id = NEW.agent_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_invocation_count
  AFTER UPDATE OF status ON agent_invocations
  FOR EACH ROW EXECUTE FUNCTION update_agent_invocation_count();

-- ============================================
-- Seed/Update existing AI agents with capability data
-- ============================================
UPDATE users SET
  capability_description = '擅长数据分析、数据可视化、数据清洗。支持Python数据处理，可以将原始数据转化为清晰的图表和洞察。',
  price_per_call = 3,
  avg_rating = 4.6,
  review_count = 38,
  invocation_count = 156
WHERE username = 'databot_alpha';

UPDATE users SET
  capability_description = '擅长营销文案、社交媒体内容创作、产品介绍，中英文双语。风格多样，从� ���          ���          ���          ���          ���          ���          ���          ���           ��        	  ��        
   ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��           ���        !  ���        "  ���        #  ���        $  ���        %  ���        &  ���        '  ���        (   ��        )  ��        *   ��        +  0��        ,  @��        -  P��        .  `��        /  p��        0  ���        1  ���        2  ���        3  ���        4  ���        5  ���        6  ���        7  ���        8   ��        9  ��        :   ��        ;  0��        <  @��        =  P��        >  `��        ?  p��        @  ���        A  ���    �   B /Element/click_event) */
    onclick: ((this: GlobalEventHandlers, ev: PointerEvent) => any) | null;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLDialogElement/close_event) */
    onclose: ((this: GlobalEventHandlers, ev: Event) => any) | null;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLCanvasElement/contextlost_event) */
    oncontextlost: ((this: GlobalEventHandlers, ev: Event) => any) | null;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/contextmenu_event) */
    oncontextmenu: ((this: GlobalEventHandlers, ev: PointerEvent) => any) | null;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLCanvasElement/contextrestored_event) */
    oncontextrestored: ((this: GlobalEventHandlers, ev: Event) => any) | null;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/copy_event) */
    oncopy: ((this: GlobalEventHandlers, ev: ClipboardEvent) => any) | null;
           �      ��  .�    u&            ..     K(            FUNDING.ymllue: true });
exports.parse = void 0;
var tslib_1 = require("tslib");
var babel_1 = require("./babel");
var _babel_options_1 = tslib_1.__importDefault(require("./_babel_options"));
// This module is suitable for passing as options.parser when calling
// recast.parse to process Flow code:
//
//   const ast = recast.parse(source, {
//     parser: require("recast/parsers/flow")
//   });
//
function parse(source, options) {
    var babelOptions = (0, _babel_options_1.default)(options);
    babelOptions.plugins.push("jsx", "flow");
    return babel_1.parser.parse(source, babelOptions);
}
exports.parse = parse;
(https://developer.mozilla.org/docs/Web/API/HTMLElement/dragend_event) */
    ondragend: ((this: GlobalEventHandlers, ev: DragEvent) => any) | null;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dragenter_event) */
    ondragenter: ((this: GlobalEventHandlers, ev: DragEvent) => any) | null;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dragleave_event) */
    ondragleave: ((this: GlobalEventHandlers, ev: DragEvent) => any) | null;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dragover_event) */
    ondragover: ((this: GlobalEventHandlers, ev: DragEvent) => any) | null;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/dragstart_event) */
    ondragstart: ((this: GlobalEventHandlers, ev: DragEvent) => any) | null;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/drop_event) */
    ondrop: ((this: GlobalEventHandlers, ev: DragEvent) => any) | null;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/durationchange_event) */
    ondurationchange: ((this: GlobalEventHandlers, ev: Event) => any) | null;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/emptied_event) */
    onemptied: ((this: GlobalEventHandlers,�     �      �    S     �A                                               e�j    ̂F8    �Wj    8�_    �Wj    8�_                                     0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���           ���        !  ���        "  ���        #  ���        $  ���        %  ���        &  ���        '   ��        (  ��        )   ��        *  0��        +  @��        ,  P��        -  `��        .  p��        /  ���        0  ���        1  ���        2  ���        3  ���        4  ���        5  ���        6  ���        7   ��        8  ��        9   ��        :  0��        ;  @��        <  P��        =  `��        >  p��        ?  ���        @  ���        A  ���    �   B developer.mozilla.org/docs/Web/API/HTMLInputElement/invalid_event) */
    oninvalid: ((this: GlobalEventHandlers, ev: Event) => any) | null;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/keydown_event) */
    onkeydown: ((this: GlobalEventHandlers, ev: KeyboardEvent) => any) | null;
    /**
     * @deprecated
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/keypress_event)
     */
    onkeypress: ((this: GlobalEventHandlers, ev: KeyboardEvent) => any) | null;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/keyup_event) */
    onkeyup: ((this: GlobalEventHandlers, ev: KeyboardEvent) => any) | null;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/load_event) */
    onload: ((this: GlobalEventHandlers, ev: Event) => any) | null;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/loadeddata_event) */
    onloadeddata: ((this: Global   n          soule.�    ֧            ..     ק            module-loader.js     U�            module-loader.js.map     �            node-module-loader.js     �            node-module-loader.js.map     U�            route-module-loader.js     ٶ            route-module-loader.js.mapون ${adj} ${issue.minimum.toString()}`;
      }
      case "invalid_format": {
        const _issue = issue as errors.$ZodStringFormatIssues;
        if (_issue.format === "starts_with") return `نَص غير مقبول: يجب أن يبدأ بـ "${issue.prefix}"`;
        if (_issue.format === "ends_with") return `نَص غير مقبول: يجب أن ينتهي بـ "${_issue.suffix}"`;
        if (_issue.format === "includes") return `نَص غير مقبول: يجب أن يتضمَّن "${_issue.includes}"`;
        if (_issue.format === "regex") return `نَص غير مقبول: يجب أن يطابق النمط ${_issue.pattern}`;
        return `${Nouns[_issue.format] ?? issue.format} غير مقبول`;
      }
      case "not_multiple_of":
        return `رقم غير مقبول: يجب أن يكون من مضاعفات ${issue.divisor}`;
      case "unrecognized_keys":
        return `معرف${issue.keys.length > 1 ? "ات" : ""} غريب${issue.keys.length > 1 ? "ة" : ""}: ${util.joinValues(issue.keys, "، ")}`;
      case "invalid_key":
        return `معرف غير مقبول في ${issue.origin}`;
      case "invalid_union":
        return "مدخل غير مقبول";
      case "invalid_element":
        return `مدخل غير مقبول في ${issue.origin}`;
      default:
        return "مدخل غير مقبول";
    }
  };
};

export default function (): { localeError: errors.$ZodErrorMap } {
  return {
    localeError: error(),
  };
}
MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/paste_event) */
    onpaste: ((this: GlobalEventHandlers, ev: ClipboardEvent) => any) | null;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTML   o   �    �s            ���    �     ���          ���          ���          ���           ��          ��        	   ��        
  0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���           ���        !  ���        "  ���        #  ���        $  ���        %  ���        &  ���        '   ��        (  ��        )   ��        *  0��        +  @��        ,  P��        -  `��        .  p��        /  ���        0  ���        1  ���        2  ���        3  ���        4  ���        5  ���        6  ���        7   ��        8  ��        9   ��        :  0��        ;  @��        <  P��        =  `��        >  p��        ?  ���        @  ���        A  ���    �   B �[���8t^L��A������b���H�L$(�T   H��H�=D� I��1�s: GlobalEventHandlers, ev: PointerEvent) => any) | null;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointermove_event) */
    onpointermove: ((this: GlobalEventHandlers, ev: PointerEvent) => any) | null;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerout_event) */
    onpointerout: ((this: GlobalEventHandlers, ev: PointerEvent) => any) | null;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerover_event) */
    onpointerover: ((this: GlobalEventHandlers, ev: PointerEvent) => any) | null;
    /**
     * Available only in secure contexts.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerrawupdate_event)
     */
    onpointerrawupdate: ((this: GlobalEventHandlers, ev: Event) => any) | null;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element/pointerup_event) */
    onpointer   (            �� e.tsypesd.tsA�  ��       ..     	s           & 4aa8b8c15fd82195f345885c840811ec13c8f9     yC            & f7eb83bb73deaee68ccc092a5aa67a22311c9anprogress: ((this: GlobalEventHandlers, ev: ProgressEvent) => any) | null;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/ratechange_event) */
    onratechange: ((this: GlobalEventHandlers, ev: Event) => any) | null;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLFormElement/reset_event) */
    onreset: ((this: GlobalEventHandlers, ev: Event) => any) | null;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLVideoElement/resize_event) */
    onresize: ((this: GlobalEventHandlers, ev: UIEvent) => any) | null;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/scroll_event) */
    onscroll: ((this: GlobalEventHandlers, ev: Event) => any) | null;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/scrollend_event) */
    onscrollend: ((this: GlobalEventHandlers, ev: Event) => any) | null;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/securitypolicyviolation_event) */
    onsecuritypolicyviolation: ((this: GlobalEventHandlers, ev: SecurityPolicyViolationEvent) => any) | null;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/seeked_event) */
    onseeked: ((this: GlobalEventHandlers, ev: Event) => any) | null;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLMediaElement/seeking_event) */
    onseeking: ((this: GlobalEventHandlers, ev: Event) => any) | null;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLInputElement/select_event) */
    onselect: ((this: GlobalEventHandlers, ev: Event) => any) | null;
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document/selectionchange_event) */
    onselectionchange: ((this: GlobalEventHandlers, ev: Event) => any) | null;
    /** [MDN Reference](https: ���          ���          ���          ���          ���           ��          ��           ��          0��        	  @��        
  P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���           ���        !  ���        "  ���        #  ���        $  ���        %   ��        &  ��        '   ��        (  0��        )  @��        *  P��        +  `��        ,  p��        -  ���        .  ���        /  ���        0  ���        1  ���        2  ���        3  ���        4  ���        5   ��        6  ��        7   ��        8  0��        9  @��        :  P��        ;  `��        <  p��        =  ���        >  ���        ?  ���        @  ���        A  ���    �   B mands ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE demands ADD COLUMN IF NOT EXISTS budget_credits INTEGER DEFAULT 0;
ALTER TABLE demands ADD COLUMN IF NOT EXISTS submission_url TEXT;

-- Update status constraint to include 'assigned' state
ALTER TABLE demands DROP CONSTRAINT IF EXISTS demands_status_check;
ALTER TABLE demands ADD CONSTRAINT demands_status_check
  CHECK (status IN ('open', 'assigned', 'in_progress', 'completed', 'cancelled'));

-- 4. posts table: add hot_score column
ALTER TABLE posts ADD COLUMN IF NOT EXISTS hot_score FLOAT DEFAULT 0;

-- 5. New post_likes table for tracking likes
CREATE TABLE IF NOT EXISTS post_likes (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);

-- 6. Hot score calculation function
CREATE OR R        �         .�    9%             ..     yO             eslint-recommended-raw.d.ts     <             eslint-recommended-raw.js�    R%             eslintrc�    Q&             flat-head-in-cache.d.ts     �            find-head-in-cache.js     ��            find-head-in-cache.js.map     C�    	       + has-interception-route-in-current-tree.d.ts     �    
       ) has-interception-route-in-current-tree.js     k�           - has-interception-route-in-current-tree.js.map     X�            hmr-refresh-reducer.d.ts     �            hmr-refresh-reducer.js     ��            hmr-refresh-reducer.js.map     ��            navigate-reducer.d.ts     ��            navigate-reducer.js     t�            navigate-reducer.js.map     ��            refresh-reducer.d.ts     ��            refresh-reducer.js     R�            refresh-reducer.js.map     ��            restore-reducer.d.ts     -�            restore-reducer.js     ��            restore-reducer.js.map     B�            server-action-reducer.d.ts     Ϋ            server-action-reducer.js     4�            server-action-reducer.js.map     K�            server-patch-reducer.d.ts     ߫            server-patch-reducer.js     E�            server-patch-reducer.js.map ROW EXECUTE FUNCTION posts_search_vector_update();

ALTER TABLE demands ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;
CREATE INDEX IF NOT EXISTS idx_demands_search ON demands USING GIN(search_vector);

CREATE OR REPLACE FUNCTION demands_search_vector_update() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('simple', COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.description, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_demands_search_vector ON demands;
CREATE TRIGGER trg_demands_search_vector
  BEFORE INSERT OR UPDATE OF title, description ON demands
  FOR EACH ROW EXECUTE FUNCTION demands_search_vector_update();

-- 10. RLS po�     �      �    "    0�A                                               ��j    �&�.    �vj    �q�    �vj    �q�                                     `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���           ���        !  ���        "  ���        #  ���        $   ��        %  ��        &   ��        '  0��        (  @��        )  P��        *  `��        +  p��        ,  ���        -  ���        .  ���        /  ���        0  ���        1  ���        2  ���        3  ���        4   ��        5  ��        6   ��        7  0��        8  @��        9  P��        :  `��        ;  p��        <  ���        =  ���        >  ���        ?  ���        @  ���        A  ���    �   B ause adding `// @ts-nocheck` even once will ignore every error in the file.
      createCodeFixActionWithoutFixAll(
        fixName4,
        [createFileTextChanges(sourceFile.fileName, [
          createTextChange(
            sourceFile.checkJsDirective ? createTextSpanFromBounds(sourceFile.checkJsDirective.pos, sourceFile.checkJsDirective.end) : createTextSpan(0, 0),
            `// @ts-nocheck${newLineCharacter}`
          )
        ])],
        Diagnostics.Disable_checking_for_this_file
      )
    ];
    if (ts_textChanges_exports.isValidLocationToAddComment(sourceFile, span.start)) {
      fixes.unshift(createCodeFixAction(fixName4, ts_textChanges_exports.ChangeTracker.with(context, (t) => makeChange9(t, sourceFile, span.start)), Diagnostics.Ignore_this_error_message, fixId42, Diagnostics.Add_ts_ignore_to_all_error_messages));
    }
    return fixes;
  },
  fixIds: [fixId42],
  getAllCodeActions: (context) => {
    const seenLines = /* @__PURE__ */ new Set();
    return         �      ��  .�    j�             ..     v�             typed-array-objects.jsocationToAddComment(diag2.file, diag2.start)) {
        makeChange9(changes, diag2.file, diag2.start, seenLines);
      }
    });
  }
});
function makeChange9(changes, sourceFile, position, seenLines) {
  const { line: lineNumber } = getLineAndCharacterOfPosition(sourceFile, position);
  if (!seenLines || tryAddToSet(seenLines, lineNumber)) {
    changes.insertCommentBeforeLine(sourceFile, lineNumber, position, " @ts-ignore");
  }
}

// src/services/codefixes/helpers.ts
function createMissingMemberNodes(classDeclaration, possiblyMissingSymbols, sourceFile, context, preferences, importAdder, addClassElement) {
  const classMembers = classDeclaration.symbol.members;
  for (const symbol of possiblyMissingSymbols) {
    if (!classMembers.has(symbol.escapedName)) {
      addNewNodeForMemberSym��   H���   L�`I�,H�PH��   ZL��[]A\A]�ATUSH���   H��L���   M��tI�$I�|$H���   �?��L���?����H��P  �?��H�}0�v���}d tH�� H�}`�P0�}l tH�4� H�}h�PH����>��1�Hǃ�       []A\�AWAVAUATI��USH��hL���   dH�%(   H�D$X1�I���   I���   H��t6H�uL��H�UH)�谾����t
������.  H�EH+EH�m I��   ��M���   H�l$L�l$L��H)�H�D$�����H9�"H9D$I���   ��  wA���   �  1��   H���H��M� I9�vH9�sH��M� H9�sH9�w��,   L��8   �D$PK����I���   H�|$0�D$$- - �u���I���   H�|$8�d���H�t$H�|$@�U���H�|$HH���H���H��L��誽���������I���   8�   H���H�BM� I9�v	H9��S���H9�vH�,M� H9��>���H�|$ L���   �D$PK�����H��L���D$(   �9����������I���   1��   H���H��L� I9�v	H9������H��L� H9�s	H9������I���   �D$PKH=��  v���  f�D$ ���f�D$"�����H9D$D��)�H�|$$������:���H9�~�����H�|$(�޺   ����H��L��脼���������I���   H�\$XdH+%(   t�+��H��h[]A\A]A^A_�SH���   H�� �?@�t$H�t$dH�%(   H�D$1�������{H�t$�   �Љ��C��i�����C���D$�����ЉCH�D$dH+%(   t�+��H�� [����AWAVAUE1�ATA�   USH��xdH�%(   H�D$h1�L�t$���    LE�A��L��N�,�   L���EL  ��t1��   H�-?� H�\$&PL��I�D$L��I��H�A��  �   PH�=�ʀ �U ZY��u ���          ���          ���           ��          ��           ��          0��          @��          P��        	  `��        
  p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���           ���        !  ���        "  ���        #   ��        $  ��        %   ��        &  0��        '  @��        (  P��        )  `��        *  p��        +  ���        ,  ���        -  ���        .  ���        /  ���        0  ���        1  ���        2  ���        3   ��        4  ��        5   ��        6  0��        7  @��        8  P��        9  `��        :  p��        ;  ���        <  ���        =  ���        >  ���        ?  ���        @  ���        A  ���    �   B ecker = context.program.getTypeChecker();
  const scriptTarget = getEmitScriptTarget(context.program.getCompilerOptions());
  const kind = (declaration == null ? void 0 : declaration.kind) ?? 171 /* PropertySignature */;
  const declarationName = createDeclarationName(symbol, declaration);
  const effectiveModifierFlags = declaration ? getEffectiveModifierFlags(declaration) : 0 /* None */;
  let modifierFlags = effectiveModifierFlags & 256 /* Static */;
  modifierFlags |= effectiveModifierFlags & 1 /* Public */ ? 1 /* Public */ : effectiveModifierFlags & 4 /* Protected */ ? 4 /* Protected */ : 0 /* None */;
  if (declaration && isAutoAccessorPropertyDeclaration(declaration)) {
    modifierFlags |= 512 /* Accessor */;
  }
  const modifiers = createModifiers();
  const type = checker.getWidenedType(checker.getTypeOfSymbolAtLocation(symbol, enclosingDeclaration));
  const optional = !!(symbol.flags & 16777216 /* Optional */);
  const ambient = !!(enclosingDeclaration.flags & 33554   n          src .�    �             ..     I             .editorconfig     ze            	 .eslintrc�    �            .github     I            .nycrc     5            CHANGELOG.md     v            index.js         	        LICENSE     �    
        package.json     �           	 README.md  let typeNode = checker.typeToTypeNode(type, enclosingDeclaration, flags, 8 /* AllowUnresolvedNames */, getNoopSymbolTrackerWithResolver(context));
      if (importAdder) {
        const importableReference = tryGetAutoImportableReferenceFromTypeNode(typeNode, scriptTarget);
        if (importableReference) {
          typeNode = importableReference.typeNode;
          importSymbols(importAdder, importableReference.symbols);
        }
      }
      addClassElement(factory.createPropertyDeclaration(
        modifiers,
        declaration ? createName(declarationName) : symbol.getName(),
        optional && preserveOptional & 2 /* Property */ ? factory.createToken(58 /* QuestionToken */) : void 0,
        typeNode,
        /*initializer*/
        void 0
      ));
      break;
    case 177 /* GetAccessor */:
    case 178 /* SetAccessor */: {
      Debug.assertIsDefined(declarations);
      let typeNode2 = checker.typeToTypeNode(
        type,
        enclosingDeclaration,
        flags,
        /*internalFlags*/
        void 0,
        getNoopSymbolTrackerWithResolver(context)
      );
      const allAccessors = getAllAccessorDeclarations(declarations, declaration);
      const orderedAccessors = allAccessors.secondAccessor ? [allAccessors.firstAccessor, allAccessors.secondAccessor] : [allAccessors.firstAccessor];
      if (importAdder) {
        const importableReference = tryGetAutoImportableReferenceFromTypeNode(typeNode2, scriptTarget);
        if (importableReference) {
          typeNode2 = importableReference.typeNode;
          importSymbols(importAdder, importableReference.symbols);
        }
      }
      for (const accessor of orderedAccessors) {
        if (is   o   �    S          �A                                               d�j    ,v39    ��j    \+G	    ��j    \+G	                                     ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���           ���        !  ���        "   ��        #  ��        $   ��        %  0��        &  @��        '  P��        (  `��        )  p��        *  ���        +  ���        ,  ���        -  ���        .  ���        /  ���        0  ���        1  ���        2   ��        3  ��        4   ��        5  0��        6  @��        7  P��        8  `��        9  p��        :  ���        ;  ���        <  ���        =  ���        >  ���        ?  ���        @  ���        A  ���    �   B rge')),
  ADD COLUMN IF NOT EXISTS compact_mode           BOOLEAN DEFAULT false;
ned(declarations);
      const signatures = type.isUnion() ? flatMap(type.types, (t) => t.getCallSignatures()) : type.getCallSignatures();
      if (!some(signatures)) {
        break;
      }
      if (declarations.length === 1) {
        Debug.assert(signatures.length === 1, "One declaration implies one signature");
        const signature = signatures[0];
        outputMethod(quotePreference, signature, modifiers, createName(declarationName), createBody(body, quotePreference, ambient));
        break;
      }
      for (const signature of signatures) {
        if (signature.declaration && signature.declaration.flags & 33554432 /* Ambient */) {
          continue;
        }
        outputMethod(quotePreference, signature, modifiers, createName(declarationName));
      }
      if (!ambient) {
        if (declarations.length > signatures.length) {
          const signature = checker.getSignatureFro        �         .�    /-            ..�    bx            dist     �            index.d.mts     ڀ           
 index.d.ts     ax            license     �}            package.json     G~           	 readme.md�    �z    	        sync boolSchema.js.map     ��   
 	        dataType.d.ts     ��    
        dataType.js     �            dataType.js.map     ��   
         defaults.d.ts     #�            defaults.js     ��            defaults.js.map     ��   
        
 index.d.ts     �            index.js     �            index.js.map     ��   
         keyword.d.ts     ��           
 keyword.js     ��            keyword.js.map     $�            subschema.d.ts     U�            subschema.js     ��            subschema.js.map & 1 /* Method */), enclosingDeclaration, importAdder);
    if (method) addClassElement(method);
  }
  function createModifiers() {
    let modifiers2;
    if (modifierFlags) {
      modifiers2 = combine(modifiers2, factory.createModifiersFromModifierFlags(modifierFlags));
    }
    if (shouldAddOverrideKeyword()) {
      modifiers2 = append(modifiers2, factory.createToken(164 /* OverrideKeyword */));
    }
    return modifiers2 && factory.createNodeArray(modifiers2);
  }
  function shouldAddOverrideKeyword() {
    return !!(context.program.getCompilerOptions().noImplicitOverride && declaration && hasAbstractModifier(declaration));
  }
  function createName(node) {
    if (isIdentifier(node) && node.escapedText === "constructor") {
      return factory.createComputedPropertyName(factory.createStringLiteral(idText(node), quotePreference === 0 /* Single */));
    }
    return getSynthesizedDeepClone(
      node,
      /*includeTrivia*/
      false
    );
  }
  function createBody(block, quotePreference2, ambient2) {
    return ambient2 ? void 0 : getSynthesizedDeepClone(
      block,
      /*includeTrivia*/
      false
    ) || createStubbedMethodBody(quotePreference2);
  }
  function create�     �      �    �<    �A                                               d�j    ���-    &-j    �<�    &-j    �<�                                     ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���           ���        !   ��        "  ��        #   ��        $  0��        %  @��        &  P��        '  `��        (  p��        )  ���        *  ���        +  ���        ,  ���        -  ���        .  ���        /  ���        0  ���        1   ��        2  ��        3   ��        4  0��        5  @��        6  P��        7  `��        8  p��        9  ���        :  ���        ;  ���        <  ���        =  ���        >  ���        ?  ���        @  ���        A  ���    �   B (quotePreference === 0 /* Single */ ? 268435456 /* UseSingleQuotesForStringLiteralType */ : 0 /* None */);
  const signatureDeclaration = checker.signatureToSignatureDeclaration(signature, kind, enclosingDeclaration, flags, 8 /* AllowUnresolvedNames */, getNoopSymbolTrackerWithResolver(context));
  if (!signatureDeclaration) {
    return void 0;
  }
  let typeParameters = isJs ? void 0 : signatureDeclaration.typeParameters;
  let parameters = signatureDeclaration.parameters;
  let type = isJs ? void 0 : getSynthesizedDeepClone(signatureDeclaration.type);
  if (importAdder) {
    if (typeParameters) {
      const newTypeParameters = sameMap(typeParameters, (typeParameterDecl) => {
        let constraint = typeParameterDecl.constraint;
        let defaultType = typeParameterDecl.default;
        if (constraint) {
          const importableReference = tryGetAutoImportableReferenceFromTypeNode(constraint, scriptTarget);
          if (importableReference) {
            constraint =         �      ��  .�    Sy            ..     �{           	 buffer.js     �|            buffer.js.map�    ~           
 generators     Ǌ            index.js     �            index.js.map�    1�            node     �    	        nodes.js     �    
        nodes.js.map     0�           
 printer.js     h�            printer.js.map                 source-map.js     ،            source-map.js.map     �            token-map.js     "�            token-map.js.maperDecl.modifiers,
          typeParameterDecl.name,
          constraint,
          defaultType
        );
      });
      if (typeParameters !== newTypeParameters) {
        typeParameters = setTextRange(factory.createNodeArray(newTypeParameters, typeParameters.hasTrailingComma), typeParameters);
      }
    }
    const newParameters = sameMap(parameters, (parameterDecl) => {
      let type2 = isJs ? void 0 : parameterDecl.type;
      if (type2) {
        const importableReference = tryGetAutoImportableReferenceFromTypeNode(type2, scriptTarget);
        if (importableReference) {
          type2 = importableReference.typeNode;
          importSymbols(importAdder, importableReference.symbols);
        }
      }
      return factory.updateParameterDeclaration(
        parameterDecl,
        parameterDecl.modifiers,
        parameterDecl.dotDotDotToken,
        parameterDecl.name,
        isJs ? void 0 : parameterDecl.questionToken,
        type2,
        parameterDecl.initializer
      );
    });
    if (parameters !== newParameters) {
      parameters = setTextRange(factory.createNodeArray(newParameters, parameters.hasTrailingComma), parameters);
    }
    if (type) {
      const importableReference = tryGetAutoImportableReferenceFromTypeNode(type, scriptTarget);
      if (importableReference) {
        type = importableReference.typeNode;
        importSymbols(importAdder, importableReference.symbols);
      }
    }
  }
  const questionToken = optional ? factory.createToken(58 �     �      �    "    0�A                                               ��j    �&�.    �vj    �q�    �vj    �q�                                     ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���            ��        !  ��        "   ��        #  0��        $  @��        %  P��        &  `��        '  p��        (  ���        )  ���        *  ���        +  ���        ,  ���        -  ���        .  ���        /  ���        0   ��        1  ��        2   ��        3  0��        4  @��        5  P��        6  `��        7  p��        8  ���        9  ���        :  ���        ;  ���        <  ���        =  ���        >  ���        ?  ���        @   ��        A   ��    �   B ==========
CREATE TABLE IF NOT EXISTS agent_invocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  input TEXT NOT NULL,
  output TEXT,
  status TEXT CHECK (status IN ('success', 'failed', 'timeout', 'pending')) DEFAULT 'pending',
  credits_charged INTEGER DEFAULT 0,
  response_time_ms INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Agent Evaluations (Simple 3-Question Review)
-- ============================================
CREATE TABLE IF NOT EXISTS agent_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message that describes the validation constraints that the button control does not satisfy (if any).
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/HT        �      cli EFERENCES users(id) ON DELETE CASCADE,
  invocation_id UUID REFERENCES agent_invocations(id) ON DELETE SET NULL,
  score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
  helpful BOOLEAN NOT NULL DEFAULT TRUE,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, user_id)
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_webhook_url ON users(webhook_url) WHERE webhook_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_invocations_agent ON agent_invocations(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_invocations_user ON agent_invocations(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_invocations_status ON agent_invocations(status);
CREATE INDEX IF NOT EXISTS idx_agent_evaluations_agent ON agent_evaluations(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_evaluations_user ON agent_evaluations(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_evaluations_score ON agent_evaluations(score);

-- ============================================
-- Functions
-- ============================================

-- Recalculate agent's avg_rating and evaluation_count after insert/update/delete
CREATE OR REPLACE FUNCTION update_agent_rating_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users
  SET
    avg_rating = COALESCE((SELECT AVG(score) FROM agent_evaluations WHERE agent_id = NEW.agent_id), 0),
    evaluation_count = (SELECT COUNT(*) FROM agent_evaluations WHERE agent_id = NEW.agent_id)
  WHERE id = NEW.agent_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_agent_rating
  AFTER INSERT OR UPDATE ON agent_evaluations
  FOR EACH ROW EXECUTE FUNCTION update_agent_rating_stats();

-- Auto-increment total_invocations on successful invocation
CREATE OR REPLACE FUNCTION increment_agent_invocations()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'success' THEN
    UPDATE users SET total_invocations = total_invocations + 1 WHERE id = NEW.agent_id;
  END IF;
  RETURN NEW;
END ��           ��          0��          @��          P��          `��          p��          ���          ���        	  ���        
  ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��           ��        !   ��        "  0��        #  @��        $  P��        %  `��        &  p��        '  ���        (  ���        )  ���        *  ���        +  ���        ,  ���        -  ���        .  ���        /   ��        0  ��        1   ��        2  0��        3  @��        4  P��        5  `��        6  p��        7  ���        8  ���        9  ���        :  ���        ;  ���        <  ���        =  ���        >  ���        ?   ��        @  ��        A  ��    �   B ITH CHECK (auth.uid() = user_id);

-- Agent evaluations: users can update their own
CREATE POLICY "Users can update own evaluations"
  ON agent_evaluations FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- Update seed data with agent fields
-- ============================================
UPDATE users SET
  webhook_url = 'https://example.com/webhooks/databot-alpha',
  price_per_call = 3,
  free_trial_count = 5,
  capabilities = ARRAY['数据分析', '可视化', '数据清洗', 'Python'],
  avg_rating = 4.5,
  evaluation_count = 127,
  total_invocations = 3421
WHERE username = 'databot_alpha';

UPDATE users SET
  webhook_url = 'https://example.com/webhooks/creative-ai7',
  price_per_call = 5,
  free_trial_count = 5,
  capabilities = ARRAY['文案写作', '配图生成', '内容发布', '营销'],
  avg_rating = 4.3,
  evaluation_count = 89,
  total_invocations = 1523
WHERE username = 'creative_ai7';
t: true });
    }
    createDirecto   n          page.tsx    ��    P     ��    �    maObject } from "../../types";
import { _JTDTypeError } from "./error";
export type JTDValuesError = _JTDTypeError<"values", "object", SchemaObject>;
declare const def: CodeKeywordDefinition;
export default def;
ullOrUndefined(this.getDirectory(dirPath), message ?? (() => `Could not find a directory at the specified path: ${this._context.fileSystemWrapper.getStandardizedAbsolutePath(dirPath)}`));
    }
    getDirectory(dirPath) {
        const { compilerFactory } = this._context;
        return compilerFactory.getDirectoryFromCache(this._context.fileSystemWrapper.getStandardizedAbsolutePath(dirPath));
    }
    getDirectories() {
        return Array.from(this.#getProjectDirectoriesByDirectoryDepth());
    }
    getRootDirectories() {
        const { inProjectCoordinator } = this._context;
        const result = [];
        for (const dir of this._context.compilerFactory.getOrphanDirectories()) {
            for (const inProjectDir of findInProjectDirectories(dir))
                result.push(inProjectDir);
        }
        return result;
        function* findInProjectDirectories(dir) {
            if (inProjectCoordinator.isDirectoryInProject(dir)) {
                yield dir;
                return;
            }
            for (const childDir of dir._getDirectoriesIterator())
                yield* findInProjectDirectories(childDir);
        }
    }
    addSourceFilesAtPaths(fileGlobs) {
        return this._context.directoryCoordinator.addSourceFilesAtPaths(fileGlobs, { markInProject: true });
    }
    addSourceFileAtPathIfExists(filePath) {
        return this._context.directoryCoordinator.addSourceFileAtPathIfExists(this._context.fileSystemWrapper.getStandardizedAbsolutePath(filePath), {
            markInProject: true,
        });
    }
    addSourceFileAtPath(filePath) {
        return this._context.directoryCoordinator.addSourceFileAtPath(this._context.fileSystemWrapper.getStandardizedAbsolutePath(filePath), {
            markInProject:    o        +t            @��          P��          `��          p��          ���          ���          ���        	  ���        
  ���          ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��            ��        !  0��        "  @��        #  P��        $  `��        %  p��        &  ���        '  ���        (  ���        )  ���        *  ���        +  ���        ,  ���        -  ���        .   ��        /  ��        0   ��        1  0��        2  @��        3  P��        4  `��        5  p��        6  ���        7  ���        8  ���        9  ���        :  ���        ;  ���        <  ���        =  ���        >   ��        ?  ��        @   ��        A   ��    �   B odule.envObject || (napiModule.envObject = emnapiCtx.createEnv(napiModule.filename, moduleApiVersion, function (cb) { return (wasmTable.get(cb)); }, function (cb) { return (wasmTable.get(cb)); }, abort, emnapiNodeBinding));
                    var scope_1 = emnapiCtx.openScope(envObject);
                    try {
                        envObject.callIntoModule(function (_envObject) {
                            var exports = napiModule.exports;
                            var exportsHandle = scope_1.add(exports);
                            var napi_register_wasm_v1 = instance.exports.napi_register_wasm_v1;
                            var napiValue = napi_register_wasm_v1(_envObject.id, exportsHandle.id);
                            napiModule.exports = (!napiValue) ? exports : emnapiCtx.handleStore.get(napiValue).value;
                        });
                    }
                    finally {
                        emnapiCtx.closeScope(envObject, scope_1);
              n          api  .�    w             ..     �d             .editorconfig     wf             .nycrc�     -            2015�    -            2016�    %-            2017�    6-            2018�    I-    	        2019�    _-    
        2020�    v-            2021�    �-            2022�    �-            2023�    �-            2024�    �-            2025�    �-            5     yV            CHANGELOG.md     y8           	 es2015.js     ~8           	 es2016.js     �8           	 es2017.js     �8           	 es2018.js     �8           	 es2019.js     �8           	 es2020.js     �8           	 es2021.js     �8           	 es2022.js     �8           	 es2023.js     �8           	 es2024.js     �8           	 es2025.js     �8            es5.js     �8            es6.js     �8            es7.js     �V             eslint.config.mjs     �9    !        GetIntrinsic.js�    �0    "        helpers     �<    #        index.js     �    $        LICENSE�    �    %       
 operations     uV    &        package.json     ~V    '       	 README.mdndsWith(def.getFilePath(), fileNameOrPath);
        }
        function isStandardizedFilePath(obj) {
            return typeof obj === "string";
        }
    }
    getSourceFiles(globPatterns) {
        const { compilerFactory, fileSystemWrapper } = this._context;
        const sourceFiles = this.#getProjectSourceFilesByDirectoryDepth();
        if (typeof globPatterns === "string" || globPatterns instanceof Array)
            return Array.from(getFilteredSourceFiles());
        else
            return Array.from(sourceFiles);
        function* getFilteredSourceFiles() {
            const sourceFilePaths = Array.from(getSourceFilePaths());
            const matchedPaths = common.matchGlobs(sourceFilePaths, globPatterns, fileSystemWrapper.getCurrentDirectory());
            for (const matchedPath of matchedPaths)
       8��          @��          P��          `��          p��          ���          ���          ���          ���        	  ���        
  ���          ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��           0��        !  @��        "  P��        #  `��        $  p��        %  ���        &  ���        '  ���        (  ���        )  ���        *  ���        +  ���        ,  ���        -   ��        .  ��        /   ��        0  0��        1  @��        2  P��        3  `��        4  p��        5  ���        6  ���        7  ���        8  ���        9  ���        :  ���        ;  ���        <  ���        =   ��        >  ��        ?   ��        @  0��        A  0��    �   B ding;
        }
        var emnapiAsyncWorkPoolSize = 0;
        if ('asyncWorkPoolSize' in options) {
            if (typeof options.asyncWorkPoolSize !== 'number') {
                throw new TypeError('options.asyncWorkPoolSize must be a integer');
            }
            emnapiAsyncWorkPoolSize = options.asyncWorkPoolSize >> 0;
            if (emnapiAsyncWorkPoolSize > 1024) {
                emnapiAsyncWorkPoolSize = 1024;
            }
            else if (emnapiAsyncWorkPoolSize < -1024) {
                emnapiAsyncWorkPoolSize = -1024;
            }
        }
        var singleThreadAsyncWork = ENVIRONMENT_IS_PTHREAD ? false : (emnapiAsyncWorkPoolSize <= 0);
        function _emnapi_async_work_pool_size() {
            return Math.abs(emnapiAsyncWorkPoolSize);
        }
        napiModule.imports.env._emnapi_async_work_pool_size = _emnapi_async_work_pool_size;
        // ------------------------------ pthread -------------------------------
        function emnapiAdd   x         	 AGENTS.mdes, and utility functions
-- UpAgora — user media uploads and feed helpers

-- 1. Create storage bucket for user uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('user-uploads', 'user-uploads', true, 52428800, ARRAY['image/png','image/jpeg','image/gif','image/webp','application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- 2. RLS: users can only upload to their own folder
CREATE POLICY "Users can upload to their own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'user-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view public uploads"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'user-uploads');

CREATE POLICY "Users can update their own uploads"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'user-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own uploads"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'user-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3. Function: get trending posts (last 24h, sorted by engagement)
CREATE OR REPLACE FUNCTION get_trending_posts(limit_count INTEGER DEFAULT 20)
RETURNS SETOF posts
LANGUAGE sql STABLE
AS $$
  SELECT * FROM posts
  WHERE created_at >= NOW() - INTERVAL '24 hours'
  AND visibility = 'public'
  ORDER BY (upvotes_count + comments_count + CASE WHEN user_type = 'ai' THEN 2 ELSE 0 END) DESC
  LIMIT limit_count;
$$;

-- 4. Function: get user stats
CREATE OR REPLACE FUNCTION get_user_stats(user_id UUID)
RETURNS JSON
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'posts_count', (SELECT COUNT(*) FROM posts WHERE user_id = $1),
    'demands_count', (SELECT COUNT(*) FROM demands WHERE created_by = $1),
    'total_upvotes', (SELECT COALESCE(SUM(upvotes_count), 0) FROM posts WHERE user_id = $1),
    'followers_count', (SELECT COUNT(*) FROM follows WHERE followee_id = $1)   y         P��          `��          p��          ���          ���          ���          ���          ���        	  ���        
  ���          ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��           @��        !  P��        "  `��        #  p��        $  ���        %  ���        &  ���        '  ���        (  ���        )  ���        *  ���        +  ���        ,   ��        -  ��        .   ��        /  0��        0  @��        1  P��        2  `��        3  p��        4  ���        5  ���        6  ���        7  ���        8  ���        9  ���        :  ���        ;  ���        <   ��        =  ��        >   ��        ?  0��        @  @��        A  @��    �   B (d.title ILIKE '%' || $1 || '%' OR d.content ILIKE '%' || $1 || '%')
  ORDER BY score DESC
  LIMIT $2 OFFSET $3;
$$;
a) {
            emnapiCtx.feature.setImmediate(function () {
                (wasmTable.get(callback))(data);
            });
        }
        /**
         * @__sig vpp
         */
        function _emnapi_next_tick(callback, data) {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            Promise.resolve().then(function () {
                (wasmTable.get(callback))(data);
            });
        }
        /**
         * @__sig vipppi
         */
        function _emnapi_callback_into_module(forceUncaught, env, callback, data, close_scope_if_throw) {
            var envObject = emnapiCtx.envStore.get(env);
            var scope = emnapiCtx.openScope(envObject);
            try {
                envObject.callbackIntoModule(Boolean(forceUncaught), function () {
                    (wasmTable.get(callback))(env, data);
                �         .�    ~            ..     f           
 core-js.js     �            get-own-property-symbols.js      swc-linux-x64-gnu�    R             swc-linux-x64-musl�    Ƙ            swc-win32-x64-msvc    4�            metadata.d.ts.map     Җ    	        metadata.js     8�    
        metadata.js.map     �            register.d.ts     ��   
         register.d.ts.map     �            register.js     ��   	         register.js.map     +�            revoke.d.ts     �            revoke.d.ts.map     ��           	 revoke.js     �   	         revoke.js.map     ��           
 token.d.ts     ��            token.d.ts.map     �   
         token.js     ��            token.js.map         * @__sig v
         */
        function _emnapi_ctx_decrease_waiting_request_counter() {
            emnapiCtx.decreaseWaitingRequestCounter();
        }
        function $emnapiSetValueI64(result, numberValue) {
            var tempDouble;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var tempI64 = [
                numberValue >>> 0,
                (tempDouble = numberValue, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math.min(+Math.floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)
            ];
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            HEAP_DATA_VIEW.setInt32(result, tempI64[0], true);
            HEAP_DATA_VIEW.setInt32(result + 4, tempI64[1], true);
        }
        var utilMod = /*#__PURE__*/ Object.freeze({
            __proto__: null,
            $emnapiSetValueI64: $emnapiSetValueI64,
            _emnapi_call_finalizer: _emnapi_call_finalizer,
            _emnapi_callback_into_module: _emnapi_callback_into_module,
            _emnapi_ctx_decrease_waiting_request_counter: _emnapi_ctx_decrease_waiting_request_counter,
            _emnapi_ctx_increase_waitin X��          `��          p��          ���          ���          ���          ���          ���          ���        	  ���        
  ���           ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��           P��        !  `��        "  p��        #  ���        $  ���        %  ���        &  ���        '  ���        (  ���        )  ���        *  ���        +   ��        ,  ��        -   ��        .  0��        /  @��        0  P��        1  `��        2  p��        3  ���        4  ���        5  ���        6  ���        7  ���        8  ���        9  ���        :  ���        ;   ��        <  ��        =   ��        >  0��        ?  @��        @  P��        A  P��    �   B ar tidOffset = 20;
            var tid = view.getInt32(pthreadPtr + tidOffset, true);
            var worker = PThread.pthreads[tid];
            return worker;
        }
        /** @__sig vp */
        function _emnapi_worker_unref(pthreadPtr) {
            if (ENVIRONMENT_IS_PTHREAD)
                return;
            var worker = emnapiGetWorkerByPthreadPtr(pthreadPtr);
            if (worker && typeof worker.unref === 'function') {
                worker.unref();
            }
        }
        /** @__sig vipp */
        function _emnapi_async_send_js(type, callback, data) {
            if (ENVIRONMENT_IS_PTHREAD) {
                var postMessage_1 = napiModule.postMessage;
                postMessage_1({
                    __emnapi__: {
                        type: 'async-send',
                        payload: {
                            callback: callback,
                            data: data
                        }
                    }
                });
     x            ��  .�    t�            ..�    0�            dev-tools-indicator�    u�            dialog�    u�            environment-name-label�    ��            error-message�    ��            error-overlay�    ��            error-overlay-bottom-stack�    ��    	        error-overlay-call-stack�    |�    
        error-overlay-footer�    ��            error-overlay-layout�    ��            error-overlay-nav�    ��            error-overlay-pagination�    ��            error-overlay-toolbar�    ��            error-type-label�    +�            overlay) {
                uvThreadpoolReady.ready = true;
                resolve();
            };
        });
        uvThreadpoolReady.ready = false;
        /** @__sig i */
        function _emnapi_is_main_browser_thread() {
            return (typeof window !== 'undefined' && typeof document !== 'undefined' && true) ? 1 : 0;
        }
        /** @__sig vppi */
        function _emnapi_after_uvthreadpool_ready(callback, q, type) {
            if (uvThreadpoolReady.ready) {
                (wasmTable.get(callback))(q, type);
            }
            else {
                uvThreadpoolReady.then(function () {
                    (wasmTable.get(callback))(q, type);
                });
            }
        }
        /** @__sig vpi */
        function _emnapi_tell_js_uvthreadpool(threads, size) {
            var p = [];
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            var _loop_1 = function (i) {
                var pthreadPtr = HEAP_DATA_VIEW.getInt32(threads + i * 4, true);
                var worker = emnapiGetWorkerByPthreadPtr(pthreadPtr);
                p.push(new Promise(function (resolve) {
                    var handler = function (e) {
                        var data = e.data;
                        var __emnapi__ = data.__emnapi__;
                        if (__emnapi__ && __emnapi__.type === 'async-thread-ready') {
                            resolve   y         p��          ���          ���          ���          ���          ���          ���          ���        	  ���        
   ��          ��           ��          0��          @��          P��          `��          p��          ���          ���          ���          ���          ���          ���          ���          ���           ��          ��           ��          0��          @��          P��           `��        !  p��        "  ���        #  ���        $  ���        %  ���        &  ���        '  ���        (  ���        )  ���        *   ��        +  ��        ,   ��        -  0��        .  @��        /  P��        0  `��        1  p��        2  ���        3  ���        4  ���        5  ���        6  ���        7  ���        8  ���        9  ���        :   ��        ;  ��        <   ��        =  0��        >  @��        ?  P��        @  `��        A  `��    �   B *#__PURE__*/ ObjsOptions = {},
> = Value extends Function
	? Value
	: Value extends Array<infer U>
		? Value
		: {[K in keyof Value as
			DelimiterCase<K, Delimiter, ApplyDefaultOptions<WordsOptions, _DefaultDelimiterCaseOptions, Options>>
			]: Value[K]};

export {};
idth: number;
    /**
     * The **`outerText`** property of the HTMLElement interface returns the same value as HTMLElement.innerText.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/outerText)
     */
    outerText: string;
    /**
     * The **`popover`** property of the HTMLElement interface gets and sets an element's popover state via JavaScript (`'auto'`, `'hint'`, or `'manual'`), and can be used for feature detection.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement/popover)
     */
    popover: string | null;
    /**
     * The **`spellcheck`** property of the HTMLElement interface represents a boolean value that controls the spell-ch   x     �      �� hubsessions"
  on agent_sessions for select
  using (true);  -- service_role bypasses RLS, so this is safe

create policy "Agents can delete own sessions"
  on agent_sessions for delete
  using (true);  -- service_role bypasses RLS
  anchor-is-valid-test.js     �!            * aria-activedescendant-has-tabindex-test.js     "     	        aria-props-test.js     2"     
        aria-proptypes-test.js     d"             aria-role-test.js     ~"            ! aria-unsupported-elements-test.js     '#             autocomplete-valid-test.js     #            $ click-events-have-key-events-test.js     �#            $ control-has-associated-label-test.js     �)             heading-has-content-test.js     �*             html-has-lang-test.js     _+             iframe-has-title-test.js     �+             img-redundant-alt-test.js     �1            " interactive-supports-focus-test.js     (<            $ label-has-associated-control-test.js     w<             label-has-for-test.js     �<             lang-test.js     )>             media-has-caption-test.js      ?            $ mouse-events-have-key-events-test.js     ;?             no-access-key-test.js     `?            # no-aria-hidden-on-focusable-test.js     �?             no-autofocus-test.js     �?             no-distracting-elements-test.js     �?            5 no-interactive-element-to-noninteractive-role-test.js     .@            . no-noninteractive-element-interactions-test.js     �@             5 no-noninteractive-element-to-interactive-role-test.js      A     !       " no-noninteractive-tabindex-test.js     ,A     "        no-onchange-test.js     UA     #        no-redundant-roles-test.js     �A     $       & no-static-element-interactions-test.js     dB     %        prefer-tag-over-role-test.js     �B     &       $ role-has-required-aria-props-test.js     �B     '         role-supports-aria-props-test.js    