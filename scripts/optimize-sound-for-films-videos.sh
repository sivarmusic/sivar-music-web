#!/usr/bin/env bash
set -euo pipefail

INPUT_DIR="${1:-public/PORTFOLIO}"
OUTPUT_ROOT="${2:-.video-exports/sound-for-films}"
FULL_DIR="$OUTPUT_ROOT/full"
PREVIEW_DIR="$OUTPUT_ROOT/preview"

mkdir -p "$FULL_DIR" "$PREVIEW_DIR"

shopt -s nullglob
files=("$INPUT_DIR"/*.mp4 "$INPUT_DIR"/*.mov "$INPUT_DIR"/*.webm)

if [ "${#files[@]}" -eq 0 ]; then
  echo "No video files found in $INPUT_DIR"
  exit 1
fi

for input in "${files[@]}"; do
  filename="$(basename "$input")"
  full_output="$FULL_DIR/$filename"
  preview_output="$PREVIEW_DIR/$filename"

  echo "Optimizing full video: $filename"
  ffmpeg -y -hide_banner -loglevel error \
    -i "$input" \
    -vf "scale='min(1920,iw)':-2:force_original_aspect_ratio=decrease,fps=24,scale=trunc(iw/2)*2:trunc(ih/2)*2" \
    -c:v libx264 -preset slow -crf 25 -profile:v high -level 4.1 -pix_fmt yuv420p \
    -movflags +faststart \
    -c:a aac -b:a 128k \
    "$full_output"

  echo "Generating preview clip: $filename"
  ffmpeg -y -hide_banner -loglevel error \
    -ss 0 -t 8 \
    -i "$input" \
    -vf "scale='min(1280,iw)':-2:force_original_aspect_ratio=decrease,fps=24,scale=trunc(iw/2)*2:trunc(ih/2)*2" \
    -an \
    -c:v libx264 -preset medium -crf 30 -profile:v main -level 4.0 -pix_fmt yuv420p \
    -movflags +faststart \
    "$preview_output"
done

echo
echo "Done."
echo "Full videos:   $FULL_DIR"
echo "Preview clips: $PREVIEW_DIR"
echo "Next step:"
echo "  npm run videos:upload:vercel-blob"
