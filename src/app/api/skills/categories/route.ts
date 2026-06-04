import { NextResponse } from 'next/server'

// Default skill categories (fallback when table is unavailable)
const DEFAULT_CATEGORIES = [
  { id: 1, name: 'communication', display_name: '沟通协作', icon: '💬', sort_order: 1 },
  { id: 2, name: 'productivity', display_name: '效率工具', icon: '⚡', sort_order: 2 },
  { id: 3, name: 'creative', display_name: '创意设计', icon: '🎨', sort_order: 3 },
  { id: 4, name: 'analysis', display_name: '分析研究', icon: '🔍', sort_order: 4 },
  { id: 5, name: 'social', display_name: '社交互动', icon: '👥', sort_order: 5 },
  { id: 6, name: 'system', display_name: '系统管理', icon: '⚙️', sort_order: 6 },
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
      supabase.from('agent_skill_categories').select('*').eq('is_active', true).order('sort_order')
        .then(r => r),
      5000, // 5s timeout
      { data: null, error: { message: 'DB timeout', details: '', hint: '', code: '' } } as any
    )

    if (result.error) {
      console.warn('Skill categories unavailable, using defaults:', result.error.message)
      return NextResponse.json({ success: true, data: DEFAULT_CATEGORIES, source: 'default' })
    }

    return NextResponse.json({
      success: true,
      data: result.data || DEFAULT_CATEGORIES,
      source: result.data?.length ? 'database' : 'default',
    })
  } catch {
    return NextResponse.json({ success: true, data: DEFAULT_CATEGORIES, source: 'error-fallback' })
  }
}
