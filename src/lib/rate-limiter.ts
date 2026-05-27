import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const rateLimitMap = new Map<string, { count: number; reset: number }>();
const WINDOW = 60_000; // 1 minute
const MAX_PER_WINDOW = 60; // 60 requests per minute per IP

function getIP(req: Request): string {
  return req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
}

export async function rateLimiter(req: Request) {
  if (process.env.NODE_ENV !== "production") return null;

  const ip = getIP(req);
  const key = `${ip}`;
  const now = Date.now();
  const bucket = rateLimitMap.get(key) || { count: 0, reset: now + WINDOW };

  if (now > bucket.reset) {
    bucket.count = 0;
    bucket.reset = now + WINDOW;
  }

  bucket.count++;
  rateLimitMap.set(key, bucket);

  if (bucket.count > MAX_PER_WINDOW) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429 },
    );
  }

  return null;
}
