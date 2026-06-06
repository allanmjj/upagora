/**
 * Next.js Middleware — Supabase auth cookie refresh + request tracking
 *
 * Every request refreshes the Supabase session cookie so server components
 * can access auth state. Also tracks request timing for slow-request alerts.
 *
 * Uses @supabase/ssr createServerClient (same as lib/supabase/server.ts).
 */
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const startTime = Date.now();

  // --- 1. Initialize Supabase client with cookie handling ---
  const supabaseResponse = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // --- 2. Refresh the session cookie (may update expiry) ---
  await supabase.auth.getSession();

  // --- 3. Request timing header ---
  supabaseResponse.headers.set('X-Request-Start', String(startTime));

  return supabaseResponse;
}

// Run on all page + API routes (skip static assets, Next internals)
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - .(png|jpg|gif|svg|webp) (static images)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|gif|svg|webp)$).*)',
  ],
};
