import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { OpenAI } from "openai";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const deepseek = new OpenAI({
  baseURL: "https://api.deepseek.com/v1",
  apiKey: process.env.DEEPSEEK_API_KEY || "",
});

// POST /api/town/encounter - Simulate two souls meeting and having a conversation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { soul1Id, soul2Id, space = "plaza" } = body;

    if (!soul1Id || !soul2Id) {
      return NextResponse.json({ error: "soul1Id and soul2Id are required" }, { status: 400 });
    }

    // Load both souls
    const { data: state1 } = await supabase
      .from("soul_states")
      .select("*")
      .eq("soul_id", soul1Id)
      .single();

    const { data: state2 } = await supabase
      .from("soul_states")
      .select("*")
      .eq("soul_id", soul2Id)
      .single();

    if (!state1 || !state2) {
      return NextResponse.json({ error: "Both souls must be in town" }, { status: 404 });
    }

    // Load persona data
    const { data: persona1 } = await supabase
      .from("soul_extraction_results")
      .select("id, name, language, persona_text")
      .eq("id", soul1Id)
      .single();

    const { data: persona2 } = await supabase
      .from("soul_extraction_results")
      .select("id, name, language, persona_text")
      .eq("id", soul2Id)
      .single();

    // Generate conversation
    const conversation = await generateEncounterConversation(
      persona1?.name || "Soul A",
      persona1?.persona_text || "",
      state1.mood,
      persona2?.name || "Soul B",
      persona2?.persona_text || "",
      state2.mood,
      space,
    );

    // Save encounter event
    const { data: event } = await supabase
      .from("town_events")
      .insert({
        event_type: "encounter",
        space,
        participants: [soul1Id, soul2Id],
        content: {
          conversation,
          soul1_mood: state1.mood,
          soul2_mood: state2.mood,
        },
        summary: `${persona1?.name || "Soul A"} and ${persona2?.name || "Soul B"} met at ${space}`,
      })
      .select()
      .single();

    // Update relationship
    await updateRelationship(soul1Id, soul2Id);

    // Update moods based on encounter
    await updateMoods(soul1Id, soul2Id, conversation);

    return NextResponse.json({
      event,
      conversation,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

async function generateEncounterConversation(
  name1: string,
  persona1: string,
  mood1: string,
  name2: string,
  persona2: string,
  mood2: string,
  space: string,
): Promise<any[]> {
  const spaceContexts: Record<string, string> = {
    plaza: "meeting in the town square",
    library: "chatting while browsing books",
    workshop: "collaborating on a project",
    bar: "sharing drinks and stories",
    garden: "meditating and reflecting together",
  };

  const systemPrompt = `You are a creative writer. Generate a short, natural conversation between two characters. 
The conversation should reflect their personalities, current moods, and the setting.
Each exchange should be 3-5 turns maximum.
Return ONLY a JSON array of objects with: { speaker, text }
No explanations, just the JSON array.`;

  const userPrompt = `Generate a conversation between:

${name1} (mood: ${mood1}):
${persona1.slice(0, 1000)}

${name2} (mood: ${mood2}):
${persona2.slice(0, 1000)}

They met ${spaceContexts[space] || "in the town"}.
Generate 4-6 exchanges of dialogue.`;

  try {
    const response = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.9,
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content || "";
    const conversation = JSON.parse(content);
    return conversation;
  } catch (e) {
    // Fallback conversation
    return [
      { speaker: name1, text: `Hello there! Nice to meet you ${space}.` },
      { speaker: name2, text: `${name1}! Great to see you. How are you feeling today?` },
      { speaker: name1, text: `I'm feeling ${mood1} today. What about you?` },
      { speaker: name2, text: `I'm feeling ${mood2}. Sometimes I think about...` },
    ];
  }
}

async function updateRelationship(soul1Id: string, soul2Id: string) {
  // Upsert relationship
  await supabase
    .from("soul_relationships")
    .upsert({
      soul1_id: soul1Id,
      soul2_id: soul2Id,
      interaction_count: (await supabase
        .from("soul_relationships")
        .select("interaction_count")
        .eq("soul1_id", soul1Id)
        .eq("soul2_id", soul2Id)
        .single())?.data?.interaction_count || 0,
      last_interaction_at: new Date().toISOString(),
    }, { onConflict: "soul1_id,soul2_id" });
}

async function updateMoods(soul1Id: string, soul2Id: string, conversation: any[]) {
  // Simple mood adjustment based on conversation length
  const conversationLength = conversation.length;
  const moodAdjustment = conversationLength > 4 ? 5 : conversationLength > 2 ? 2 : -2;

  await supabase
    .from("soul_states")
    .update({
      mood: moodAdjustment > 0 ? "happy" : "calm",
      energy: Math.min(100, Math.max(0, 50 + moodAdjustment)),
      social_need: Math.min(100, Math.max(0, 50 - moodAdjustment)),
      updated_at: new Date().toISOString(),
    })
    .eq("soul_id", soul1Id);

  await supabase
    .from("soul_states")
    .update({
      mood: moodAdjustment > 0 ? "happy" : "calm",
      energy: Math.min(100, Math.max(0, 50 + moodAdjustment)),
      social_need: Math.min(100, Math.max(0, 50 - moodAdjustment)),
      updated_at: new Date().toISOString(),
    })
    .eq("soul_id", soul2Id);
}
