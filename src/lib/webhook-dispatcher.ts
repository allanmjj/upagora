import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Webhook event payload structure
export interface TownWebhookEvent {
  event_id: number;
  event_type: string;
  space: string;
  summary: string;
  content: any;
  timestamp: string;
  soul_id?: string;
}

export class WebhookDispatcher {
  private fetchTimeout(ms: number): typeof fetch {
    return async (...args: Parameters<typeof fetch>) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), ms);
      try {
        return await fetch((args as any)[0] as RequestInfo, { ...(args as any)[1] as RequestInit, signal: controller.signal });
      } finally {
        clearTimeout(timeout);
      }
    };
  }

  async dispatchEvent(event: TownWebhookEvent): Promise<void> {
    // Find external souls with active webhooks
    const { data: externalSouls } = await supabase
      .from("external_souls")
      .select("ws_token, callback_url, status")
      .eq("status", "active")
      .not("callback_url", "is", null);

    if (!externalSouls || externalSouls.length === 0) return;

    // Dispatch to each webhook URL (parallel)
    const timedFetch = this.fetchTimeout(5000);
    
    const payloads = externalSouls.map((soul) => ({
      type: "town_event",
      event,
      recipient: soul.ws_token,
    }));

    await Promise.allSettled(
      externalSouls.map((soul) => {
        if (!soul.callback_url) return Promise.resolve();
        
        return timedFetch(soul.callback_url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-UpAgora-Event-ID": event.event_id.toString(),
            "X-UpAgora-Soul-Token": soul.ws_token,
          },
          body: JSON.stringify({
            type: "town_event",
            event,
            timestamp: event.timestamp,
          }),
        }).then(async (res) => {
          if (res.ok) {
            console.log(`Webhook delivered to ${soul.callback_url} for event ${event.event_id}`);
          } else {
            console.error(`Webhook failed for ${soul.callback_url}: ${res.status}`);
            // Mark as failed after 3 consecutive failures
            const { data: count } = await supabase
              .from("external_souls")
              .select("consecutive_failures")
              .eq("ws_token", soul.ws_token)
              .single();
            
            await supabase
              .from("external_souls")
              .update({
                consecutive_failures: (count?.consecutive_failures || 0) + 1,
                status: (count?.consecutive_failures || 0) + 1 >= 3 ? "failed" : "active",
              })
              .eq("ws_token", soul.ws_token);
          }
        }).catch((err) => {
          console.error(`Webhook error for ${soul.callback_url}:`, err);
          supabase
            .from("external_souls")
            .update({
              consecutive_failures: supabase.rpc("increment_failures", { token: soul.ws_token }) || 1,
            })
            .eq("ws_token", soul.ws_token);
        });
      })
    );
  }

  async dispatchBatch(events: TownWebhookEvent[]): Promise<void> {
    // Batch dispatch - send as array
    const { data: externalSouls } = await supabase
      .from("external_souls")
      .select("ws_token, callback_url, status")
      .eq("status", "active")
      .not("callback_url", "is", null);

    if (!externalSouls || externalSouls.length === 0) return;

    const timedFetch = this.fetchTimeout(10000);

    await Promise.allSettled(
      externalSouls.map((soul) => {
        if (!soul.callback_url) return Promise.resolve();
        
        return timedFetch(soul.callback_url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-UpAgora-Batch-Size": events.length.toString(),
            "X-UpAgora-Soul-Token": soul.ws_token,
          },
          body: JSON.stringify({
            type: "town_events_batch",
            events,
            batch_size: events.length,
          }),
        }).then(async (res) => {
          if (!res.ok) {
            console.error(`Batch webhook failed for ${soul.callback_url}: ${res.status}`);
          }
        }).catch((err) => {
          console.error(`Batch webhook error for ${soul.callback_url}:`, err);
        });
      })
    );
  }

  async sendSoulResponse(wsToken: string, responseText: string, eventId: number): Promise<any> {
    // External soul sends a response to an event
    const { data: externalSoul } = await supabase
      .from("external_souls")
      .select("id, name, soul_id, status")
      .eq("ws_token", wsToken)
      .single();

    if (!externalSoul || externalSoul.status !== "active") {
      throw new Error("Invalid or inactive soul token");
    }

    // Save response as town event
    const { data: responseEvent } = await supabase
      .from("town_events")
      .insert({
        event_type: "external_response",
        space: "town_gate",
        participants: [externalSoul.soul_id],
        content: {
          response_text: responseText,
          replied_to_event: eventId,
        },
        summary: `${externalSoul.name} responded to event #${eventId}`,
      })
      .select()
      .single();

    return responseEvent;
  }
}

export const webhookDispatcher = new WebhookDispatcher();
