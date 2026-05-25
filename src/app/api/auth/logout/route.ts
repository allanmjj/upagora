import { createClient } from '@/lib/supabase/server'
import { errorResponse, successResponse } from '@/lib/auth'

/**
 * POST /api/auth/logout
 * Sign out the current user (cookie-based only).
 */
export async function POST() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    return errorResponse('INTERNAL_ERROR', '登出失败: ' + error.message, 500)
  }

  return successResponse(null, '登出成功')
}
