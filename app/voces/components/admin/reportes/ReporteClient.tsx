"use client";

// Orquestador del reporte: carga los datos desde /api/voces/reportes y renderiza
// las 7 secciones. Maneja loading (skeletons), estado vacío y errores.
// El botón "Descargar Excel" exporta con los datos ya cargados (client-side).
//
// Ported from voces-bds's app/components/reportes/ReporteClient.tsx.
//  - API: /api/reportes -> /api/voces/reportes.
//  - lib/reportes/* -> lib/voces-reportes/* (aggregate/types/format ported
//    earlier in this batch), lib/exportReporte -> lib/voces-reportes/export.
//  - Links: /admin/clients -> /voces/admin/clients, /admin/reportes -> /voces/admin/reportes.
//  - Title: "Reporte VOCES BDS" -> "Reporte VOCES — Sivar Music" (brand swap,
//    same convention as the rest of this batch's ported pages).

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReportData } from "@/lib/voces-reportes/types";
import { fmtNum, fmtPct, fmtMoney, fmtDate, fmtMonthShort, fmtDayShort } from "@/lib/voces-reportes/format";
import { exportReporteToExcel } from "@/lib/voces-reportes/export";
import RangoModal from "./RangoModal";
import CompartirButton from "./CompartirButton";
import {
  Section, Card, CardTitle, KpiCard, BarChart, StackedBarChart, LineChart, Donut, HBarList,
  DataTable, Column, SectionSkeleton, EmptyState, ACCENT, SECOND,
} from "./primitives";

