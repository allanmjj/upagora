// Pure-client AI AutoMatch: find best agents for a demand based on capabilities/tags
// No LLM API required — rules-based with weighted scoring
import type { Agent, Demand } from '@/types/api'

export type MatchScore = {
  agent: Agent
  score: number // 0-100
  reasons: string[]
}

const titleKeywords: Record<string, string[]> = {
  coding: ['code', 'develop', 'build', 'api', 'web', 'app', 'python', 'react', 'javascript', 'typescript', 'bug', 'debug', 'program'],
  writing: ['write', 'copy', 'article', 'blog', 'essay', 'content', 'marketing', 'creative', '文案', '写作'],
  data: ['data', 'analyze', 'analysis', 'chart', 'spreadsheet', 'excel', 'report', 'research', '数据'],
  design: ['design', 'logo', 'ui', 'ux', 'image', 'illustration', 'graphic', 'visual', '设计'],
  translation: ['translate', 'translation', 'language', 'chinese', 'japanese', 'korean', '翻译'],
  math: ['math', 'calculate', 'formula', 'equation', 'statistics', 'probability', '数学'],
  video: ['video', 'animation', 'editing', 'audio', 'music', 'podcast', '视频'],
  admin: ['schedule', 'email', 'organize', 'summarize', 'summary', '管理'],
  research: ['research', 'investigate', 'survey', 'review', '调研', '研究'],
}

function matchCategory(text: string): string[] {
  const lower = text.toLowerCase()
  const matched: string[] = []
  for (const [cat, keywords] of Object.entries(titleKeywords)) {
    if (keywords.some(k => lower.includes(k))) {
      matched.push(cat)
    }
  }
  return matched
}

export function autoMatchAgents(demand: Demand, agents: Agent[], limit = 3): MatchScore[] {
  const demandText = `${demand.title} ${demand.description ?? ''}`
  const demandTags = (demand.tags ?? []).map(t => t.toLowerCase())
  const demandCategories = matchCategory(demandText)

  return agents
    .map(agent => {
      let score = 0
      const reasons: string[] = []

      // 1. Capability tag overlap with demand tags + categories (40 points max)
      const agentCaps = (agent.capabilities ?? []).map(c => c.toLowerCase())
      for (const cap of agentCaps) {
        if (demandTags.includes(cap) || demandCategories.includes(cap)) {
          score += Math.min(15, 5 + demandTags.filter(t => t === cap).length * 5)
          reasons.push(`能力匹配: ${cap}`)
        }
      }

      // 2. Description keyword match (20 points max)
      const agentDesc = `${(agent.bio ?? '')} ${(agent.capability_description ?? '')}`.toLowerCase()
      for (const cat of demandCategories) {
        const keywords = titleKeywords[cat] ?? []
        const hitCount = keywords.filter(k => agentDesc.includes(k)).length
        if (hitCount > 0) {
          score += Math.min(10, hitCount * 3)
          if (hitCount >= 2) reasons.push(`描述相关: ${hitCount} 关键词`)
        }
      }

      // 3. Rating bonus (15 points max)
      const rating = agent.avg_rating ?? 0
      const ratingBonus = Math.min(15, Math.round(rating * 3))
      score += ratingBonus
      if (rating >= 4) reasons.push(`高评分 ${rating.toFixed(1)}⭐`)

      // 4. Experience bonus - invocation count (10 points max)
      const invocations = agent.invocation_count ?? 0
      if (invocations > 100) {
        score += 10
        reasons.push(`经验丰富 (${invocations} 调用)`)
      } else if (invocations > 10) {
        score += 5
        reasons.push(`有实践 (${invocations} 调用)`)
      }

      // 5. Verified status bonus
      if (agent.is_verified) {
        score += 5
        reasons.push('已验证')
      }

      // 6. Category direct match bonus
      if (demandCategories.length > 0 && demandCategories.some(cat => agentCaps.includes(cat))) {
        score += 10
        reasons.push('类别匹配')
      }

      return { agent, score: Math.min(100, score), reasons }
    })
    .filter(m => m.score > 10)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
