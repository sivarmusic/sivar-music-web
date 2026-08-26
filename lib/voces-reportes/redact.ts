// Redacción de PII y de datos comerciales para reportes servidos por link
// compartido.
//
// El payload del reporte incluye `raw` (base completa de registros y
// postulaciones) porque el Excel se genera en el cliente. Un link público es
// reenviable, así que todo lo sensible se saca ACÁ, en el server, antes de
// salir: si se ocultara sólo al renderizar, el Excel lo filtraría igual.
//
// DISEÑO — ALLOWLIST, NO SPREAD:
// La versión anterior de este archivo hacía `{ ...data, <overrides> }`. Eso
// significa que toda sección nueva de ReportData salía SIN redactar por
// omisión: agregar una sección al reporte la publicaba en los links
// compartidos sin que nadie tuviera que decidirlo. Falla abierta.
//
// Acá cada sección se nombra y se copia una por una. Cuando se agregue una
// sección nueva a ReportData, TypeScript va a romper este archivo hasta que
// alguien decida explícitamente si es pública, si va recortada o si se omite.
// Falla cerrada, que es como tiene que fallar esto.
//
// Ported from voces-bds's lib/reportes/redact.ts (post-hardening version,
// commit 99d15ef) — el tipo ReportData de este proyecto coincide campo a
// campo con el de voces-bds, así que no hizo falta adaptar ninguna sección.

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
    // ── Público sin cambios ──────────────────────────────────────
    rango: data.rango,
    resumen: data.resumen,
    efectividad: data.efectividad,
    actividad: data.actividad,

    registros: data.registros,

    // ── Recortado ────────────────────────────────────────────────

    // `porCliente` expone a cada cliente el volumen y el presupuesto de los
    // demás. El reporte es global (buildReport no filtra por usuario), así que
    // un link compartido con un cliente le mostraría la operación completa.
    // Hasta que el reporte tenga scope real por cliente, estos desgloses no
    // salen por link.
    castings: { ...data.castings, porCliente: [] },
    presupuesto: { ...data.presupuesto, porCliente: [] },

    // Emails de los postulantes más activos.
    postulaciones: {
      ...data.postulaciones,
      topActivos: data.postulaciones.topActivos.map((a) => ({ ...a, email: maskEmail(a.email) })),
    },

    // `raw` alimenta el Excel: se enmascara acá o se filtra en la descarga.
    raw: {
      registros: data.raw.registros.map(maskRegistro),
      castings: data.raw.castings,
      postulaciones: data.raw.postulaciones.map(maskPostulacion),
      seleccionados: data.raw.seleccionados.map(maskPostulacion),
    },
  };
}
