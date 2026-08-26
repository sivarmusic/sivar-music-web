// Regenera los share_id de voces_playlists con CSPRNG.
//
// VA DESPUÉS DEL DEPLOY DEL FIX EN app/api/voces/playlist/share/route.ts, EN UN
// PASO SEPARADO Y MANUAL. Es la única parte irreversible: rompe los links
// /voces/s/<shareId> que ya circulan y no hay forma de volver atrás, porque el
// id viejo no queda guardado en ningún lado.
//
// Los share_id existentes salieron de Math.random() + Date.now(), que no es un
// CSPRNG: son predecibles a partir de otros ids observados. Como tener el link
// alcanza para ver la playlist, ese id ES la credencial — por eso se reemplaza,
// no se deja para "la próxima vez que se comparta".
//
// Adaptado de scripts/backfill-share-ids.mjs de voces-bds (mismo patrón:
// dry-run por default, --apply para escribir).
//
// Uso (desde la raíz del repo, con .env.local apuntando al Supabase de
// producción — NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY):
//   node --env-file=.env.local scripts/voces-backfill-playlist-share-ids.mjs           → dry-run, no escribe nada
//   node --env-file=.env.local scripts/voces-backfill-playlist-share-ids.mjs --apply   → escribe

import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.");
  process.exit(1);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } });

const secureShareId = () => `sh_${crypto.randomUUID()}`;

const { data: rows, error } = await db
  .from("voces_playlists")
  .select("id, name, client_id, share_id")
  .not("share_id", "is", null);

if (error) {
  console.error("ERROR leyendo voces_playlists:", error.message);
  process.exit(1);
}

if (!rows.length) {
  console.log("No hay playlists con share_id. Nada que hacer.");
  process.exit(0);
}

const { data: clients } = await db.from("voces_clients").select("id, email");
const emailOf = new Map((clients || []).map((c) => [c.id, c.email]));

console.log(`${APPLY ? "APLICANDO" : "DRY-RUN (nada se escribe)"} — ${rows.length} playlist(s)\n`);

const cambios = [];
for (const r of rows) {
  const nuevo = secureShareId();
  cambios.push({ ...r, nuevo });
  console.log(`  ${emailOf.get(r.client_id) || "(sin cliente)"} | ${r.name}`);
  console.log(`    viejo: /voces/s/${r.share_id}`);
  console.log(`    nuevo: /voces/s/${nuevo}\n`);
}

if (!APPLY) {
  console.log("Volvé a correr con --apply para escribir.");
  process.exit(0);
}

let ok = 0;
for (const c of cambios) {
  const { error: e } = await db.from("voces_playlists").update({ share_id: c.nuevo }).eq("id", c.id);
  if (e) console.error(`  FALLÓ ${c.id}: ${e.message}`);
  else ok++;
}

console.log(`\nActualizadas: ${ok}/${cambios.length}`);
console.log("Los links viejos ya no resuelven. Reenviá los nuevos a quien corresponda.");