// `shareToken` presente = vista pública de solo lectura (link compartido):
// los datos se piden con el token y se ocultan las acciones de admin.
export default function ReporteClient({ desde, hasta, shareToken }: { desde: string; hasta: string; shareToken?: string }) {
  const router = useRouter();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = shareToken
        ? `token=${encodeURIComponent(shareToken)}`
        : `desde=${desde}&hasta=${hasta}`;
      const res = await fetch(`/api/voces/reportes?${qs}`, { cache: "no-store" });
      const j = await res.json();
      if (!res.ok || !j?.ok) throw new Error(j?.error || "No se pudo generar el reporte");
      setData(j.data as ReportData);
    } catch (e: any) {
      setError(e?.message || "Error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [desde, hasta, shareToken]);

  useEffect(() => { load(); }, [load]);

  const totalPeriodo = data ? data.resumen.registrosPeriodo + data.resumen.castingsPeriodo + data.resumen.postulaciones : 0;

  return (
    <main className="min-h-screen px-5 md:px-10 py-8 max-w-[1100px] mx-auto">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[24px] md:text-[28px] font-[700]" style={{ color: "var(--color-text-primary)" }}>Reporte VOCES — Sivar Music</h1>
          {data ? (
            <p className="text-[13px] mt-1" style={{ color: "var(--color-text-secondary)" }}>
              {fmtDate(data.rango.desde)} — {fmtDate(data.rango.hasta)} · Generado el {fmtDate(data.rango.generadoEn)}
            </p>
          ) : (
            <p className="text-[13px] mt-1" style={{ color: "var(--color-text-secondary)" }}>
              {fmtDate(desde)} — {fmtDate(hasta)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!shareToken && (
            <>
              <button onClick={() => router.push("/voces/admin/clients")} className="text-[13px] px-3 py-2 rounded-lg" style={{ color: "var(--color-text-secondary)", background: "var(--color-bg-subtle)" }}>← Panel</button>
              <button onClick={() => setModalOpen(true)} className="text-[13px] px-3 py-2 rounded-lg" style={{ color: "var(--color-text-secondary)", background: "var(--color-bg-subtle)" }}>Nuevo rango</button>
              <CompartirButton desde={desde} hasta={hasta} />
            </>
          )}
          <button onClick={() => data && exportReporteToExcel(data)} disabled={!data} className="ds-btn-primary px-4 py-2 text-[13px] disabled:opacity-40 inline-flex items-center gap-2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
            Descargar Excel
          </button>
        </div>
      </header>

      {shareToken && !error && (
        <div className="ds-card p-3 mb-6 text-[12px]" style={{ color: "var(--color-text-muted)" }}>
          Vista compartida de solo lectura. Los emails de locutores y cantantes están enmascarados.
        </div>
      )}

      {error && <EmptyState title="No se pudo generar el reporte" message={error} />}

      {loading && !error && (
        <div>{Array.from({ length: 3 }).map((_, i) => <SectionSkeleton key={i} />)}</div>
      )}

      {!loading && data && (
        <>
          {totalPeriodo === 0 && (
            <div className="ds-card p-4 mb-8 text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
              No hubo actividad en este rango (registros, castings ni postulaciones). Las series históricas de 12 meses igual se muestran para dar contexto.
            </div>
          )}

          <ResumenSection data={data} />
          <RegistrosSection data={data} />
          <CastingsSection data={data} />
          <PostulacionesSection data={data} />
          <EfectividadSection data={data} />
          <PresupuestoSection data={data} />
          <ActividadSection data={data} />
        </>
      )}

      <RangoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initialDesde={desde}
        initialHasta={hasta}
        onConfirm={(d, h) => { setModalOpen(false); router.push(`/voces/admin/reportes?desde=${d}&hasta=${h}`); }}
      />
    </main>
  );
}

// ── SECCIÓN 1 — Resumen ────────────────────────────────────────────
function ResumenSection({ data }: { data: ReportData }) {
  const r = data.resumen;
  return (
    <Section title="Resumen ejecutivo" description="Indicadores principales del período seleccionado.">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Registros (período)" value={fmtNum(r.registrosPeriodo)} accent />
        <KpiCard label="Registros acumulados" value={fmtNum(r.registrosAcumulados)} sub="histórico total" />
        <KpiCard label="Castings producidos" value={fmtNum(r.castingsPeriodo)} sub={`Loc ${fmtNum(r.castingsLocutores)} · Cant ${fmtNum(r.castingsCantantes)}`} />
        <KpiCard label="Postulaciones" value={fmtNum(r.postulaciones)} />
        <KpiCard label="Voces seleccionadas" value={fmtNum(r.seleccionados)} />
        <KpiCard label="Tasa de conversión" value={fmtPct(r.tasaConversion)} sub="seleccionadas / postulaciones" />
        <KpiCard label="Presupuesto ARS" value={fmtMoney(r.presupuestoARS, "ARS")} />
        <KpiCard label="Presupuesto USD" value={fmtMoney(r.presupuestoUSD, "USD")} />
      </div>
    </Section>
  );
}

// ── SECCIÓN 2 — Registros ──────────────────────────────────────────
function RegistrosSection({ data }: { data: ReportData }) {
  const s = data.registros;
  const paisCols: Column<{ pais: string; cantidad: number }>[] = [
    { key: "pais", header: "País", sortable: true },
    { key: "cantidad", header: "Registros", align: "right", sortable: true, render: (r) => fmtNum(r.cantidad) },
  ];
  return (
    <Section title="Registros de locutores y cantantes" description="Altas en el período y composición de la base." note={s.aproximado ? "Activos/inactivos se calcula por coincidencia de email (aproximado)." : undefined}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card><CardTitle>Nuevos registros por semana</CardTitle><BarChart data={s.porSemana.map((p) => ({ label: fmtDayShort(p.label), value: p.value }))} /></Card>
        <Card><CardTitle>Distribución por género</CardTitle><Donut data={s.porGenero} /></Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card><CardTitle>Distribución por país</CardTitle><DataTable columns={paisCols} rows={s.porPais} maxRows={12} emptyMessage="Sin registros en el rango" /></Card>
        <div className="grid grid-cols-2 gap-3 content-start">
          <KpiCard label="Perfil completo" value={fmtPct(s.tasaPerfilCompleto)} sub="locutores con demo, país, género y estilo" />
          <KpiCard label="Activos (90 días)" value={fmtNum(s.activos)} sub="postularon recientemente" />
          <KpiCard label="Inactivos" value={fmtNum(s.inactivos)} sub="sin postulaciones recientes" />
        </div>
      </div>
    </Section>
  );
}

// ── SECCIÓN 3 — Castings ───────────────────────────────────────────
function CastingsSection({ data }: { data: ReportData }) {
  const s = data.castings;
  const estadoLabels: Record<string, string> = { open: "Abierto", in_selection: "En selección", closed: "Cerrado", finished: "Finalizado" };
  const clienteCols: Column<typeof s.porCliente[number]>[] = [
    { key: "cliente", header: "Cliente", sortable: true },
    { key: "cantidad", header: "Castings", align: "right", sortable: true, render: (r) => fmtNum(r.cantidad) },
    { key: "presupuestoARS", header: "ARS", align: "right", sortable: true, render: (r) => fmtMoney(r.presupuestoARS, "ARS") },
    { key: "presupuestoUSD", header: "USD", align: "right", sortable: true, render: (r) => fmtMoney(r.presupuestoUSD, "USD") },
  ];
  const topCols: Column<typeof s.topPostulaciones[number]>[] = [
    { key: "titulo", header: "Casting" },
    { key: "tipo", header: "Tipo" },
    { key: "postulaciones", header: "Postulaciones", align: "right", render: (r) => fmtNum(r.postulaciones) },
  ];
  return (
    <Section title="Castings" description="Producción de castings por tipo, estado, cliente y medio.">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardTitle>Por tipo (locutores vs. cantantes)</CardTitle>
          <div className="grid grid-cols-2 gap-3">
            {s.porTipo.map((t) => (
              <div key={t.tipo} className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="text-[13px] font-[500] mb-2" style={{ color: t.tipo === "Locutor" ? ACCENT : SECOND }}>{t.tipo}es</div>
                <div className="text-[12px] flex justify-between" style={{ color: "var(--color-text-secondary)" }}><span>Castings</span><span style={{ color: "var(--color-text-primary)" }}>{fmtNum(t.cantidad)}</span></div>
                <div className="text-[12px] flex justify-between" style={{ color: "var(--color-text-secondary)" }}><span>Postulaciones</span><span style={{ color: "var(--color-text-primary)" }}>{fmtNum(t.postulaciones)}</span></div>
                <div className="text-[12px] flex justify-between" style={{ color: "var(--color-text-secondary)" }}><span>Presup. ARS</span><span style={{ color: "var(--color-text-primary)" }}>{fmtMoney(t.presupuestoARS, "ARS")}</span></div>
                <div className="text-[12px] flex justify-between" style={{ color: "var(--color-text-secondary)" }}><span>Presup. USD</span><span style={{ color: "var(--color-text-primary)" }}>{fmtMoney(t.presupuestoUSD, "USD")}</span></div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardTitle>Por estado (locutores / cantantes)</CardTitle>
          <StackedBarChart
            data={s.porEstado.map((e) => ({ label: estadoLabels[e.estado] || e.estado, a: e.locutores, b: e.cantantes }))}
            labelA="Locutores" labelB="Cantantes"
          />
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card><CardTitle>Por cliente</CardTitle><DataTable columns={clienteCols} rows={s.porCliente} maxRows={12} emptyMessage="Sin castings con cliente" /></Card>
        <Card><CardTitle>Por tipo de medio</CardTitle><Donut data={s.porMedio} /></Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card><CardTitle>Top 5 castings con más postulaciones</CardTitle><DataTable columns={topCols} rows={s.topPostulaciones} emptyMessage="Sin postulaciones" /></Card>
        <div className="grid grid-cols-1 gap-3 content-start">
          <KpiCard label="Tiempo prom. de apertura" value={s.tiempoAperturaPromDias != null ? `${fmtNum(s.tiempoAperturaPromDias)} días` : "—"} sub="entre creación y deadline" />
          <Card><CardTitle>Distribución de presupuesto (ARS)</CardTitle><HBarList data={s.distribucionPresupuesto.map((r) => ({ label: r.rango, value: r.cantidad }))} /></Card>
        </div>
      </div>
    </Section>
  );
}

// ── SECCIÓN 4 — Postulaciones ──────────────────────────────────────
function PostulacionesSection({ data }: { data: ReportData }) {
  const s = data.postulaciones;
  const topCols: Column<typeof s.topActivos[number]>[] = [
    { key: "nombre", header: "Locutor/Cantante" },
    { key: "email", header: "Email" },
    { key: "cantidad", header: "Postulaciones", align: "right", render: (r) => fmtNum(r.cantidad) },
  ];
  return (
    <Section title="Postulaciones y participación" description="Volumen, tiempos de respuesta y actividad." note={s.aproximado ? "Actividad por persona se agrupa por email (aproximado)." : undefined}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KpiCard label="Prom. por casting" value={fmtNum(s.porCasting.promedio)} />
        <KpiCard label="Máx / Mín" value={`${fmtNum(s.porCasting.max)} / ${fmtNum(s.porCasting.min)}`} />
        <KpiCard label="Tiempo de respuesta" value={s.tiempoRespuesta ? `${fmtNum(s.tiempoRespuesta.horas)} h` : "—"} sub={s.tiempoRespuesta ? `${fmtNum(s.tiempoRespuesta.dias)} días prom.` : undefined} />
        <KpiCard label="Recurrentes" value={fmtNum(s.recurrentes)} sub="postularon a +1 casting" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card><CardTitle>Distribución de tiempo de respuesta</CardTitle><HBarList data={s.distribucionRespuesta} color={SECOND} /></Card>
        <Card>
          <CardTitle>Top 10 más activos</CardTitle>
          <DataTable columns={topCols} rows={s.topActivos} emptyMessage="Sin postulaciones en el rango" />
          <div className="text-[12px] mt-3 pt-3" style={{ color: "var(--color-text-muted)", borderTop: "0.5px solid rgba(255,255,255,0.07)" }}>
            Nunca postularon: <span style={{ color: "var(--color-text-primary)" }}>{fmtNum(s.nuncaPostularon.cantidad)}</span> ({fmtPct(s.nuncaPostularon.porcentaje)} de los registrados)
          </div>
        </Card>
      </div>
    </Section>
  );
}

// ── SECCIÓN 5 — Efectividad ────────────────────────────────────────
function EfectividadSection({ data }: { data: ReportData }) {
  const s = data.efectividad;
  const cols: Column<typeof s.porCasting[number]>[] = [
    { key: "titulo", header: "Casting", sortable: true },
    { key: "tipo", header: "Tipo", sortable: true },
    { key: "postulantes", header: "Postulantes", align: "right", sortable: true, render: (r) => fmtNum(r.postulantes) },
    { key: "seleccionados", header: "Elegidos", align: "right", sortable: true, render: (r) => fmtNum(r.seleccionados) },
    { key: "resuelto", header: "Resuelto", align: "right", sortable: true, render: (r) => (r.seleccionados > 0 ? "Sí" : "No") },
    { key: "tasa", header: "Selectividad", align: "right", sortable: true, render: (r) => fmtPct(r.tasa) },
  ];
  return (
    <Section
      title="Efectividad y selección"
      description="Qué tan seguido los castings terminan con una voz elegida."
      note="Efectividad = % de castings que eligieron ≥1 voz (cumplieron su objetivo). La 'selectividad' de la tabla es seleccionados/postulantes: baja es normal y esperable — un casting elige pocos de muchos."
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KpiCard label="Tasa de efectividad" value={fmtPct(s.tasaGlobal)} sub="castings que eligieron ≥1 voz" accent />
        <KpiCard label="Efectividad locutores" value={fmtPct(s.tasaLocutores)} />
        <KpiCard label="Efectividad cantantes" value={fmtPct(s.tasaCantantes)} />
        <KpiCard label="Tiempo hasta selección" value={s.tiempoHastaSeleccionDias != null ? `${fmtNum(s.tiempoHastaSeleccionDias)} días` : "—"} sub="desde el deadline" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2"><Card><CardTitle>Tasa de elegibilidad por casting</CardTitle><DataTable columns={cols} rows={s.porCasting} maxRows={15} emptyMessage="Sin castings con postulantes" /></Card></div>
        <div className="grid grid-cols-1 gap-3 content-start">
          <KpiCard label="Castings sin selección" value={fmtNum(s.sinSeleccion)} sub="finalizados sin voz elegida" />
          <KpiCard label="Perfil seleccionados" value={s.perfilSeleccionados.paisTop} sub={`Género frecuente: ${s.perfilSeleccionados.generoTop}`} />
        </div>
      </div>
    </Section>
  );
}

// ── SECCIÓN 6 — Presupuesto ────────────────────────────────────────
function PresupuestoSection({ data }: { data: ReportData }) {
  const s = data.presupuesto;
  const clienteCols: Column<typeof s.porCliente[number]>[] = [
    { key: "cliente", header: "Cliente", sortable: true },
    { key: "ars", header: "ARS", align: "right", sortable: true, render: (r) => fmtMoney(r.ars, "ARS") },
    { key: "usd", header: "USD", align: "right", sortable: true, render: (r) => fmtMoney(r.usd, "USD") },
  ];
  const medioCols: Column<typeof s.porMedio[number]>[] = [
    { key: "medio", header: "Medio", sortable: true },
    { key: "ars", header: "ARS", align: "right", sortable: true, render: (r) => fmtMoney(r.ars, "ARS") },
    { key: "usd", header: "USD", align: "right", sortable: true, render: (r) => fmtMoney(r.usd, "USD") },
  ];
  return (
    <Section title="Presupuesto" description="Inversión convocada por moneda, tipo, cliente, medio y en el tiempo.">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KpiCard label="Total ARS" value={fmtMoney(s.totalARS, "ARS")} accent />
        <KpiCard label="Total USD" value={fmtMoney(s.totalUSD, "USD")} accent />
        <KpiCard label="Promedio ARS" value={fmtMoney(s.promedioARS, "ARS")} sub="por casting" />
        <KpiCard label="Promedio USD" value={fmtMoney(s.promedioUSD, "USD")} sub="por casting" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card><CardTitle>Evolución mensual ARS (12 meses)</CardTitle><LineChart data={s.evolucionMensual.map((m) => ({ label: fmtMonthShort(m.mes), value: m.ars }))} /></Card>
        <Card><CardTitle>Evolución mensual USD (12 meses)</CardTitle><LineChart data={s.evolucionMensual.map((m) => ({ label: fmtMonthShort(m.mes), value: m.usd }))} color={SECOND} /></Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card><CardTitle>Por cliente</CardTitle><DataTable columns={clienteCols} rows={s.porCliente} maxRows={12} emptyMessage="Sin presupuesto cargado" /></Card>
        <Card><CardTitle>Por tipo de medio</CardTitle><DataTable columns={medioCols} rows={s.porMedio} emptyMessage="Sin presupuesto cargado" /></Card>
      </div>
    </Section>
  );
}

// ── SECCIÓN 7 — Actividad en el tiempo ─────────────────────────────
function ActividadSection({ data }: { data: ReportData }) {
  const s = data.actividad;
  return (
    <Section title="Actividad en el tiempo" description="Tendencias de los últimos 12 meses en el mismo eje temporal.">
      <div className="grid grid-cols-1 gap-4">
        <Card><CardTitle>Registros nuevos por mes</CardTitle><BarChart data={s.registrosPorMes.map((m) => ({ label: fmtMonthShort(m.label), value: m.value }))} /></Card>
        <Card><CardTitle>Castings abiertos por mes (locutores / cantantes)</CardTitle><StackedBarChart data={s.castingsPorMes.map((m) => ({ label: fmtMonthShort(m.mes), a: m.locutores, b: m.cantantes }))} labelA="Locutores" labelB="Cantantes" /></Card>
        <Card><CardTitle>Postulaciones por mes</CardTitle><LineChart data={s.postulacionesPorMes.map((m) => ({ label: fmtMonthShort(m.label), value: m.value }))} color={SECOND} /></Card>
      </div>
    </Section>
  );
}
