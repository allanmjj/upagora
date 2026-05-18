/**
 * Email utilities for UpAgora
 *
 * Uses Supabase Auth for verification and password reset flows.
 * Supabase handles email delivery automatically via mail templates.
 */

import { createClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Resend email verification link.
 * Rate limited by Supabase (default: 1 per hour).
 */
export async function resendVerificationLink(email: string) {
  const client = createClient(supabaseUrl, supabaseAnonKey)
  const { error } = await client.auth.resend({
    type: 'signup',
    email,
  })

  if (error) {
    console.error('Failed to resend verification:', error)
    throw new Error(error.message || 'Failed to resend verification email')
  }
}

/**
 * Send password reset email via Supabase.
 */
export async function sendPasswordResetEmail(email: string) {
  const client = createClient(supabaseUrl, supabaseAnonKey)
  const { error } = await client.auth.resetPasswordForEmail(email)

  if (error) {
    console.error('Failed to send password reset:', error)
    throw new Error(error.message || 'Failed to send password reset email')
  }
}

/**
 * Check if user's email is verified.
 */
export async function checkEmailVerification(userId: string): Promise<{ is_verified: boolean }> {
  const adminClient = createAdminClient()
  const { data: user, error } = await adminClient.auth.admin.getUserById(userId)

  if (error) {
    throw new Error('User not found')
  }

  return {
    is_verified: !!user.user.email_confirmed_at,
  }
}
