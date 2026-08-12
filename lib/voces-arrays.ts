// Ported from voces-bds's lib/arrays.ts (renamed with a voces- prefix to
// avoid colliding with this repo's own lib files).
export const toArray = (v: any): string[] => {
  if (Array.isArray(v)) return v.filter(Boolean);
  if (typeof v === "string")
    return v.split(",").map(s => s.trim()).filter(Boolean);
  return [];
};

export const asText = (v: any): string => {
  if (Array.isArray(v)) return v.filter(Boolean).join(", ");
  if (v === null || v === undefined) return "";
  return String(v);
};
