import { supabase } from "@/lib/supabase";

const APP_TABLES = ["voces_casting_applications", "voces_casting_cantante_applications"] as const;

/**
 * Devuelve las URLs (de `urls`) que SIGUEN referenciadas por alguna
 * postulación viva (de cualquier casting, de ambas tablas) o por otro ítem de
 * la papelera (restaurable). Las copias de postulaciones comparten la misma
 * URL de audio en el storage, así que antes de borrar un archivo hay que
 * verificar esto. Fail-safe: ante cualquier error de consulta se considera
 * referenciada (no se borra).
 */
export async function referencedUrls(urls: string[], opts?: { excludeTrashId?: string }): Promise<Set<string>> {
  const wanted = Array.from(new Set(urls.filter(Boolean)));
  const out = new Set<string>();
  if (wanted.length === 0) return out;
  try {
    for (const table of APP_TABLES) {
      const { data, error } = await supabase.from(table).select("audio_url").in("audio_url", wanted);
      if (error) throw new Error(error.message);
      for (const r of (data ?? []) as { audio_url?: string }[]) if (r.audio_url) out.add(r.audio_url);
    }
    let q = supabase.from("voces_trash").select("id, files, application, applications");
    if (opts?.excludeTrashId) q = q.neq("id", opts.excludeTrashId);
    const { data: trash, error: tErr } = await q;
    if (tErr) throw new Error(tErr.message);
    const set = new Set(wanted);
    for (const t of (trash ?? []) as { files?: unknown; application?: unknown; applications?: unknown }[]) {
      for (const f of Array.isArray(t.files) ? t.files : []) if (typeof f === "string" && set.has(f)) out.add(f);
      const apps = [
        ...(Array.isArray(t.applications) ? t.applications : []),
        ...(t.application ? [t.application] : []),
      ] as { audio_url?: string; audioUrl?: string }[];
      for (const a of apps) {
        for (const u of [a?.audio_url, a?.audioUrl]) if (u && set.has(u)) out.add(u);
      }
    }
  } catch {
    wanted.forEach((u) => out.add(u));
  }
  return out;
}
