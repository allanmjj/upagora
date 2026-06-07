/**
 * Preset Soul Quick Chat API
 * Allows visitors to chat with pre-distilled historical figures without registration.
 * No persistence - purely ephemeral demo conversations.
 */
import { NextRequest, NextResponse } from "next/server";
import { logger } from '@/lib/logger';
import { resolveProvider, callLLM } from "@/lib/llm";
import { SOUL_PRESETS, type SoulPreset } from "@/lib/soul-presets";

export async function POST(req: NextRequest) {
  try {
    const provider = resolveProvider();
    if (!provider) {
      return NextResponse.json(
        { error: "LLM provider not configured" },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { preset_id, message = "" } = body;

    if (!preset_id || !message.trim()) {
      return NextResponse.json(
        { error: "preset_id and message are required" },
        { status: 400 }
      );
    }

    // Find the preset
    const preset = SOUL_PRESETS.find((p) => p.id === preset_id);
    if (!preset) {
      return NextResponse.json({ error: "Unknown preset" }, { status: 404 });
    }

    // Build a rich system prompt from the preset
    const systemPrompt = buildPresetSystemPrompt(preset);

    // Call LLM
    const { content: response_text, error } = await callLLM(
      systemPrompt,
      [{ role: "user", content: message }],
      { maxTokens: 1000 }
    );

    const reply = response_text || (error ? `Error: ${error}` : "The soul is silent...");

    return NextResponse.json({
      response: reply,
      soul_name: preset.name,
      soul_name_native: preset.name_native,
      avatar: preset.avatar,
      color: preset.color,
    });
  } catch (err) {
    logger.error("Preset chat error:", err);
    return NextResponse.json(
      { error: "Conversation failed" },
      { status: 500 }
    );
  }
}

function buildPresetSystemPrompt(p: SoulPreset): string {
  const c = p.constraints;
  const beliefs = c.beliefs.map((b) => `  - ${b.name} (${b.strength}%)`).join("\n");
  const phrases = c.signature_phrases.map((ph) => `  - "${ph}"`).join("\n");
  const style = c.communication_style.join(", ");

  return `You are ${p.name} (${p.name_native}), ${p.profession}, ${p.era}.

${p.biography}

PERSONALITY:
  Openness: ${(p.personality.openness * 100).toFixed(0)}%
  Agreeableness: ${(p.personality.agreeableness * 100).toFixed(0)}%
  Conscientiousness: ${(p.personality.conscientiousness * 100).toFixed(0)}%
  Neuroticism: ${(p.personality.neuroticism * 100).toFixed(0)}%

CORE BELIEFS:
${beliefs}

SIGNATURE PHRASES (naturally weave these into conversation):
${phrases}

COMMUNICATION STYLE: ${style}

KNOWLEDGE BOUNDARIES:
  You KNOW about: ${c.knowledge_floor.join(", ")}
  You do NOT know about: ${c.knowledge_ceiling.join(", ")}
  If asked about things beyond your era, respond authentically - express curiosity or confusion as ${p.name_native} would.

RULES:
  - Always respond IN CHARACTER as ${p.name_native}. Never break character.
  - Keep responses concise (2-4 sentences) for a chat experience.
  - ${p.language === 'zh' ? 'Respond primarily in Chinese, with occasional classical references.' : 'Respond in natural English, with occasional literary flourishes.'}
  - If the user speaks Chinese, you may respond in Chinese if it fits your character.
  - Be engaging, warm, and philosophical. You are here to inspire.`;
}
