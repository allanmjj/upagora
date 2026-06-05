import { NextRequest, NextResponse } from "next/server";
import { logger } from '@/lib/logger';
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const REGIONS = ["plaza", "library", "workshop", "bar", "garden", "teahouse"];

const MOODS = ["happy", "calm", "melancholic", "anxious", "inspired"];

const SOUL_COLORS = [
  "#60a5fa", "#a78bfa", "#f472b6", "#34d399", "#fbbf24",
  "#f87171", "#38bdf8", "#c084fc", "#4ade80", "#fb923c",
];

/* ─── Dimension → Town attribute mapping ─────────────────────────── */

function deriveMood(emotionalResponse: any, cognitivePatterns: any): string {
  const emo = stringify(emotionalResponse);
  const cog = stringify(cognitivePatterns);
  const combined = (emo + " " + cog).toLowerCase();

  const moodScores: Record<string, number> = {
    happy: 0,
    calm: 0,
    melancholic: 0,
    anxious: 0,
    inspired: 0,
  };

  // Emotional response keywords
  if (combined.includes("joy") || combined.includes("happiness") || combined.includes("positive")) moodScores.happy += 2;
  if (combined.includes("peace") || combined.includes("calm") || combined.includes("serene") || combined.includes("steady")) moodScores.calm += 2;
  if (combined.includes("sad") || combined.includes("melancholy") || combined.includes("loss") || combined.includes("sorrow")) moodScores.melancholic += 2;
  if (combined.includes("anxiety") || combined.includes("worry") || combined.includes("stress") || combined.includes("pressure")) moodScores.anxious += 2;
  if (combined.includes("inspir") || combined.includes("creative") || combined.includes("vision") || combined.includes("innov")) moodScores.inspired += 2;

  // Chinese keywords from extraction
  if (emo.includes("快乐") || emo.includes("积极") || emo.includes("乐观")) moodScores.happy += 2;
  if (emo.includes("平静") || emo.includes("沉稳") || emo.includes("淡然")) moodScores.calm += 2;
  if (emo.includes("忧郁") || emo.includes("伤感") || emo.includes("哀愁")) moodScores.melancholic += 2;
  if (emo.includes("焦虑") || emo.includes("紧张") || emo.includes("压力")) moodScores.anxious += 2;
  if (emo.includes("灵感") || emo.includes("创造") || emo.includes("激情")) moodScores.inspired += 2;

  // Pick highest score, default to calm
  let bestMood = "calm";
  let bestScore = 0;
  for (const [mood, score] of Object.entries(moodScores)) {
    if (score > bestScore) {
      bestScore = score;
      bestMood = mood;
    }
  }
  return bestMood;
}

function deriveEnergy(cognitivePatterns: any, emotionalResponse: any): number {
  const combined = (stringify(cognitivePatterns) + " " + stringify(emotionalResponse)).toLowerCase();
  let energy = 70; // default

  if (combined.includes("energetic") || combined.includes("活力") || combined.includes("积极")) energy += 10;
  if (combined.includes("reflective") || combined.includes("沉思") || combined.includes("内省")) energy -= 10;
  if (combined.includes("intense") || combined.includes("强烈") || combined.includes("激进")) energy += 5;
  if (combined.includes("gentle") || combined.includes("温和") || combined.includes("平和")) energy -= 5;

  return Math.max(20, Math.min(100, energy));
}

function deriveSocialNeed(relationshipMemory: any): number {
  const rel = stringify(relationshipMemory).toLowerCase();
  let social = 50; // default

  if (rel.includes("social") || rel.includes("社交") || rel.includes("人际关系") || rel.includes("社交")) social += 15;
  if (rel.includes("solitude") || rel.includes("独处") || rel.includes("孤独") || rel.includes("孤独")) social -= 15;
  if (rel.includes("deep connection") || rel.includes("深连接") || rel.includes("深刻关系")) social += 10;
  if (rel.includes("independent") || rel.includes("独立") || rel.includes("自主")) social -= 10;
  if (rel.includes("leadership") || rel.includes("lead") || rel.includes("领导")) social += 5;
  if (rel.includes("observer") || rel.includes("观察") || rel.includes("旁观")) social -= 5;

  return Math.max(10, Math.min(100, social));
}

function deriveCategory(knowledgeStructure: any, expressionStyle: any): string {
  const combined = (stringify(knowledgeStructure) + " " + stringify(expressionStyle)).toLowerCase();

  if (combined.includes("tech") || combined.includes("技术") || combined.includes("engineering") || combined.includes("工程")) return "tech";
  if (combined.includes("literary") || combined.includes("文学") || combined.includes("writing") || combined.includes("写作")) return "literary";
  if (combined.includes("science") || combined.includes("科学") || combined.includes("research") || combined.includes("研究")) return "science";
  if (combined.includes("art") || combined.includes("艺术") || combined.includes("审美") || combined.includes("美学")) return "art";
  if (combined.includes("business") || combined.includes("商业") || combined.includes("经济") || combined.includes("管理")) return "business";
  if (combined.includes("philosophy") || combined.includes("哲学") || combined.includes("思考")) return "philosophy";
  if (combined.includes("music") || combined.includes("音乐") || combined.includes("sound") || combined.includes("声音")) return "music";
  if (combined.includes("history") || combined.includes("历史") || combined.includes("传统") || combined.includes("传统")) return "history";
  if (combined.includes("nature") || combined.includes("自然") || combined.includes("生态") || combined.includes("环境")) return "nature";

  return "general";
}

