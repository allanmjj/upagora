/**
 * Shared auth verification for API routes.
 * Returns user info or throws a 401 response.
 *
 * Usage:
 *   import { verifyAuth } from '@/lib/auth-helper'
 *   const user = await verifyAuth(req)
 *   // now user.id is available
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';

export async function verifyAuth(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    throw new AuthError('Missing authorization header', 401);
  }

  const token = authHeader.replace('Bearer ', '');
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    throw new AuthError(error?.message || 'Invalid token', 401);
  }

  return data.user;
}

export class AuthError extends Error {
  constructor(message: string, public status: number = 401) {
    super(message);
    this.name = 'AuthError';
  }
}

export function authErrorToJson(error: AuthError) {
  return NextResponse.json({ error: error.message }, { status: error.status });
}
