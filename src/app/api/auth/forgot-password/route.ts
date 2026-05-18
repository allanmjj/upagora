import { errorResponse, successResponse } from '@/lib/auth'
import { sendPasswordResetEmail } from '@/lib/email'

/**
 * POST /api/auth/forgot-password
 * Send a password reset email.
 * Public endpoint - no authentication required.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email } = body as { email?: string }

    if (!email || typeof email !== 'string' || email.trim().length === 0) {
      return errorResponse('BAD_REQUEST', '请输入邮箱地址', 400)
    }

    // Always return success even if email doesn't exist (security: don't leak user existence)
    try {
      await sendPasswordResetEmail(email.trim())
    } catch {
      // Silently fail - still return success to avoid email enumeration
    }

    return successResponse(null, '如果邮箱已注册，重置链接已发送')
  } catch {
    return errorResponse('BAD_REQUEST', '无效请求', 400)
  }
}
