// Builder del reporte de analytics. SERVER-ONLY (usa supabase).
//
// Estrategia: el dataset de la plataforma (catálogo de voces) es modesto,
// así que cargamos las tablas completas y filtramos/agrupamos en JS. Esto
// simplifica muchísimo los "joins" (postulaciones ↔ casting, tiempos, etc.).
// Si el volumen creciera, habría que empujar los filtros de fecha a SQL y/o
// paginar server-side (ver TODO al final).
//
// Ported from voces-bds's lib/reportes/aggregate.ts:
//  - supabaseAdmin -> supabase (this repo's single shared client, per
//    lib/voces-castings.ts's comment on the same swap).
//  - Table renames (all confirmed against scripts/voces-schema.sql and the
//    already-ported lib/voces-castings*.ts, same column names throughout):
//      talents -> voces_talents, cantantes -> voces_cantantes,
//      castings -> voces_castings, castings_cantantes -> voces_castings_cantantes,
//      casting_applications -> voces_casting_applications,
//      casting_cantante_applications -> voces_casting_cantante_applications.

import { supabase } from "@/lib/supabase";
import type {
  ReportData, RegistroRow, CastingRow, PostulacionRow, Punto,
} from "./types";

// ── Helpers ──────────────────────────────────────────────────────

const LIMIT = 10000; // techo defensivo; Supabase devuelve máx 1000 por defecto

// Carga resiliente: si una tabla no existe o falla, devolvemos [] y seguimos
// (el reporte degrada esa sección a "vacío" en vez de romperse por completo).
async function safeSelect(table: string): Promise<any[]> {
  const { data, error } = await supabase.from(table).select("*").limit(LIMIT);
  if (error) {
    console.warn(`[reportes] tabla '${table}' no disponible: ${error.message}`);
    return [];
  }
  return data ?? [];
}

function pct(part: number, whole: number): number {
  if (!whole) return 0;
  return Math.round((part / whole) * 1000) / 10; // 1 decimal
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function monthKey(iso: string): string {
  return iso.slice(0, 7); // YYYY-MM
}

function lastNMonths(endISO: string, n: number): string[] {
  const end = new Date(endISO);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - i, 1));
    out.push(d.toISOString().slice(0, 7));
  }
  return out;
}

// Semana ISO simplificada: agrupa por lunes de cada semana (label YYYY-MM-DD)
function weekKey(iso: string): string {
  const d = new Date(iso);
  const day = (d.getUTCDay() + 6) % 7; // 0 = lunes
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day));
  return monday.toISOString().slice(0, 10);
}

function topEntries(map: Map<string, number>, n: number): { key: string; value: number }[] {
  return [...map.entries()]
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, n);
}

function inc(map: Map<string, number>, key: string, by = 1) {
  map.set(key, (map.get(key) || 0) + by);
}

const norm = (s?: string | null) => (s || "").trim();
const lower = (s?: string | null) => norm(s).toLowerCase();

// ── Builder principal ────────────────────────────────────────────

