// Tipos del módulo de reportes.
// IMPORTANTE: este archivo NO debe importar código server-only (supabase, etc.)
// porque lo consumen tanto el server (aggregate) como el cliente (página + Excel).
//
// Ported verbatim from voces-bds's lib/reportes/types.ts — no BDS-specific
// content here.

export type ReporteRango = {
  desde: string;        // ISO
  hasta: string;        // ISO
  generadoEn: string;   // ISO
};

// Punto genérico de una serie temporal / categórica
export type Punto = { label: string; value: number };

// Fila unificada de registro (locutor o cantante) para tablas y Excel
export type RegistroRow = {
  tipo: "Locutor" | "Cantante";
  nombre: string;
  email: string;
  pais: string;
  genero: string;
  estilos: string;
  createdAt: string;
};

// Fila unificada de casting para tablas y Excel
export type CastingRow = {
  tipo: "Locutor" | "Cantante";
  titulo: string;
  cliente: string;
  estado: string;
  medio: string;
  presupuesto: number | null;
  moneda: string;
  postulaciones: number;
  seleccionados: number;
  createdAt: string;
  deadline: string;
};

// Fila unificada de postulación para tablas y Excel
export type PostulacionRow = {
  tipo: "Locutor" | "Cantante";
  casting: string;
  nombre: string;
  email: string;
  pais: string;
  seleccionado: boolean;
  createdAt: string;
  seleccionadoEn: string;
};

export type ResumenKPIs = {
  registrosPeriodo: number;
  registrosAcumulados: number;
  castingsPeriodo: number;
  castingsLocutores: number;
  castingsCantantes: number;
  postulaciones: number;
  presupuestoARS: number;
  presupuestoUSD: number;
  seleccionados: number;
  tasaConversion: number; // %
};

export type SeccionRegistros = {
  porSemana: Punto[];
  porGenero: Punto[];
  porPais: { pais: string; cantidad: number }[];
  tasaPerfilCompleto: number; // %
  activos: number;
  inactivos: number;
  aproximado: boolean; // activos/inactivos es aproximado (match por email)
};

export type SeccionCastings = {
  porTipo: {
    tipo: "Locutor" | "Cantante";
    cantidad: number;
    postulaciones: number;
    presupuestoARS: number;
    presupuestoUSD: number;
  }[];
  porEstado: { estado: string; locutores: number; cantantes: number }[];
  porCliente: { cliente: string; cantidad: number; presupuestoARS: number; presupuestoUSD: number }[];
  porMedio: Punto[];
  tiempoAperturaPromDias: number | null;
  topPostulaciones: { titulo: string; tipo: string; postulaciones: number }[];
  distribucionPresupuesto: { rango: string; cantidad: number }[];
};

export type SeccionPostulaciones = {
  porCasting: { promedio: number; max: number; min: number };
  tiempoRespuesta: { horas: number; dias: number } | null;
  distribucionRespuesta: Punto[]; // <24h, 24-48h, 48-72h, >72h
  topActivos: { nombre: string; email: string; cantidad: number }[];
  nuncaPostularon: { cantidad: number; porcentaje: number };
  recurrentes: number;
  aproximado: boolean;
};

export type SeccionEfectividad = {
  porCasting: { titulo: string; tipo: string; postulantes: number; seleccionados: number; tasa: number; resuelto: boolean }[];
  tasaGlobal: number;
  tasaLocutores: number;
  tasaCantantes: number;
  tiempoHastaSeleccionDias: number | null;
  sinSeleccion: number;
  perfilSeleccionados: { generoTop: string; paisTop: string };
};

export type SeccionPresupuesto = {
  totalARS: number;
  totalUSD: number;
  promedioARS: number;
  promedioUSD: number;
  porTipo: { tipo: "Locutor" | "Cantante"; ars: number; usd: number }[];
  porCliente: { cliente: string; ars: number; usd: number }[];
  evolucionMensual: { mes: string; ars: number; usd: number }[];
  porMedio: { medio: string; ars: number; usd: number }[];
};

export type SeccionActividad = {
  registrosPorMes: Punto[];
  castingsPorMes: { mes: string; locutores: number; cantantes: number }[];
  postulacionesPorMes: Punto[];
};

export type ReportData = {
  rango: ReporteRango;
  resumen: ResumenKPIs;
  registros: SeccionRegistros;
  castings: SeccionCastings;
  postulaciones: SeccionPostulaciones;
  efectividad: SeccionEfectividad;
  presupuesto: SeccionPresupuesto;
  actividad: SeccionActividad;
  // Datos crudos para exportar a Excel
  raw: {
    registros: RegistroRow[];
    castings: CastingRow[];
    postulaciones: PostulacionRow[];
    seleccionados: PostulacionRow[];
  };
};
