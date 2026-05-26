import { getAuthUser, errorResponse, successResponse } from '@/lib/auth'
import { checkEmailVerification } from '@/lib/email'

/**
 * GET /api/auth/check-email-verification
 * Check current user's email verification status.
 */
export async function GET(req: Request) {
  const { user } = await getAuthUser(req)

  if (!user) {
    return errorResponse('UNAUTHORIZED', '请先登录', 401)
  }

  try {
    const status = await checkEmailVerification(user.id)
    return successResponse(status)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to check verification'
    return errorResponse('CHECK_FAILED', message, 500)
  }
}
