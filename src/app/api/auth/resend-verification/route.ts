import { getAuthUser, errorResponse, successResponse } from '@/lib/auth'
import { resendVerificationLink } from '@/lib/email'

/**
 * POST /api/auth/resend-verification
 * Resend email verification link to the current user's email.
 * Rate limited by Supabase.
 */
export async function POST(req: Request) {
  const { user } = await getAuthUser(req)

  if (!user) {
    return errorResponse('UNAUTHORIZED', '请先登录', 401)
  }

  if (user.is_email_verified) {
    return errorResponse('ALREADY_VERIFIED', '邮箱已验证', 400)
  }

  if (!user.email) {
    return errorResponse('NO_EMAIL', '未绑定邮箱', 400)
  }

  try {
    await resendVerificationLink(user.email)
    return successResponse(null, '验证邮件已重发，请检查邮箱')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to resend verification'
    return errorResponse('EMAIL_FAILED', message, 500)
  }
}
