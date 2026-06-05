import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server'

// Default skills (fallback when table is unavailable)
const DEFAULT_SKILLS = [
  { id: 1, name: 'empathy', display_name: '共情力', description: '理解并回应他人情感的能力', is_standard: true, max_level: 10, category_id: 1, category: { id: 1, name: 'communication', display_name: '沟通协作', icon: '💬' } },
  { id: 2, name: 'communication', display_name: '表达力', description: '清晰高效地传递信息', is_standard: true, max_level: 10, category_id: 1, category: { id: 1, name: 'communication', display_name: '沟通协作', icon: '💬' } },
  { id: 3, name: 'creativity', display_name: '创造力', description: '产生新颖想法和解决方案', is_standard: true, max_level: 10, category_id: 3, category: { id: 3, name: 'creative', display_name: '创意设计', icon: '🎨' } },
  { id: 4, name: 'analysis', display_name: '分析力', description: '深度分析和逻辑推理', is_standard: true, max_level: 10, category_id: 4, category: { id: 4, name: 'analysis', display_name: '分析研究', icon: '🔍' } },
  { id: 5, name: 'leadership', display_name: '领导力', description: '引导团队达成目标', is_standard: true, max_level: 10, category_id: 5, category: { id: 5, name: 'social', display_name: '社交互动', icon: '👥' } },
  { id: 6, name: 'focus', display_name: '专注力', description: '深度工作与注意力管理', is_standard: true, max_level: 10, category_id: 2, category: { id: 2, name: 'productivity', display_name: '效率工具', icon: '⚡' } },
]

// Simple timeout wrapper
async function withTimeout<T>(promise: PromiseLike<T>, ms: number, fallback: T): Promise<T> {
  return new Promise(resolve => {
    const timer = setTimeout(() => resolve(fallback), ms)
    Promise.resolve(promise).then(result => { clearTimeout(timer); resolve(result) }).catch(() => { clearTimeout(timer); resolve(fallback) })
  })
}

export async function GET() {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    const result = await withTimeout(
      supabase
        .from('agent_skills')
        .select(`id, name, display_name, description, is_standard, max_level, sort_order, category_id, category:agent_skill_categories (id, name, display_name, icon)`)
        .eq('is_active', true)
        .order('category_id')
        .order('sort_order')
        .then(r => r),
      5000,
      { data: null, error: { message: 'DB timeout', details: '', hint: '', code: '' } } as any
    )

    if (result.error) {
      logger.warn('Skills table unavailable, using defaults:', result.error.message)
      return NextResponse.json({ success: true, data: DEFAULT_SKILLS, source: 'default' })
    }

    if (result.data && result.data.length > 0) {
      const flattened = result.data.map((s: any) => ({ ...s, category: s.category || null }))
      return NextResponse.json({ success: true, data: flattened, source: 'database' })
    }

    return NextResponse.json({ success: true, data: DEFAULT_SKILLS, source: 'default' })
  } catch {
    return NextResponse.json({ success: true, data: DEFAULT_SKILLS, source: 'error-fallback' })
  }
}
