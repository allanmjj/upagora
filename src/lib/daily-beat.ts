import { createClient } from "@supabase/supabase-js";
import { OpenAI } from "openai";
import { webhookDispatcher } from "./webhook-dispatcher";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const deepseek = new OpenAI({
  baseURL: "https://api.deepseek.com/v1",
  apiKey: process.env.DEEPSEEK_API_KEY || "",
});

// Load all souls in town
export async function getSoulsInTown() {
  const { data: souls } = await supabase
    .from("soul_states")
    .select(`
      *,
      soul_extraction_results!inner(id, name, avatar, language, persona_text)
    `)
    .eq("is_in_town", true);
  
  return souls || [];
}

// Update soul mood based on daily activities
async function updateSoulMood(soul: any) {
  const { energy, social_need, mood } = soul;
  
  // Mood evolution logic
  let newMood = mood;
  let newEnergy = energy;
  let newSocialNeed = social_need;
  
  // Energy decays over time
  newEnergy = Math.max(0, newEnergy - 2);
  
  // Social need increases over time
  newSocialNeed = Math.min(100, newSocialNeed + 3);
  
  // Mood changes based on energy and social need
  if (newEnergy < 20) {
    newMood = "melancholic";
  } else if (newSocialNeed > 80) {
    newMood = "anxious";
  } else if (newEnergy > 70 && newSocialNeed < 30) {
    newMood = "inspired";
  } else if (newEnergy > 50) {
    newMood = Math.random() > 0.5 ? "happy" : "calm";
  }
  
  await supabase
    .from("soul_states")
    .update({
      mood: newMood,
      energy: newEnergy,
      social_need: newSocialNeed,
      updated_at: new Date().toISOString(),
    })
    .eq("soul_id", soul.soul_id);
  
  return { mood: newMood, energy: newEnergy, social_need: newSocialNeed };
}

// Generate daily activity for a soul
async function generateDailyActivity(soul: any) {
  const spaces = ["plaza", "library", "workshop", "bar", "garden"];
  const space = spaces[Math.floor(Math.random() * spaces.length)];
  
  const activities = [
    { type: "meditation", summary: `${soul.name} is meditating in ${space}` },
    { type: "creation", summary: `${soul.name} is creating something new in ${space}` },
    { type: "exploration", summary: `${soul.name} is exploring the ${space}` },
    { type: "reflection", summary: `${soul.name} is reflecting on life in ${space}` },
  ];
  
  const activity = activities[Math.floor(Math.random() * activities.length)];
  
  const { data: event } = await supabase
    .from("town_events")
    .insert({
      event_type: activity.type,
      space,
      participants: [soul.soul_id],
      content: {
        mood: soul.mood,
        activity: activity.type,
      },
      summary: activity.summary,
    })
    .select()
    .single();
  
  return event;
}

// Generate conversation for external souls
async function generateExternalSoulResponse(externalSoul: any, event: any) {
  if (!deepseek.apiKey) return null;
  
  try {
    const response = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: externalSoul.persona_text || "You are a soul in the town.",
        },
        {
          role: "user",
          content: `Respond to this town event as ${externalSoul.name}:
Event: ${event.summary}
Space: ${event.space}
Your mood: ${event.content?.mood || "calm"}

Generate a short, natural response (1-2 sentences).`,
        },
      ],
      temperature: 0.8,
      max_tokens: 100,
    });
    
    return response.choices[0]?.message?.content;
  } catch (e) {
    console.error("Failed to generate external soul response:", e);
    return null;
  }
}

// Main daily beat function
export async function runDailyBeat() {
  console.log("Running daily soul beat...");
  
  const souls = await getSoulsInTown();
  console.log(`Found ${souls.length} souls in town`);
  
  const events = [];
  const moodUpdates = [];
  
  for (const soul of souls) {
    try {
      // Update mood
      const moodUpdate = await updateSoulMood(soul);
      moodUpdates.push({ soul_id: soul.soul_id, ...moodUpdate });
      
      // Generate activity
      const event = await generateDailyActivity(soul);
      if (event) {
        events.push(event);
        
        // Dispatch to external souls
        await webhookDispatcher.dispatchEvent({
          event_id: event.id,
          event_type: event.event_type,
          space: event.space,
          summary: event.summary,
          content: event.content,
          timestamp: event.created_at,
          soul_id: soul.soul_id,
        });
      }
    } catch (e) {
      console.error(`Failed to process soul ${soul.soul_id}:`, e);
    }
  }
  
  console.log(`Daily beat complete: ${events.length} events generated, ${moodUpdates.length} moods updated`);
  
  return {
    souls_processed: souls.length,
    events_generated: events.length,
    moods_updated: moodUpdates.length,
  };
}

// Run daily beat on schedule
export default async function dailyBeatScheduler() {
  try {
    const result = await runDailyBeat();
    console.log("Daily beat result:", result);
    return result;
  } catch (e) {
    console.error("Daily beat failed:", e);
    throw e;
  }
}
