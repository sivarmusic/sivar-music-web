#!/usr/bin/env node

/**
 * Migrates the Sound for Films videos out of the PUBLIC Vercel Blob store and
 * into the PRIVATE Supabase Storage bucket, where they are only reachable
 * through short-lived signed URLs.
 *
 * Sources, in order of preference:
 *   1. Local exports (.video-exports/sound-for-films/{full,preview})
 *   2. The URLs recorded in app/data/soundForFilmsBlobManifest.json
 *
 * Usage:
 *   node --env-file=.env.local scripts/migrate-sound-for-films-to-supabase.mjs
 *
 * This script does NOT delete anything from Vercel Blob. Removing the old
 * public objects is a separate, deliberate step — see the summary it prints.
 */

import { createClient } from "@supabase/supabase-js";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const BUCKET = "sound-for-films";
const MANIFEST_PATH = "app/data/soundForFilmsBlobManifest.json";
const LOCAL_DIRS = {
  full: ".video-exports/sound-for-films/full",
  preview: ".video-exports/sound-for-films/preview",
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Run with: node --env-file=.env.local scripts/migrate-sound-for-films-to-supabase.mjs"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

const CONTENT_TYPES = {
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
};

/**
 * Supabase Storage rejects non-ASCII object keys ("Invalid key"), so accents
 * are folded before upload. The source filename on disk keeps its spelling.
 *
 * Keep in sync with toStorageObjectKey() in lib/sound-for-films-videos.ts.
 */
function toStorageObjectKey(type, filename) {
  const asciiFilename = filename
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w\s.-]/g, "_");

  return `${type}/${asciiFilename}`;
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readSource(type, filename, remoteUrl) {
  const localPath = path.join(LOCAL_DIRS[type], filename);

  if (await fileExists(localPath)) {
    return { body: await readFile(localPath), origin: "local" };
  }

  const response = await fetch(remoteUrl);
  if (!response.ok) {
    throw new Error(`Download failed (${response.status}) for ${remoteUrl}`);
  }

  return {
    body: Buffer.from(await response.arrayBuffer()),
    origin: "blob",
  };
}

/** Existing object name -> byte size, so re-runs skip what already landed. */
async function listExisting(type) {
  const sizes = new Map();
  const { data } = await supabase.storage
    .from(BUCKET)
    .list(type, { limit: 1000 });

  for (const entry of data ?? []) {
    sizes.set(entry.name, entry.metadata?.size ?? -1);
  }

  return sizes;
}

async function migrateGroup(type, entries) {
  const results = [];
  const existing = await listExisting(type);

  for (const [filename, remoteUrl] of Object.entries(entries)) {
    const destination = toStorageObjectKey(type, filename);
    const objectName = destination.slice(type.length + 1);

    try {
      const { body, origin } = await readSource(type, filename, remoteUrl);

      if (existing.get(objectName) === body.length) {
        console.log(`  · ${destination} (ya migrado, se omite)`);
        results.push({ destination, ok: true });
        continue;
      }

      const contentType =
        CONTENT_TYPES[path.extname(filename).toLowerCase()] ??
        "application/octet-stream";

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(destination, body, { contentType, upsert: true });

      if (error) throw new Error(error.message);

      const sizeMb = (body.length / 1_048_576).toFixed(1);
      console.log(`  ✓ ${destination} (${sizeMb} MB, from ${origin})`);
      results.push({ destination, ok: true });
    } catch (error) {
      console.error(
        `  ✗ ${destination} — ${error instanceof Error ? error.message : error}`
      );
      results.push({ destination, ok: false });
    }
  }

  return results;
}

async function main() {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));

  const { data: buckets, error: bucketError } =
    await supabase.storage.listBuckets();

  if (bucketError) {
    throw new Error(`Could not list buckets: ${bucketError.message}`);
  }

  const bucket = buckets.find((entry) => entry.id === BUCKET);

  if (!bucket) {
    throw new Error(
      `Bucket "${BUCKET}" not found. Run scripts/sound-for-films-schema.sql first.`
    );
  }

  if (bucket.public) {
    throw new Error(
      `Bucket "${BUCKET}" is PUBLIC. Refusing to migrate — that would recreate ` +
        `the exact leak this migration closes. Set it to private first.`
    );
  }

  console.log("Migrating full videos...");
  const full = await migrateGroup("full", manifest.full ?? {});

  console.log("Migrating preview videos...");
  const preview = await migrateGroup("preview", manifest.preview ?? {});

  const all = [...full, ...preview];
  const failed = all.filter((entry) => !entry.ok);

  console.log("");
  console.log(`Migrated ${all.length - failed.length}/${all.length} objects.`);

  if (failed.length > 0) {
    console.log("Failed:");
    for (const entry of failed) console.log(`  - ${entry.destination}`);
    process.exitCode = 1;
    return;
  }

  console.log("");
  console.log("Next steps — the old public URLs are still live until you do this:");
  console.log("  1. Verify /sound-for-films plays every video.");
  console.log("  2. Delete the sound-for-films/** objects from the Vercel Blob store.");
  console.log("  3. Delete app/data/soundForFilmsBlobManifest.json and the");
  console.log("     upload-sound-for-films-to-vercel-blob.mjs script.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
