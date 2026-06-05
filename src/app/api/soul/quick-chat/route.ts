import { NextRequest, NextResponse } from "next/server";
import { logger } from '@/lib/logger';
import { createClient } from "@supabase/supabase-js";
import { resolveProvider, callLLM } from "@/lib/llm";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  try {
    // Check LLM provider first
    const provider = resolveProvider();
    if (!provider) {
      return NextResponse.json(
        { error: "LLM provider not configured. Please set DEEPSEEK_API_KEY or OPENROUTER_API_KEY." },
        { status: 503 }
      );
    }

    const session_slug = req.cookies.get("ns-slug")?.value || req.nextUrl.searchParams.get("session_slug");
    if (!session_slug) {
      return NextResponse.json({ error: "session_slug is required" }, { status: 400 });
    }

    const body = await req.json();
    const { message = "" } = body;
    if (!message.trim()) {
      return NextResponse.json({ error: "message cannot be empty" }, { status: 400 });
    }

    // Look up session
    const { data: session } = await supabase
      .from("soul_sessions")
      .select("id, subject_name, persona_content")
      .eq("session_slug", session_slug)
      .eq("status", "complete")
      .single();
    if (!session) {
      return NextResponse.json({ error: "Soul not ready, please extract first" }, { status: 404 });
    }

    // Get chat history (last 20 messages)
    const { data: history } = await supabase
      .from("soul_chat_messages")
      .select("role, content")
      .eq("session_id", session.id)
      .order("created_at", { ascending: true })
      .limit(20);

    // Build system prompt from persona
    const persona = session.persona_content || `You are the soul continuation of ${session.subject_name}. Fully embody the role and respond in character.`;

    const chatMessages = [
      ...(history || []).map((m: any) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];

    // Call LLM using shared library
    const { content: response_text, error } = await callLLM(
      persona,
      chatMessages,
      { maxTokens: 1500 }
    );

    const reply = response_text || (error ? `Error: ${error}` : "The soul fell silent for a moment...");

    // Save both messages
    await supabase.from("soul_chat_messages").insert([
      { session_id: session.id, role: "user", content: message },
      { session_id: session.id, role: "assistant", content: reply },
    ]);

    return NextResponse.json({
      response: reply,
      subject_name: session.subject_name,
    });
  } catch (err) {
    logger.error("Quick chat error:", err);
    return NextResponse.json(
      { error: "Conversation failed, please try again" },
      { status: 500 }
    );
  }
}
