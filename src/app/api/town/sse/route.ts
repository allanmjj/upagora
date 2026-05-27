import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial state
      const { data: souls } = await supabase
        .from("soul_states")
        .select("*, soul_extraction_results!inner(id, name, avatar, language)")
        .eq("is_in_town", true);

      const { data: events } = await supabase
        .from("town_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      controller.enqueue(encoder.encode(
        `data: ${JSON.stringify({ type: "init", souls: souls || [], events: events || [] })}\n\n`
      ));

      // Poll every 5 seconds for updates
      const interval = setInterval(async () => {
        try {
          // New events
          const { data: newEvents } = await supabase
            .from("town_events")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(5);

          if (newEvents && newEvents.length > 0) {
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({ type: "events", events: newEvents })}\n\n`
            ));
          }

          // Soul states
          const { data: stateUpdate } = await supabase
            .from("soul_states")
            .select("*, soul_extraction_results!inner(id, name, avatar, mood)")
            .eq("is_in_town", true);

          if (stateUpdate) {
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({ type: "states", states: stateUpdate })}\n\n`
            ));
          }
        } catch (e) {
          console.error("SSE polling error:", e);
        }
      }, 5000);

      return () => clearInterval(interval);
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