export async function buildReport(desdeISO: string, hastaISO: string): Promise<ReportData> {
  const generadoEn = new Date().toISOString();
  const desde = new Date(desdeISO).getTime();
  const hasta = new Date(hastaISO).getTime();
  const inRange = (iso?: string | null) => {
    if (!iso) return false;
    const t = new Date(iso).getTime();
    return t >= desde && t <= hasta;
  };

  // Carga en paralelo de todas las tablas involucradas.
  // NOTA: los "registros de locutores" viven en la tabla `voces_talents` (el
  // formulario de alta escribe ahí; ver app/api/voces/registro/route.ts). Los
  // cantantes en `voces_cantantes`.
  const [regsAll, cantAll, casLocAll, casCanAll, appsLocAll, appsCanAll] = await Promise.all([
    safeSelect("voces_talents"),
    safeSelect("voces_cantantes"),
    safeSelect("voces_castings"),
    safeSelect("voces_castings_cantantes"),
    safeSelect("voces_casting_applications"),
    safeSelect("voces_casting_cantante_applications"),
  ]);

  // ── Normalización a filas unificadas ───────────────────────────

  // Registros (locutores desde `voces_talents` + cantantes desde `voces_cantantes`)
  const registrosAll: (RegistroRow & { isSinger: boolean; completo: boolean })[] = [
    ...regsAll.map((r: any) => {
      const estilos: string[] = Array.isArray(r.styles) ? r.styles : [];
      // Perfil "completo": género, país y al menos un estilo (los demos viven en
      // voces_talent_media, tabla aparte; no la traemos para no encarecer el reporte).
      const completo = !!(r.gender && r.country && estilos.length);
      return {
        tipo: "Locutor" as const,
        nombre: norm(r.full_name),
        email: lower(r.email),
        pais: norm(r.country),
        genero: norm(r.gender),
        estilos: estilos.join(", "),
        createdAt: r.created_at,
        isSinger: !!r.is_singer,
        completo,
      };
    }),
    ...cantAll.map((c: any) => {
      const estilos: string[] = Array.isArray(c.styles) ? c.styles : [];
      return {
        tipo: "Cantante" as const,
        nombre: norm(c.full_name),
        email: lower(c.email),
        pais: norm(c.country),
        genero: "",
        estilos: estilos.join(", "),
        createdAt: c.created_at,
        isSinger: true,
        completo: !!(c.country && estilos.length),
      };
    }),
  ];
  const registrosPeriodo = registrosAll.filter((r) => inRange(r.createdAt));

  // Mapa casting → info (ambos tipos)
  type Cas = {
    id: string; tipo: "Locutor" | "Cantante"; titulo: string; cliente: string;
    estado: string; medio: string; presupuesto: number | null; moneda: string;
    createdAt: string; deadline: string;
  };
  const castingMap = new Map<string, Cas>();
  const casToRow = (c: any, tipo: "Locutor" | "Cantante"): Cas => ({
    id: c.id,
    tipo,
    titulo: norm(c.title) || "(sin título)",
    cliente: norm(c.client),
    estado: norm(c.status) || "open",
    medio: norm(c.media_type),
    presupuesto: c.budget != null ? Number(c.budget) : null,
    moneda: norm(c.currency),
    createdAt: c.created_at,
    deadline: c.deadline || "",
  });
  casLocAll.forEach((c: any) => castingMap.set(c.id, casToRow(c, "Locutor")));
  casCanAll.forEach((c: any) => castingMap.set(c.id, casToRow(c, "Cantante")));

  // Postulaciones unificadas
  const postToRow = (a: any, tipo: "Locutor" | "Cantante"): PostulacionRow & { castingId: string; selectedAt: string | null } => {
    const cas = castingMap.get(a.casting_id);
    return {
      tipo,
      casting: cas?.titulo || "(casting eliminado)",
      castingId: a.casting_id,
      nombre: `${norm(a.first_name)} ${norm(a.last_name)}`.trim(),
      email: lower(a.email),
      pais: norm(a.country),
      seleccionado: !!a.selected,
      createdAt: a.created_at,
      selectedAt: a.selected_at || null,
      seleccionadoEn: a.selected_at || "",
    };
  };
  const postAll = [
    ...appsLocAll.map((a: any) => postToRow(a, "Locutor")),
    ...appsCanAll.map((a: any) => postToRow(a, "Cantante")),
  ];
  const postPeriodo = postAll.filter((p) => inRange(p.createdAt));

  // Castings del período
  const casLocPeriodo = casLocAll.filter((c: any) => inRange(c.created_at)).map((c: any) => castingMap.get(c.id)!);
  const casCanPeriodo = casCanAll.filter((c: any) => inRange(c.created_at)).map((c: any) => castingMap.get(c.id)!);
  const casPeriodo = [...casLocPeriodo, ...casCanPeriodo];

  // Postulaciones por casting (del período)
  const appsByCasting = new Map<string, PostulacionRow[]>();
  for (const p of postPeriodo) {
    const arr = appsByCasting.get(p.castingId) || [];
    arr.push(p);
    appsByCasting.set(p.castingId, arr);
  }

  // ── SECCIÓN 1 — Resumen ────────────────────────────────────────
  const seleccionadosPeriodo = postPeriodo.filter((p) => p.seleccionado);
  const sumBudget = (list: Cas[], moneda: string) =>
    list.filter((c) => c.moneda === moneda && c.presupuesto != null).reduce((s, c) => s + (c.presupuesto || 0), 0);

  const resumen = {
    registrosPeriodo: registrosPeriodo.length,
    registrosAcumulados: registrosAll.length,
    castingsPeriodo: casPeriodo.length,
    castingsLocutores: casLocPeriodo.length,
    castingsCantantes: casCanPeriodo.length,
    postulaciones: postPeriodo.length,
    presupuestoARS: sumBudget(casPeriodo, "ARS"),
    presupuestoUSD: sumBudget(casPeriodo, "USD"),
    seleccionados: seleccionadosPeriodo.length,
    tasaConversion: pct(seleccionadosPeriodo.length, postPeriodo.length),
  };

  // ── SECCIÓN 2 — Registros ──────────────────────────────────────
  const porSemanaMap = new Map<string, number>();
  registrosPeriodo.forEach((r) => inc(porSemanaMap, weekKey(r.createdAt)));
  const porSemana: Punto[] = [...porSemanaMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([label, value]) => ({ label, value }));

  const generoMap = new Map<string, number>();
  registrosPeriodo.forEach((r) => { if (r.genero) inc(generoMap, r.genero); });
  const porGenero: Punto[] = [...generoMap.entries()].map(([label, value]) => ({ label, value }));

  const paisMap = new Map<string, number>();
  registrosPeriodo.forEach((r) => { if (r.pais) inc(paisMap, r.pais); });
  const porPais = topEntries(paisMap, 50).map((e) => ({ pais: e.key, cantidad: e.value }));

  const locutorRegs = registrosPeriodo.filter((r) => r.tipo === "Locutor");
  const tasaPerfilCompleto = pct(locutorRegs.filter((r) => r.completo).length, locutorRegs.length);

  // Activos/inactivos: registrados que postularon en los últimos 90 días (match por email = aproximado)
  const noventaDias = new Date(new Date(generadoEn).getTime() - 90 * 24 * 3600 * 1000).getTime();
  const emailsRecientes = new Set(
    postAll.filter((p) => new Date(p.createdAt).getTime() >= noventaDias && p.email).map((p) => p.email)
  );
  const activos = registrosAll.filter((r) => r.email && emailsRecientes.has(r.email)).length;

  const registros = {
    porSemana,
    porGenero,
    porPais,
    tasaPerfilCompleto,
    activos,
    inactivos: registrosAll.length - activos,
    aproximado: true,
  };

  // ── SECCIÓN 3 — Castings ───────────────────────────────────────
  const appsCountFor = (cas: Cas) => (appsByCasting.get(cas.id) || []).length;

  const buildTipo = (list: Cas[], tipo: "Locutor" | "Cantante") => ({
    tipo,
    cantidad: list.length,
    postulaciones: list.reduce((s, c) => s + appsCountFor(c), 0),
    presupuestoARS: sumBudget(list, "ARS"),
    presupuestoUSD: sumBudget(list, "USD"),
  });
  const porTipo = [buildTipo(casLocPeriodo, "Locutor"), buildTipo(casCanPeriodo, "Cantante")];

  const ESTADOS = ["open", "in_selection", "closed", "finished"];
  const porEstado = ESTADOS.map((estado) => ({
    estado,
    locutores: casLocPeriodo.filter((c) => c.estado === estado).length,
    cantantes: casCanPeriodo.filter((c) => c.estado === estado).length,
  }));

  const clienteMap = new Map<string, { cantidad: number; ars: number; usd: number }>();
  casPeriodo.forEach((c) => {
    const key = c.cliente || "(sin cliente)";
    const cur = clienteMap.get(key) || { cantidad: 0, ars: 0, usd: 0 };
    cur.cantidad += 1;
    if (c.presupuesto != null && c.moneda === "ARS") cur.ars += c.presupuesto;
    if (c.presupuesto != null && c.moneda === "USD") cur.usd += c.presupuesto;
    clienteMap.set(key, cur);
  });
  const porCliente = [...clienteMap.entries()]
    .map(([cliente, v]) => ({ cliente, cantidad: v.cantidad, presupuestoARS: v.ars, presupuestoUSD: v.usd }))
    .sort((a, b) => b.cantidad - a.cantidad);

  const medioMap = new Map<string, number>();
  casPeriodo.forEach((c) => inc(medioMap, c.medio || "(sin medio)"));
  const porMedio: Punto[] = [...medioMap.entries()].map(([label, value]) => ({ label, value }));

  // Tiempo de apertura: días entre created_at y deadline
  const aperturas = casPeriodo
    .filter((c) => c.deadline)
    .map((c) => (new Date(c.deadline).getTime() - new Date(c.createdAt).getTime()) / (24 * 3600 * 1000))
    .filter((d) => Number.isFinite(d) && d >= 0);
  const tiempoAperturaPromDias = aperturas.length ? round1(aperturas.reduce((s, d) => s + d, 0) / aperturas.length) : null;

  const topPostulaciones = casPeriodo
    .map((c) => ({ titulo: c.titulo, tipo: c.tipo, postulaciones: appsCountFor(c) }))
    .sort((a, b) => b.postulaciones - a.postulaciones)
    .slice(0, 5);

  // Distribución de presupuesto (ARS)
  const rangos = [
    { rango: "0–500K", test: (n: number) => n < 500_000 },
    { rango: "500K–1M", test: (n: number) => n >= 500_000 && n < 1_000_000 },
    { rango: "1M–2M", test: (n: number) => n >= 1_000_000 && n < 2_000_000 },
    { rango: "+2M", test: (n: number) => n >= 2_000_000 },
  ];
  const arsCastings = casPeriodo.filter((c) => c.moneda === "ARS" && c.presupuesto != null);
  const distribucionPresupuesto = rangos.map((r) => ({
    rango: r.rango,
    cantidad: arsCastings.filter((c) => r.test(c.presupuesto as number)).length,
  }));

  const castings = {
    porTipo, porEstado, porCliente, porMedio,
    tiempoAperturaPromDias, topPostulaciones, distribucionPresupuesto,
  };

  // ── SECCIÓN 4 — Postulaciones ──────────────────────────────────
  const countsPorCasting = casPeriodo.map((c) => appsCountFor(c));
  const conApps = countsPorCasting.filter((n) => n > 0);
  const porCasting = {
    promedio: conApps.length ? round1(conApps.reduce((s, n) => s + n, 0) / conApps.length) : 0,
    max: conApps.length ? Math.max(...conApps) : 0,
    min: conApps.length ? Math.min(...conApps) : 0,
  };

  // Tiempo de respuesta: apertura del casting (created_at) → postulación (created_at)
  const respuestasHoras = postPeriodo
    .map((p) => {
      const cas = castingMap.get(p.castingId);
      if (!cas) return null;
      const h = (new Date(p.createdAt).getTime() - new Date(cas.createdAt).getTime()) / (3600 * 1000);
      return Number.isFinite(h) && h >= 0 ? h : null;
    })
    .filter((h): h is number => h != null);
  const tiempoRespuesta = respuestasHoras.length
    ? { horas: round1(respuestasHoras.reduce((s, h) => s + h, 0) / respuestasHoras.length),
        dias: round1((respuestasHoras.reduce((s, h) => s + h, 0) / respuestasHoras.length) / 24) }
    : null;

  const bucketsResp = [
    { label: "< 24h", test: (h: number) => h < 24 },
    { label: "24–48h", test: (h: number) => h >= 24 && h < 48 },
    { label: "48–72h", test: (h: number) => h >= 48 && h < 72 },
    { label: "> 72h", test: (h: number) => h >= 72 },
  ];
  const distribucionRespuesta: Punto[] = bucketsResp.map((b) => ({
    label: b.label,
    value: respuestasHoras.filter(b.test).length,
  }));

  // Top activos y recurrencia (por email, aproximado)
  const activosMap = new Map<string, number>();
  const nombrePorEmail = new Map<string, string>();
  const castingsPorEmail = new Map<string, Set<string>>();
  postPeriodo.forEach((p) => {
    if (!p.email) return;
    inc(activosMap, p.email);
    if (!nombrePorEmail.has(p.email)) nombrePorEmail.set(p.email, p.nombre);
    const set = castingsPorEmail.get(p.email) || new Set<string>();
    set.add(p.castingId);
    castingsPorEmail.set(p.email, set);
  });
  const topActivos = topEntries(activosMap, 10).map((e) => ({
    nombre: nombrePorEmail.get(e.key) || "—",
    email: e.key,
    cantidad: e.value,
  }));
  const recurrentes = [...castingsPorEmail.values()].filter((s) => s.size > 1).length;

  // Nunca postularon: registrados sin ninguna postulación histórica (match por email)
  const emailsQuePostularon = new Set(postAll.filter((p) => p.email).map((p) => p.email));
  const nuncaCount = registrosAll.filter((r) => r.email && !emailsQuePostularon.has(r.email)).length;
  const nuncaPostularon = { cantidad: nuncaCount, porcentaje: pct(nuncaCount, registrosAll.length) };

  const postulaciones = {
    porCasting, tiempoRespuesta, distribucionRespuesta,
    topActivos, nuncaPostularon, recurrentes, aproximado: true,
  };

  // ── SECCIÓN 5 — Efectividad ────────────────────────────────────
  const efPorCasting = casPeriodo
    .map((c) => {
      const apps = appsByCasting.get(c.id) || [];
      const sel = apps.filter((a) => a.seleccionado).length;
      return { titulo: c.titulo, tipo: c.tipo, postulantes: apps.length, seleccionados: sel, tasa: pct(sel, apps.length), resuelto: sel > 0 };
    })
    .filter((r) => r.postulantes > 0)
    .sort((a, b) => b.tasa - a.tasa);

  // Efectividad = % de castings (con postulantes) que terminaron con AL MENOS
  // una voz elegida. NO es el promedio de seleccionados/postulantes: un casting
  // que de 20 elige 1 cumplió su objetivo (100% efectivo), no 5%. Elegir pocos
  // de muchos es justamente el fin del casting.
  const tasaEfectividad = (list: typeof efPorCasting) =>
    list.length ? round1((list.filter((r) => r.seleccionados > 0).length / list.length) * 100) : 0;
  const tasaGlobal = tasaEfectividad(efPorCasting);
  const tasaLocutores = tasaEfectividad(efPorCasting.filter((r) => r.tipo === "Locutor"));
  const tasaCantantes = tasaEfectividad(efPorCasting.filter((r) => r.tipo === "Cantante"));

  // Tiempo hasta la selección: días entre cierre (deadline) y selected_at
  const seleccTiempos = seleccionadosPeriodo
    .map((p) => {
      const cas = castingMap.get(p.castingId);
      if (!cas || !cas.deadline || !p.seleccionadoEn) return null;
      const d = (new Date(p.seleccionadoEn).getTime() - new Date(cas.deadline).getTime()) / (24 * 3600 * 1000);
      return Number.isFinite(d) ? d : null;
    })
    .filter((d): d is number => d != null);
  const tiempoHastaSeleccionDias = seleccTiempos.length
    ? round1(seleccTiempos.reduce((s, d) => s + d, 0) / seleccTiempos.length) : null;

  // Castings finalizados sin ninguna selección
  const sinSeleccion = casPeriodo.filter((c) => {
    const apps = appsByCasting.get(c.id) || [];
    return c.estado === "finished" && !apps.some((a) => a.seleccionado);
  }).length;

  // Perfil de los seleccionados: país más frecuente (los apps no traen género salvo cantantes)
  const selPaisMap = new Map<string, number>();
  const selGenMap = new Map<string, number>();
  seleccionadosPeriodo.forEach((p) => {
    if (p.pais) inc(selPaisMap, p.pais);
    const reg = registrosAll.find((r) => r.email && r.email === p.email);
    if (reg?.genero) inc(selGenMap, reg.genero);
  });
  const perfilSeleccionados = {
    generoTop: topEntries(selGenMap, 1)[0]?.key || "—",
    paisTop: topEntries(selPaisMap, 1)[0]?.key || "—",
  };

  const efectividad = {
    porCasting: efPorCasting, tasaGlobal, tasaLocutores, tasaCantantes,
    tiempoHastaSeleccionDias, sinSeleccion, perfilSeleccionados,
  };

  // ── SECCIÓN 6 — Presupuesto ────────────────────────────────────
  const totalARS = resumen.presupuestoARS;
  const totalUSD = resumen.presupuestoUSD;
  const arsCount = casPeriodo.filter((c) => c.moneda === "ARS" && c.presupuesto != null).length;
  const usdCount = casPeriodo.filter((c) => c.moneda === "USD" && c.presupuesto != null).length;

  const presuPorTipo = [
    { tipo: "Locutor" as const, ars: sumBudget(casLocPeriodo, "ARS"), usd: sumBudget(casLocPeriodo, "USD") },
    { tipo: "Cantante" as const, ars: sumBudget(casCanPeriodo, "ARS"), usd: sumBudget(casCanPeriodo, "USD") },
  ];
  const presuPorCliente = porCliente
    .map((c) => ({ cliente: c.cliente, ars: c.presupuestoARS, usd: c.presupuestoUSD }))
    .filter((c) => c.ars || c.usd)
    .sort((a, b) => b.ars + b.usd - (a.ars + a.usd));

  // Evolución mensual (últimos 12 meses, TODO el histórico para dar contexto)
  const meses = lastNMonths(generadoEn, 12);
  const evolMap = new Map<string, { ars: number; usd: number }>();
  meses.forEach((m) => evolMap.set(m, { ars: 0, usd: 0 }));
  [...castingMap.values()].forEach((c) => {
    if (c.presupuesto == null) return;
    const m = monthKey(c.createdAt);
    const bucket = evolMap.get(m);
    if (!bucket) return;
    if (c.moneda === "ARS") bucket.ars += c.presupuesto;
    if (c.moneda === "USD") bucket.usd += c.presupuesto;
  });
  const evolucionMensual = meses.map((mes) => ({ mes, ars: evolMap.get(mes)!.ars, usd: evolMap.get(mes)!.usd }));

  const presuMedioMap = new Map<string, { ars: number; usd: number }>();
  casPeriodo.forEach((c) => {
    if (c.presupuesto == null) return;
    const key = c.medio || "(sin medio)";
    const cur = presuMedioMap.get(key) || { ars: 0, usd: 0 };
    if (c.moneda === "ARS") cur.ars += c.presupuesto;
    if (c.moneda === "USD") cur.usd += c.presupuesto;
    presuMedioMap.set(key, cur);
  });
  const presuPorMedio = [...presuMedioMap.entries()]
    .map(([medio, v]) => ({ medio, ars: v.ars, usd: v.usd }))
    .sort((a, b) => b.ars + b.usd - (a.ars + a.usd));

  const presupuesto = {
    totalARS, totalUSD,
    promedioARS: arsCount ? Math.round(totalARS / arsCount) : 0,
    promedioUSD: usdCount ? Math.round(totalUSD / usdCount) : 0,
    porTipo: presuPorTipo,
    porCliente: presuPorCliente,
    evolucionMensual,
    porMedio: presuPorMedio,
  };

  // ── SECCIÓN 7 — Actividad en el tiempo ─────────────────────────
  const regMesMap = new Map<string, number>();
  meses.forEach((m) => regMesMap.set(m, 0));
  registrosAll.forEach((r) => { const m = monthKey(r.createdAt); if (regMesMap.has(m)) inc(regMesMap, m); });
  const registrosPorMes: Punto[] = meses.map((mes) => ({ label: mes, value: regMesMap.get(mes)! }));

  const casMesMap = new Map<string, { locutores: number; cantantes: number }>();
  meses.forEach((m) => casMesMap.set(m, { locutores: 0, cantantes: 0 }));
  [...castingMap.values()].forEach((c) => {
    const m = monthKey(c.createdAt);
    const bucket = casMesMap.get(m);
    if (!bucket) return;
    if (c.tipo === "Locutor") bucket.locutores += 1; else bucket.cantantes += 1;
  });
  const castingsPorMes = meses.map((mes) => ({ mes, ...casMesMap.get(mes)! }));

  const postMesMap = new Map<string, number>();
  meses.forEach((m) => postMesMap.set(m, 0));
  postAll.forEach((p) => { const m = monthKey(p.createdAt); if (postMesMap.has(m)) inc(postMesMap, m); });
  const postulacionesPorMes: Punto[] = meses.map((mes) => ({ label: mes, value: postMesMap.get(mes)! }));

  const actividad = { registrosPorMes, castingsPorMes, postulacionesPorMes };

  // ── Datos crudos para Excel ────────────────────────────────────
  const rawRegistros: RegistroRow[] = registrosPeriodo.map((r) => ({
    tipo: r.tipo, nombre: r.nombre, email: r.email, pais: r.pais,
    genero: r.genero, estilos: r.estilos, createdAt: r.createdAt,
  }));
  const rawCastings: CastingRow[] = casPeriodo.map((c) => {
    const apps = appsByCasting.get(c.id) || [];
    return {
      tipo: c.tipo, titulo: c.titulo, cliente: c.cliente, estado: c.estado,
      medio: c.medio, presupuesto: c.presupuesto, moneda: c.moneda,
      postulaciones: apps.length, seleccionados: apps.filter((a) => a.seleccionado).length,
      createdAt: c.createdAt, deadline: c.deadline,
    };
  });
  const rawPost: PostulacionRow[] = postPeriodo.map((p) => ({
    tipo: p.tipo, casting: p.casting, nombre: p.nombre, email: p.email,
    pais: p.pais, seleccionado: p.seleccionado, createdAt: p.createdAt, seleccionadoEn: p.seleccionadoEn,
  }));

  return {
    rango: { desde: desdeISO, hasta: hastaISO, generadoEn },
    resumen, registros, castings, postulaciones, efectividad, presupuesto, actividad,
    raw: {
      registros: rawRegistros,
      castings: rawCastings,
      postulaciones: rawPost,
      seleccionados: rawPost.filter((p) => p.seleccionado),
    },
  };
}

// TODO(escala): si las tablas superan ~10k filas, mover los filtros de fecha a
// SQL (.gte/.lt sobre created_at) y paginar, o crear funciones de agregación en
// Postgres (scripts/*.sql) y llamarlas por RPC en vez de traer filas completas.
