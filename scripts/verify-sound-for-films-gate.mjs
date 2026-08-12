#!/usr/bin/env node

/**
 * Checks that the Sound for Films gate is fully wired: settings row, private
 * bucket, migrated videos and signing secret.
 *
 * Usage:
 *   node --env-file=.env.local scripts/verify-sound-for-films-gate.mjs
 */

import { createClient } from "@supabase/supabase-js";
import process from "node:process";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Run with: node --env-file=.env.local scripts/verify-sound-for-films-gate.mjs"
  );
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const problems = [];

function report(label, ok, detail) {
  console.log(`${ok ? "✓" : "✗"} ${label.padEnd(14)} ${detail}`);
  if (!ok) problems.push(label);
}

const { data: row, error: tableError } = await supabase
  .from("sound_for_films_settings")
  .select("id, gate_enabled, password_hash")
  .eq("id", 1)
  .maybeSingle();

if (tableError) {
  report("tabla", false, tableError.message);
} else if (!row) {
  report("tabla", false, "existe, pero falta la fila id=1");
} else {
  report(
    "tabla",
    true,
    `gate_enabled=${row.gate_enabled} · contraseña ${row.password_hash ? "definida" : "SIN DEFINIR"}`
  );
  if (!row.password_hash) {
    problems.push("contraseña");
    console.log("  → definila en /sound-for-films/admin");
  }
}

const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
const bucket = buckets?.find((entry) => entry.id === "sound-for-films");

if (bucketError) {
  report("bucket", false, bucketError.message);
} else if (!bucket) {
  report("bucket", false, "'sound-for-films' no existe");
} else {
  report(
    "bucket",
    !bucket.public,
    bucket.public ? "ES PÚBLICO — corregir antes de migrar" : "privado"
  );

  const [full, preview] = await Promise.all([
    supabase.storage.from("sound-for-films").list("full", { limit: 1000 }),
    supabase.storage.from("sound-for-films").list("preview", { limit: 1000 }),
  ]);

  const fullCount = full.data?.length ?? 0;
  const previewCount = preview.data?.length ?? 0;

  // Every catalog entry needs both a full and a preview object, so a mismatch
  // means the migration left something behind.
  const complete = fullCount > 0 && fullCount === previewCount;
  const missing = previewCount - fullCount;

  report(
    "videos",
    complete,
    `${fullCount} full · ${previewCount} preview` +
      (fullCount === 0
        ? " — falta correr la migración"
        : missing !== 0
          ? ` — faltan ${Math.abs(missing)} en ${missing > 0 ? "full" : "preview"}`
          : "")
  );
}

report(
  "secret",
  Boolean(process.env.SOUND_FOR_FILMS_SECRET),
  process.env.SOUND_FOR_FILMS_SECRET
    ? "definido"
    : "falta SOUND_FOR_FILMS_SECRET"
);

console.log("");
if (problems.length === 0) {
  console.log("Todo listo. El gate está operativo.");
} else {
  console.log(`Pendiente: ${problems.join(", ")}`);
  process.exitCode = 1;
}
