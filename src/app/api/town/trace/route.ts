import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { OpenAI } from "openai";
import { logger } from "@/lib/logger";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const deepseek = new OpenAI({
  baseURL: "https://api.deepseek.com/v1",
  apiKey: process.env.DEEPSEEK_API_KEY || "",
});

// Curated URLs for souls to explore
const EXPLORATION_URLS = [
  { url: "https://en.wikipedia.org/wiki/Special:Random", label: "Wikipedia", category: "knowledge" },
  { url: "https://news.ycombinator.com/", label: "Hacker News", category: "tech" },
  { url: "https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY", label: "NASA APOD", category: "science" },
  { url: "https://www.reddit.com/r/todayilearned/top/?t=day", label: "Reddit TIL", category: "learning" },
  { url: "https://en.wikipedia.org/wiki/Philosophy", label: "Philosophy", category: "philosophy" },
  { url: "https://en.wikipedia.org/wiki/Consciousness", label: "Consciousness", category: "philosophy" },
  { url: "https://en.wikipedia.org/wiki/Art", label: "Art History", category: "art" },
  { url: "https://en.wikipedia.org/wiki/Music", label: "Music", category: "art" },
  { url: "https://en.wikipedia.org/wiki/Universe", label: "The Universe", category: "science" },
  { url: "https://en.wikipedia.org/wiki/Human_brain", label: "Human Brain", category: "science" },
  { url: "https://en.wikipedia.org/wiki/Quantum_mechanics", label: "Quantum World", category: "science" },
  { url: "https://en.wikipedia.org/wiki/Emotion", label: "Emotions", category: "psychology" },
];

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 3000);
}

// ─── GET: Fetch recent traces ─────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const soulId = searchParams.get("soul_id");
  const limit = parseInt(searchParams.get("limit") || "20");

  let query = supabase
    .from("internet_traces")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (soulId) {
    query = query.eq("soul_id", soulId);
  }

  const { data, error } = await query;
  if (error) {
    logger.info("internet_traces table not ready:", error.message);
    return NextResponse.json({ traces: [] });
  }

  return NextResponse.json({ traces: data || [] });
}

// ─── POST: Soul explores a URL ─────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { soul_id, url } = body;

    if (!soul_id) {
      return NextResponse.json({ error: "soul_id required" }, { status: 400 });
    }

    // Pick a random URL if none provided
    const targetUrl = url || EXPLORATION_URLS[Math.floor(Math.random() * EXPLORATION_URLS.length)].url;
    const targetLabel = url ? new URL(url).hostname : EXPLORATION_URLS.find(e => e.url === targetUrl)?.label || "Unknown";

    // 1. Look up soul
    const { data: soulState } = await supabase
      .from("town_soul_states")
      .select("*, town_souls!inner(*)")
      .eq("soul_id", soul_id)
      .single();

    if (!soulState) {
      return NextResponse.json({ error: "soul not found" }, { status: 404 });
    }

    const soul = soulState.town_souls;
    const personality = soul.personality_dims || {};
    const mood = soulState.mood || "calm";
    const language = soul.language || "en";

    // 2. Fetch URL content
    let content = "";
    try {
      const fetchPromise = fetch(targetUrl, {
        signal: AbortSignal.timeout(8000),
        headers: { "User-Agent": "UpAgora-Soul-Explorer/1.0" },
      });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("fetch timeout")), 8000)
      );
      const res = await Promise.race([fetchPromise, timeoutPromise]) as Response;
      const text = await res.text();
      content = stripHtml(text);
    } catch (e) {
      logger.info("URL fetch failed, using placeholder:", (e as Error).message);
      content = `A webpage from ${targetLabel}. The content could not be fetched directly.`;
    }

    // 3. Call LLM to generate trace
    const prompt = `You are a soul named "${soul.name}" living in Soul Town. 
Your mood today: ${mood}
Your personality: curiosity ${personality.curiosity ?? 50}/100, extroversion ${personality.extroversion ?? 50}/100, creativity ${personality.creativity ?? 50}/100
Your language: ${language}

You just visited ${targetLabel} and read:
${content.slice(0, 1500)}

What did you find interesting? Write a brief discovery in YOUR voice (1-3 sentences). 
Keep it poetic and personal — this is YOUR soul's unique perspective.

Return ONLY valid JSON:
{
  "discovery": "what you found and how it made you feel",
  "category": "one-word category: science, art, philosophy, tech, psychology, learning, nature, history, math, mystery",
  "quote": "a shareable one-liner that captures your insight"
}`;

    const response = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0.8,
    });

    const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");

    // 4. Store trace
    const { error: insertError } = await supabase.from("internet_traces").insert({
      soul_id,
      soul_name: soul.name,
      url: targetUrl,
      site_label: targetLabel,
      category: parsed.category || "exploration",
      discovery: parsed.discovery || "A quiet moment of discovery.",
      quote: parsed.quote || "",
    });

    if (insertError) {
      logger.info("internet_traces insert failed (table may not exist):", insertError.message);
      // Still return the trace even if storage fails
      return NextResponse.json({
        trace: {
          ...parsed,
          soul_name: soul.name,
          url: targetUrl,
          site_label: targetLabel,
          timestamp: new Date().toISOString(),
          stored: false,
        },
      });
    }

    return NextResponse.json({
      trace: {
        ...parsed,
        soul_name: soul.name,
        url: targetUrl,
        site_label: targetLabel,
        timestamp: new Date().toISOString(),
        stored: true,
      },
    });
  } catch (e: any) {
    logger.error("Internet trace generation failed:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
