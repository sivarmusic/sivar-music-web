// Ported verbatim from voces-bds's lib/names.ts.
export function getFirstName(fullName: string) {
  if (!fullName) return "";
  const normalized = fullName.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  const spaceIdx = normalized.indexOf(" ");
  return spaceIdx === -1 ? normalized : normalized.slice(0, spaceIdx);
}
