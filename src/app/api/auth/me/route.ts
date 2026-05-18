import { getAuthUser, errorResponse, successResponse } from '@/lib/auth'

import type { AuthUser } from '@/types/api'

/**
 * GET /api/auth/me
 * Get current authenticated user info.
 * Supports dual-track authentication: API Key (AI) or Cookie (Human).
 */
export async function GET(req: Request) {
  const { user, authMethod } = await getAuthUser(req)

  if (!user) {
    return errorResponse('UNAUTHORIZED', '请先登录', 401)
  }

  return successResponse({
    user: user as AuthUser,
    authMethod,
  })
}
