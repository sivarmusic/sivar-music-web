import { randomUUID } from "crypto";
import { supabase } from "@/lib/supabase";

/**
 * Snapshots a casting (and its applications) into voces_trash before
 * deleting it, so the trash/restore feature (batch 4a's
 * app/api/voces/admin/trash/{list,restore,purge}) has data to act on.
 *
 * voces-bds never actually wired this up (its own trash flow was already
 * dead code — see scripts/voces-schema.sql's comment on voces_trash) so
 * there's no original route to port faithfully; this fills that gap per the
 * batch 4b brief. Shared between locutor and cantante casting deletes:
 * both castings/applications tables have the same column shape modulo the
 * `attachments`/`deadline` extra columns cantante castings carry, which are
 * captured as-is since we snapshot full raw rows (`select("*")`).
 *
 * Raw rows (snake_case, exactly as stored) are kept — not the camelCase
 * mapped types from lib/voces-castings(-cantantes).ts — because
 * trash/restore.ts upserts `casting`/`applications` straight back into the
 * casting/application tables.
 */
export async function snapshotCastingToTrash(params: {
  castingsTable: "voces_castings" | "voces_castings_cantantes";
  applicationsTable: "voces_casting_applications" | "voces_casting_cantante_applications";
  castingId: string;
}): Promise<void> {
  const { castingsTable, applicationsTable, castingId } = params;

  const { data: castingRow, error: castingErr } = await supabase
    .from(castingsTable)
    .select("*")
    .eq("id", castingId)
    .maybeSingle();
  if (castingErr) throw new Error(castingErr.message);
  if (!castingRow) return; // nothing to snapshot (already gone)

  const { data: appRows, error: appsErr } = await supabase
    .from(applicationsTable)
    .select("*")
    .eq("casting_id", castingId);
  if (appsErr) throw new Error(appsErr.message);

  const files: string[] = [];
  for (const url of [castingRow.video_url, castingRow.script_url, castingRow.reference_url]) {
    if (url) files.push(url);
  }
  for (const app of appRows ?? []) {
    if (app.audio_url) files.push(app.audio_url);
  }

  const { error: insertErr } = await supabase.from("voces_trash").insert({
    id: `trash_${randomUUID()}`,
    type: "casting",
    casting: castingRow,
    applications: appRows ?? [],
    files,
  });
  if (insertErr) throw new Error(insertErr.message);
}
