import { supabase } from "@/lib/supabase";

/**
 * Queues a digest event (read by a future cron/admin batch) for the voces
 * notification system. Ported from voces-bds's lib/email.ts `queueEvent`,
 * trimmed down to just the queue insert — this repo's lib/email.ts is a
 * separate, unrelated module (Sivar Events ticketing emails) and is not
 * touched here.
 */
export async function queueVocesEvent(
  eventType: "reel_request" | "new_locutor",
  payload: Record<string, string>
) {
  try {
    await supabase.from("voces_notification_queue").insert({ event_type: eventType, payload });
  } catch {
    // Best-effort: a failed queue insert should never block the request that triggered it.
  }
}
