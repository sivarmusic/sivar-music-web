import { EVENT_TZ } from '@/lib/eventDate'

/** Fecha en hora de El Salvador (los eventos se publican en esa zona). */
export function fmtDate(iso: string | Date, locale: string, opts: Intl.DateTimeFormatOptions): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return d.toLocaleDateString(locale, { timeZone: EVENT_TZ, ...opts }).replace(/\.$/, '')
}

export function fmtTime(iso: string | Date, locale: string): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return d.toLocaleTimeString(locale, { timeZone: EVENT_TZ, hour: '2-digit', minute: '2-digit' })
}

/** Separa `text` en torno a `{key}` para poder resaltar el valor (p. ej. con <strong>). */
export function splitOn(text: string, key: string): [string, string] | null {
  const token = `{${key}}`
  const i = text.indexOf(token)
  return i === -1 ? null : [text.slice(0, i), text.slice(i + token.length)]
}
