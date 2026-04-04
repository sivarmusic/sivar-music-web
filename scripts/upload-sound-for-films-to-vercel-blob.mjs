#!/usr/bin/env node

import { put } from "@vercel/blob";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const FULL_INPUT_DIR = process.argv[2] ?? ".video-exports/sound-for-films/full";
const PREVIEW_INPUT_DIR =
  process.argv[3] ?? ".video-exports/sound-for-films/preview";
const MANIFEST_PATH =
  process.argv[4] ?? "app/data/soundForFilmsBlobManifest.json";

const token = process.env.BLOB_READ_WRITE_TOKEN;

if (!token) {
  console.error(
    "Missing BLOB_READ_WRITE_TOKEN. Add it to your shell or .env.local before uploading to Vercel Blob."
  );
  process.exit(1);
}

const videoExtensions = new Set([".mp4", ".mov", ".webm"]);

async function listVideoFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => videoExtensions.has(path.extname(name).toLowerCase()))
    .sort((left, right) => left.localeCompare(right));
}

async function uploadDirectory({
  inputDir,
  remoteDir,
  cacheControlMaxAge,
}) {
  const filenames = await listVideoFiles(inputDir);
  const urlsByFilename = {};

  if (filenames.length === 0) {
    throw new Error(`No video files found in ${inputDir}`);
  }

  for (const filename of filenames) {
    const filePath = path.join(inputDir, filename);
    const pathname = `${remoteDir}/${filename}`;
    const fileContents = await readFile(filePath);

    console.log(`Uploading ${pathname}`);

    const blob = await put(pathname, fileContents, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge,
      multipart: true,
      token,
    });

    urlsByFilename[filename] = blob.url;
  }

  return urlsByFilename;
}

async function main() {
  const [full, preview] = await Promise.all([
    uploadDirectory({
      inputDir: FULL_INPUT_DIR,
      remoteDir: "sound-for-films/full",
      cacheControlMaxAge: 60 * 60 * 24 * 30,
    }),
    uploadDirectory({
      inputDir: PREVIEW_INPUT_DIR,
      remoteDir: "sound-for-films/preview",
      cacheControlMaxAge: 60 * 60 * 24 * 7,
    }),
  ]);

  const manifest = {
    generatedAt: new Date().toISOString(),
    full,
    preview,
  };

  await mkdir(path.dirname(MANIFEST_PATH), { recursive: true });
  await writeFile(`${MANIFEST_PATH}`, `${JSON.stringify(manifest, null, 2)}\n`);

  console.log("");
  console.log(`Wrote manifest to ${MANIFEST_PATH}`);
  console.log("Commit that file and redeploy so production uses the Blob URLs.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
