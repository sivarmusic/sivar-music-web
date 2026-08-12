// Redacción de PII para reportes servidos por link compartido.
//
// El payload del reporte incluye `raw` (base completa de registros y
// postulaciones) porque el Excel se genera en el cliente. Un link público es
// reenviable, así que los emails se enmascaran ACÁ, en el server, antes de
// salir: si se enmascararan sólo al renderizar, el Excel los filtraría igual.
//
// Los admins logueados (cookie voces_admin) siguen recibiendo el dato completo.
//
// Ported from voces-bds's lib/reportes/redact.ts — only the cookie name in
// this comment changed (bds_admin -> voces_admin); logic is untouched.

import type { ReportData, PostulacionRow, RegistroRow } from "./types";

// javier@gmail.com → j•••@gmail.com
export function maskEmail(email: string): string {
  const e = (email || "").trim();
  if (!e) return "";
  const at = e.lastIndexOf("@");
  if (at <= 0) return "•••";
  return `${e[0]}•••${e.slice(at)}`;
}

export function redactForShare(data: ReportData): ReportData {
  const maskRegistro = (r: RegistroRow): RegistroRow => ({ ...r, email: maskEmail(r.email) });
  const maskPostulacion = (p: PostulacionRow): PostulacionRow => ({ ...p, email: maskEmail(p.email) });

  return {
    ...data,
    postulaciones: {
      ...data.postulaciones,
      topActivos: data.postulaciones.topActivos.map((a) => ({ ...a, email: maskEmail(a.email) })),
    },
    raw: {
      ...data.raw,
      registros: data.raw.registros.map(maskRegistro),
      postulaciones: data.raw.postulaciones.map(maskPostulacion),
      seleccionados: data.raw.seleccionados.map(maskPostulacion),
    },
  };
}
