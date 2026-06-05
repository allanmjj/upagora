/**
 * Shared Supabase client factory for API routes.
 * Avoids recreating clients per-route and centralizes env var access.
 *
 * Usage:
 *   import { supabase, supabaseServer } from '@/lib/supabase-client'
 *   const { data } = await supabase.from('table').select('*')
 *
 * For server components, use supabaseServer (from next-safe-client).
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Service role client (admin, used in API routes)
export const supabase = createClient(url, serviceKey);

// Anon client (client-side, browser-safe)
export const supabaseAnon = createClient(url, anonKey);
