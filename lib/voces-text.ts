// Ported verbatim from voces-bds's lib/text.ts.
export function normalizeForSearch(s: string): string {
  if (!s) return "";
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const al = a.length, bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;
  let prev = new Array(bl + 1);
  for (let j = 0; j <= bl; j++) prev[j] = j;
  for (let i = 1; i <= al; i++) {
    const curr = [i];
    for (let j = 1; j <= bl; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }
  return prev[bl];
}

function tokenAllowedDistance(token: string): number {
  if (token.length <= 3) return 0;
  if (token.length <= 6) return 1;
  return 2;
}

/**
 * Fuzzy match: returns true if every token in `query` matches some token in `target`,
 * allowing prefix matches or short Levenshtein distance for typos.
 */
export function fuzzyMatch(target: string, query: string): boolean {
  const q = normalizeForSearch(query);
  if (!q) return true;
  const t = normalizeForSearch(target);
  if (!t) return false;
  if (t.includes(q)) return true;

  const qTokens = q.split(/\s+/).filter(Boolean);
  const tTokens = t.split(/\s+/).filter(Boolean);

  return qTokens.every((qt) => {
    const maxDist = tokenAllowedDistance(qt);
    return tTokens.some((tt) => {
      if (tt.includes(qt)) return true;
      if (maxDist === 0) return false;
      if (Math.abs(tt.length - qt.length) > maxDist) return false;
      return levenshtein(tt, qt) <= maxDist;
    });
  });
}
