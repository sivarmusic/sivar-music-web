// Fechas de eventos: El Salvador es UTC-6 todo el año (sin horario de verano).
// Decisión: un datetime-local sin zona ("2026-12-01T20:00") se interpreta SIEMPRE
// como hora de El Salvador, no como la del servidor (UTC) ni la del navegador.
// No cambia el esquema: la columna sigue siendo timestamptz.

export const EVENT_TZ = 'America/El_Salvador'
const SV_OFFSET = '-06:00'

const HAS_ZONE = /(Z|[+-]\d{2}(:?\d{2})?)$/i

/** Normaliza un valor de fecha: sin zona explícita => hora de El Salvador. */
export function toEventIso(value: string): string {
  const v = value.trim()
  if (HAS_ZONE.test(v) && v.includes('T')) return v
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return `${v}T00:00:00${SV_OFFSET}`
  const withSeconds = /T\d{2}:\d{2}$/.test(v) ? `${v}:00` : v
  return `${withSeconds}${SV_OFFSET}`
}

/** ISO/timestamptz -> valor para <input type="datetime-local"> en hora de El Salvador. */
export function toEventDatetimeLocal(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: EVENT_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(d)
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
}

/** "sábado 10 de octubre, 19:00" (para correos). */
export function formatEventDateTime(iso: string, locale = 'es-SV'): string {
  return new Date(iso).toLocaleString(locale, {
    timeZone: EVENT_TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