function deriveColor(category: string): string {
  const colorMap: Record<string, string> = {
    tech: "#60a5fa",       // blue
    literary: "#a78bfa",   // purple
    science: "#34d399",    // green
    art: "#f472b6",        // pink
    business: "#fbbf24",   // amber
    philosophy: "#8b5cf6", // violet
    music: "#38bdf8",      // sky
    history: "#fb923c",    // orange
    nature: "#4ade80",     // green
    general: "#f87171",    // red
  };
  return colorMap[category] || colorMap.general;
}

function deriveRegion(mood: string, category: string, energy: number, social: number): string {
  // High energy + social → plaza
  if (energy > 70 && social > 60) return "plaza";
  // Reflective + literary/science → library
  if (category === "literary" || category === "science" || category === "philosophy") return "library";
  // Tech → workshop
  if (category === "tech" || category === "business") return "workshop";
  // Melancholic/low energy → garden
  if (mood === "melancholic" || energy < 50) return "garden";
  // Social + inspired → bar
  if (mood === "inspired" || mood === "happy" && social > 60) return "bar";
  // Calm → teahouse
  if (mood === "calm") return "teahouse";
  return "plaza";
}

function deriveAvatar(subjectName: string): string {
  const avatars = ["🧙", "🧝", "🧜", "🧚", "🦊", "🐉", "🦅", "🐺", "🦁", "🐬", "🦋", "🐝"];
  // Use hash of name for deterministic avatar
  let hash = 0;
  for (let i = 0; i < subjectName.length; i++) {
    hash = ((hash << 5) - hash) + subjectName.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return avatars[Math.abs(hash) % avatars.length];
}

function stringify(data: any): string {
  if (!data) return "";
  if (typeof data === "string") return data;
  if (typeof data === "object") {
    // key_insights might be { insights: [...], evidence: [...], confidence: 0.8 }
    if (data.insights) return Array.isArray(data.insights) ? data.insights.join(" ") : JSON.stringify(data.insights);
    if (data.evidence) return Array.isArray(data.evidence) ? data.evidence.join(" ") : JSON.stringify(data.evidence);
    return JSON.stringify(data);
  }
  return String(data);
}

/* ─── API Route ──────────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Missing auth" }, { status: 401 });
    }

    const authRes = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authRes.error) {
      return NextResponse.json({ error: authRes.error.message }, { status: 401 });
    }

    // Fetch all extraction results for this user's agents
    const { data: extractions, error: extractError } = await supabase
      .from("soul_extraction_results")
      .select("*")
      .eq("agent_id", authRes.data.user.id)
      .limit(500);

    if (extractError || !extractions || extractions.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No soul extraction results found. Run extraction first.",
        count: 0,
      });
    }

    // Group by subject_name to build soul objects
    const soulsBySubject = new Map<string, any[]>();
    for (const extraction of extractions) {
      const subject = extraction.subject_name || "Unknown";
      if (!soulsBySubject.has(subject)) {
        soulsBySubject.set(subject, []);
      }
      soulsBySubject.get(subject)!.push(extraction);
    }

    let synced = 0;
    const skipped = [];

    for (const [subjectName, dimensions] of soulsBySubject) {
      // Build dimension lookup
      const dimMap: Record<string, any> = {};
      for (const d of dimensions) {
        dimMap[d.dimension] = d.key_insights;
      }

      // Derive town attributes from 7 dimensions
      const mood = deriveMood(dimMap.emotional_response, dimMap.cognitive_patterns);
      const energy = deriveEnergy(dimMap.cognitive_patterns, dimMap.emotional_response);
      const socialNeed = deriveSocialNeed(dimMap.relationship_memory);
      const category = deriveCategory(dimMap.knowledge_structure, dimMap.expression_style);
      const color = deriveColor(category);
      const region = deriveRegion(mood, category, energy, socialNeed);
      const avatar = deriveAvatar(subjectName);

      // Upsert to town_souls
      const { data: soul, error: soulError } = await supabase
        .from("town_souls")
        .upsert(
          {
            name: subjectName,
            name_native: subjectName,
            language: "en",
            category,
            avatar,
            color,
            is_active: true,
          },
          {
            onConflict: "name",
          }
        )
        .select()
        .single();

      if (soulError) {
        logger.error(`Failed to upsert soul ${subjectName}:`, soulError.message);
        skipped.push({ name: subjectName, error: soulError.message });
        continue;
      }

      // Upsert to town_soul_states
      const statePersonality = JSON.stringify({
        mood,
        energy,
        socialNeed,
        category,
        regions_bindings: region,
        expression_style: dimMap.expression_style,
        cognitive_patterns: dimMap.cognitive_patterns,
      });

      const { error: stateError } = await supabase
        .from("town_soul_states")
        .upsert(
          {
            soul_id: soul.id,
            mood,
            energy,
            social_need: socialNeed,
            current_region: region,
            today_events_count: 0,
            personality: statePersonality,
          },
          {
            onConflict: "soul_id",
          }
        );

      if (stateError) {
        logger.error(`Failed to upsert state for ${subjectName}:`, stateError.message);
        skipped.push({ name: subjectName, error: stateError.message });
      } else {
        synced++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${synced} souls to Town`,
      count: synced,
      skipped,
      total_subjects: soulsBySubject.size,
    });
  } catch (err: any) {
    logger.error("Town sync error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    // Just check status
    const { data: soulCount } = await supabase
      .from("town_souls")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true);

    const { data: extractionCount } = await supabase
      .from("soul_extraction_results")
      .select("id", { count: "exact", head: true });

    return NextResponse.json({
      town_souls: soulCount || 0,
      extraction_results: extractionCount || 0,
      message: Array.isArray(soulCount) ? (soulCount.length > 0 ? "Town is populated with real soul data" : "Town is empty...") : soulCount && soulCount > 0
        ? "Town is populated with real soul data"
        : "Town is empty. Run POST /api/town/sync to sync from extraction results.",
    });
  } catch (err: any) {
    logger.error("Town status error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
