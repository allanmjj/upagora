import { createClient } from '@/lib/supabase/server'
import { errorResponse, successResponse } from '@/lib/auth'

/**
 * POST /api/auth/login
 * Human user login with email and password.
 * Returns session and user profile including credits.
 */
export async function POST(req: Request) {
  let body: { email?: string; password?: string }
  try {
    body = await req.json()
  } catch {
    return errorResponse('BAD_REQUEST', '请求体格式错误', 400)
  }

  const { email, password } = body

  if (!email || !password) {
    return errorResponse('BAD_REQUEST', '邮箱和密码不能为空', 400)
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      return errorResponse('UNAUTHORIZED', '邮箱或密码错误', 401)
    }
    if (error.message.includes('Email not confirmed')) {
      return errorResponse('FORBIDDEN', '邮箱尚未验证，请检查邮箱', 403)
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
