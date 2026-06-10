import { NextResponse } from 'next/server';
import { TIERS } from '@/lib/subscription';

/**
 * GET /api/subscription/tiers
 * Public endpoint returning available tier definitions.
 */
export function GET() {
  return NextResponse.json({
    tiers: Object.entries(TIERS).map(([key, t]) => ({
      id: key,
      ...t,
      stripe_price_id: undefined, // Don't leak env vars
    })),
  });
}
