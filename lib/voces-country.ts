// Ported verbatim from voces-bds's lib/country.ts.
function normalizeKey(input: string) {
  return input
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

const COUNTRY_TO_ISO: Record<string, string> = {
  argentina: "AR",
  arg: "AR",
  mexico: "MX",
  mexicana: "MX",
  mexicanao: "MX",
  colombia: "CO",
  chile: "CL",
  peru: "PE",
  paraguay: "PY",
  uruguay: "UY",
  bolivia: "BO",
  ecuador: "EC",
  venezuela: "VE",
  panama: "PA",
  costa_rica: "CR",
  "costa rica": "CR",
  guatemala: "GT",
  honduras: "HN",
  salvador: "SV",
  "el salvador": "SV",
  nicaragua: "NI",
  cuba: "CU",
  puerto_rico: "PR",
  "puerto rico": "PR",
  republica_dominicana: "DO",
  "republica dominicana": "DO",
  espana: "ES",
  españa: "ES",
  spain: "ES",
  estados_unidos: "US",
  "estados unidos": "US",
  usa: "US",
  united_states: "US",
  canada: "CA",
  brasil: "BR",
  brazil: "BR",
  portugal: "PT",
  francia: "FR",
  france: "FR",
  inglaterra: "GB",
  uk: "GB",
  "reino unido": "GB",
};

function isoToFlag(iso: string) {
  const code = iso.toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return null;
  const chars = [...code].map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
  return chars.join("");
}

export function countryToFlag(country?: string | null) {
  if (!country) return null;
  const normalized = normalizeKey(country);
  if (!normalized) return null;

  if (COUNTRY_TO_ISO[normalized]) {
    return isoToFlag(COUNTRY_TO_ISO[normalized]);
  }

  const key = normalized.replace(/\s+/g, "_");
  if (COUNTRY_TO_ISO[key]) {
    return isoToFlag(COUNTRY_TO_ISO[key]);
  }

  // detect if already iso code (two letters)
  if (/^[a-z]{2}$/.test(normalized)) {
    return isoToFlag(normalized.toUpperCase());
  }

  return null;
}
