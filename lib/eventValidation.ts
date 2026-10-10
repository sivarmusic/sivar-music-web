// Validación de campos de eventos (admin y artistas). Solo valida las claves
// presentes en el body y devuelve un objeto limpio con las claves permitidas.

import { toEventIso } from './eventDate'

type Rule = (v: unknown) => { ok: true; value: unknown } | { ok: false; error: string }

const text = (label: string, max: number, required = false): Rule => v => {
  if (v === null || v === undefined || v === '') {
    return required ? { ok: false, error: `${label} es obligatorio` } : { ok: true, value: null }
  }
  if (typeof v !== 'string') return { ok: false, error: `${label} no es válido` }
  const t = v.trim()
  if (required && !t) return { ok: false, error: `${label} es obligatorio` }
  if (t.length > max) return { ok: false, error: `${label} es demasiado largo (máx. ${max})` }
  return { ok: true, value: t }
}

const num = (label: string, min: number, max: number, integer = false): Rule => v => {
  if (v === null || v === undefined || v === '') return { ok: true, value: null }
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) {
    return { ok: false, error: `${label} no es válido` }
  }
  return { ok: true, value: n }
}

/**
 * Cantidad de entradas: entero 1..20. Ausente/null => 1 (default documentado).
 * Devuelve null si es inválida (decimal, texto, NaN, fuera de rango).
 */
export function parseCantidad(v: unknown): number | null {
  if (v === undefined || v === null || v === '') return 1
  const n = typeof v === 'number' ? v : typeof v === 'string' && /^\d+$/.test(v.trim()) ? Number(v) : NaN
  if (!Number.isInteger(n) || n < 1 || n > 20) return null
  return n
}

export function isHttpUrl(v: string): boolean {
  try {
    const u = new URL(v)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch { return false }
}

const url = (label: string, allowRelative = false): Rule => v => {
  const t = text(label, 500)(v)
  if (!t.ok || t.value === null) return t
  const s = t.value as string
  if (isHttpUrl(s) || (allowRelative && s.startsWith('/') && !s.startsWith('//'))) return { ok: true, value: s }
  return { ok: false, error: `${label} debe ser una URL http(s) válida` }
}

// Hosts desde los que next/image puede cargar la portada (debe coincidir con
// images.remotePatterns de next.config.ts). Una URL de otro host rompe el render
// de /eventos para todos, así que se rechaza al guardar.
const PROJECT_IMAGE_HOST = 'mthpqfiozddtohkcrbui.supabase.co'
function allowedImageHosts(): string[] {
  const hosts = [PROJECT_IMAGE_HOST]
  try {
    const env = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (env) hosts.push(new URL(env).host)
  } catch { /* env inválida: solo el host fijo */ }
  return hosts
}

export function isAllowedImageUrl(v: string): boolean {
  if (v.startsWith('/') && !v.startsWith('//') && !v.includes('\\')) return true
  try {
    const u = new URL(v)
    return u.protocol === 'https:' && allowedImageHosts().includes(u.host)
      && u.pathname.startsWith('/storage/v1/object/public/')
  } catch { return false }
}

const imageUrl = (label: string): Rule => v => {
  const r = url(label, true)(v)
  if (!r.ok || r.value === null) return r
  if (!isAllowedImageUrl(r.value as string)) {
    return { ok: false, error: `${label} debe estar subida a Sivar Music (usá "Subir imagen")` }
  }
  return r
}

const RULES: Record<string, Rule> = {
  nombre: text('El nombre', 120, true),
  descripcion: text('La descripción', 2000),
  fecha: v => {
    if (typeof v !== 'string' || !v.trim()) return { ok: false, error: 'La fecha no es válida' }
    // Sin zona explícita se interpreta como hora de El Salvador (lib/eventDate.ts).
    const iso = toEventIso(v)
    if (Number.isNaN(Date.parse(iso))) return { ok: false, error: 'La fecha no es válida' }
    return { ok: true, value: iso }
  },
  venue: text('El lugar', 120, true),
  direccion: text('La dirección', 200),
  lat: num('La latitud', -90, 90),
  lng: num('La longitud', -180, 180),
  imagen_url: imageUrl('La imagen'),
  precio: num('El precio', 0, 10000),
  max_entradas: num('El máximo de entradas', 0, 1_000_000, true),
  link_externo: url('El link externo'),
  slug: v => {
    const s = typeof v === 'string' ? v.trim().toLowerCase().replace(/\s+/g, '-') : ''
    return /^[a-z0-9][a-z0-9-]{0,79}$/.test(s) ? { ok: true, value: s } : { ok: false, error: 'El slug no es válido' }
  },
  artistas: v => {
    if (v === null || v === undefined) return { ok: true, value: [] }
    if (!Array.isArray(v) || v.length > 30 || v.some(a => typeof a !== 'string' || a.length > 80)) {
      return { ok: false, error: 'La lista de artistas no es válida' }
    }
    return { ok: true, value: v.map(a => (a as string).trim()).filter(Boolean) }
  },
  visible: v => (typeof v === 'boolean' ? { ok: true, value: v } : { ok: false, error: 'El campo visible no es válido' }),
}

export type ValidationResult =
  | { ok: true; values: Record<string, unknown> }
  | { ok: false; error: string }

/** Valida solo las claves de `allowed` que vengan en `body`; ignora el resto. */
export function validateEventFields(body: Record<string, unknown>, allowed: readonly string[]): ValidationResult {
  const values: Record<string, unknown> = {}
  for (const key of allowed) {
    if (!(key in body)) continue
    const rule = RULES[key]
    if (!rule) continue
    const r = rule(body[key])
    if (!r.ok) return { ok: false, error: r.error }
    values[key] = r.value
  }
  return { ok: true, values }
}
