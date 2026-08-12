// Ported from voces-bds's lib/slug.ts.
//
// Named voces-slug.ts (not slug.ts) because this repo already has its own
// lib/slug.ts (a differently-shaped `slugify(text)` helper used elsewhere)
// — keeping this separate avoids a naming collision / behavior change there.
const SLUG_ID_LENGTH = 8;

export function slugifyName(name: string) {
  return (name || "")
    .toString()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function makeLocutorSlug(name: string, id: string) {
  const slugName = slugifyName(name);
  const safeId = (id || "").replace(/[^a-z0-9]/gi, "");
  const idPart = safeId ? safeId.slice(0, SLUG_ID_LENGTH) : "locutor";
  return slugName ? `${slugName}-${idPart}` : idPart;
}

export function extractSlugBase(slug: string) {
  if (!slug) return "";
  const normalized = slug.toString().toLowerCase();
  const idx = normalized.lastIndexOf("-");
  if (idx <= 0) return normalized;
  return normalized.slice(0, idx);
}
