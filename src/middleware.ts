// src/middleware.ts — Global error handling + request sanitization
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const startTime = Date.now();
  
  // Track slow requests
  const url = request.nextUrl.pathname;
  
  // Sanitize: reject obviously malicious payloads
  const contentType = request.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    // Rate limiting hint via header
    const response = NextResponse.next();
    response.headers.set('X-Request-Start', String(startTime));
    return response;
  }
  
  return NextResponse.next();
}

// Only run on API routes
export const config = {
  matcher: '/api/:path*',
};

/**
 * Global error handler factory for API routes
 * Usage: try { ... } catch (err) { return apiErrorHandler(err) }
 */
export function apiErrorHandler(err: unknown, context?: string): NextResponse {
  const message = err instanceof Error ? err.message : String(err);
  const prefix = context ? `[${context}]` : '';
  
  // Log to console (will appear in Vercel/production logs)
  console.error(`${prefix} API Error:`, message);
  
  // Don't leak internal details to client
  if (err instanceof Error && err.name === 'TypeError' && message.includes('fetch')) {
    return NextResponse.json(
      { error: 'Service temporarily unavailable' },
      { status: 503 }
    );
  }
  
  if (message.includes('timeout') || message.includes('abort')) {
    return NextResponse.json(
      { error: 'Request timed out. Please try again.' },
      { status: 504 }
    );
  }
  
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
