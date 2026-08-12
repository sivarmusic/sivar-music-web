// Exportación del reporte a Excel (.xlsx), 100% client-side, con la librería
// `xlsx` (SheetJS). Genera un workbook multi-hoja a partir de los datos ya
// cargados en pantalla (no vuelve al servidor).
//
// NOTA: la edición community de `xlsx` NO aplica estilos de celda (negrita, etc.).
// Dejamos la fila de encabezado como primera fila de cada hoja; si en el futuro
// se necesita negrita real, reemplazar `xlsx` por `xlsx-js-style` sin cambiar
// esta estructura.
//
// Ported from voces-bds's lib/exportReporte.ts, moved inside lib/voces-reportes/
// (this repo's convention for this batch's ported module) and with the output
// filename rebranded (BDS_REPORTE_VOCES -> SIVAR_REPORTE_VOCES). Requires the
// `xlsx` package, added to package.json alongside `fflate` for this batch.

import * as XLSX from "xlsx";
import type { ReportData } from "./types";
import { fmtDate } from "./format";

type AOA = (string | number | boolean | null)[][];

function sheetFrom(aoa: AOA, colWidths?: number[]): XLSX.WorkSheet {
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  if (colWidths) ws["!cols"] = colWidths.map((w) => ({ wch: w }));
  return ws;
}

export function exportReporteToExcel(data: ReportData) {
  const wb = XLSX.utils.book_new();
  const r = data.resumen;

  // ── Hoja: Resumen (KPIs) ───────────────────────────────────────
  const resumen: AOA = [
    ["Métrica", "Valor"],
    ["Rango desde", fmtDate(data.rango.desde)],
    ["Rango hasta", fmtDate(data.rango.hasta)],
    ["Generado el", fmtDate(data.rango.generadoEn)],
    ["Registros en el período", r.registrosPeriodo],
    ["Registros acumulados (histórico)", r.registrosAcumulados],
    ["Castings producidos", r.castingsPeriodo],
    ["— Castings de locutores", r.castingsLocutores],
    ["— Castings de cantantes", r.castingsCantantes],
    ["Postulaciones recibidas", r.postulaciones],
    ["Presupuesto convocado ARS", r.presupuestoARS],
    ["Presupuesto convocado USD", r.presupuestoUSD],
    ["Voces seleccionadas", r.seleccionados],
    ["Tasa de conversión (%)", r.tasaConversion],
  ];
  XLSX.utils.book_append_sheet(wb, sheetFrom(resumen, [34, 22]), "Resumen");

  // ── Hoja: Registros ────────────────────────────────────────────
  const registros: AOA = [
    ["Tipo", "Nombre", "Email", "País", "Género", "Estilos", "Fecha registro"],
    ...data.raw.registros.map((x) => [x.tipo, x.nombre, x.email, x.pais, x.genero, x.estilos, fmtDate(x.createdAt)]),
  ];
  XLSX.utils.book_append_sheet(wb, sheetFrom(registros, [10, 26, 28, 16, 12, 30, 14]), "Registros");

  // ── Hoja: Castings ─────────────────────────────────────────────
  const castings: AOA = [
    ["Tipo", "Título", "Cliente", "Estado", "Medio", "Presupuesto", "Moneda", "Postulaciones", "Seleccionados", "Creado", "Deadline"],
    ...data.raw.castings.map((x) => [
      x.tipo, x.titulo, x.cliente, x.estado, x.medio,
      x.presupuesto ?? "", x.moneda, x.postulaciones, x.seleccionados,
      fmtDate(x.createdAt), x.deadline ? fmtDate(x.deadline) : "",
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, sheetFrom(castings, [10, 28, 20, 14, 12, 14, 8, 14, 14, 12, 12]), "Castings");

  // ── Hoja: Postulaciones ────────────────────────────────────────
  const postCols = ["Tipo", "Casting", "Nombre", "Email", "País", "Seleccionado", "Fecha", "Seleccionado el"];
  const postulaciones: AOA = [
    postCols,
    ...data.raw.postulaciones.map((x) => [
      x.tipo, x.casting, x.nombre, x.email, x.pais,
      x.seleccionado ? "Sí" : "No", fmtDate(x.createdAt), x.seleccionadoEn ? fmtDate(x.seleccionadoEn) : "",
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, sheetFrom(postulaciones, [10, 26, 24, 28, 16, 14, 12, 14]), "Postulaciones");

  // ── Hoja: Seleccionados ────────────────────────────────────────
  const seleccionados: AOA = [
    postCols,
    ...data.raw.seleccionados.map((x) => [
      x.tipo, x.casting, x.nombre, x.email, x.pais,
      "Sí", fmtDate(x.createdAt), x.seleccionadoEn ? fmtDate(x.seleccionadoEn) : "",
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, sheetFrom(seleccionados, [10, 26, 24, 28, 16, 14, 12, 14]), "Seleccionados");

  // ── Nombre de archivo ──────────────────────────────────────────
  const desde = data.rango.desde.slice(0, 10);
  const hasta = data.rango.hasta.slice(0, 10);
  XLSX.writeFile(wb, `SIVAR_REPORTE_VOCES_${desde}_${hasta}.xlsx`);
}
