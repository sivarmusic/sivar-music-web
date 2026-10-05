import { randomUUID } from "crypto";
import { supabase } from "@/lib/supabase";

export type MoveTarget = { id: string; shareId: string };
export type MoveSkipped = { id: string; name: string; reason: string };
export type MoveResult = {
  /** Ids (de origen) de las postulaciones movidas o copiadas. */
  moved: string[];
  skipped: MoveSkipped[];
  /** Ids inexistentes o que ya estaban en el casting destino (no es error). */
  ignored: number;
};
export type MoveOptions = {
  /** true = COPIA (el original no se toca). false = MUDA (UPDATE). */
  keepOriginal: boolean;
  /** Prefijo de los ids nuevos (mismo que usa createApplication de cada tipo). */
  idPrefix: string;
};

const normEmail = (e: unknown) => (typeof e === "string" ? e.trim().toLowerCase() : "");

type Row = Record<string, unknown> & {
  id: string;
  casting_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
};

/**
 * Copia o muda postulaciones a otro casting (misma tabla de postulaciones).
 * - Omite las que tengan un email que ya postuló en el destino, incluyendo
 *   duplicados dentro del propio lote.
 * - COPIA (keepOriginal): INSERT de una fila nueva en el destino con todos los
 *   campos del original (incluye audio_url, audio_link_original, hidden y
 *   created_at) salvo id/casting_id/share_id y selected=false. El original no
 *   se toca. Ojo: original y copia comparten la misma URL de audio.
 * - MUDA: UPDATE de casting_id/share_id, selected=false y selected_at=null.
 */
export async function moveApplicationsInTable(
  table: string,
  ids: string[],
  target: MoveTarget,
  opts: MoveOptions,
): Promise<MoveResult> {
  const uniqueIds = Array.from(new Set(ids.filter((i) => typeof i === "string" && i)));
  const result: MoveResult = { moved: [], skipped: [], ignored: 0 };
  if (uniqueIds.length === 0) return result;

  const { data: rows, error } = await supabase.from(table).select("*").in("id", uniqueIds);
  if (error) throw new Error(error.message);

  const found = (rows ?? []) as Row[];
  result.ignored = uniqueIds.length - found.length;

  const { data: destRows, error: destErr } = await supabase
    .from(table)
    .select("email")
    .eq("share_id", target.shareId);
  if (destErr) throw new Error(destErr.message);
  const taken = new Set(((destRows ?? []) as { email?: string }[]).map((r) => normEmail(r.email)).filter(Boolean));

  // Respetar el orden de los ids recibidos.
  const byId = new Map(found.map((r) => [r.id, r]));
  for (const id of uniqueIds) {
    const row = byId.get(id);
    if (!row) continue;
    if (row.casting_id === target.id) {
      result.ignored++;
      continue;
    }
    const email = normEmail(row.email);
    if (email && taken.has(email)) {
      const name = `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim() || "Sin nombre";
      result.skipped.push({ id, name, reason: "ya postuló en el destino" });
      continue;
    }
    if (opts.keepOriginal) {
      const copy = {
        ...row,
        id: `${opts.idPrefix}_${randomUUID()}`,
        casting_id: target.id,
        share_id: target.shareId,
        selected: false,
        selected_at: null,
      };
      const { error: insErr } = await supabase.from(table).insert(copy);
      if (insErr) throw new Error(insErr.message);
    } else {
      const { error: upErr } = await supabase
        .from(table)
        .update({ casting_id: target.id, share_id: target.shareId, selected: false, selected_at: null })
        .eq("id", id);
      if (upErr) throw new Error(upErr.message);
    }
    if (email) taken.add(email);
    result.moved.push(id);
  }
  return result;
}
