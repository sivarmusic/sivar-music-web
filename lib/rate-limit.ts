import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Límite de intentos con contador atómico en Postgres (función check_rate_limit,
// ver scripts/eventos-hardening-5.sql). Sin infraestructura externa.
//
// FALLA ABIERTA: si la función/tabla no existen o el rpc da error, se permite
// la petición (con console.warn) para no bloquear a compradores legítimos.

export type RateLimitOptions = { limit: number; windowSeconds: number }

export async function rateLimit(key: string, opts: RateLimitOptions): Promise<{ allowed: boolean }> {
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_key: key,
      p_limit: opts.limit,
      p_window_seconds: opts.windowSeconds,
    })
    if (error) {
      console.warn('[rate-limit] rpc con error, se permite la petición', { message: error.message })
      return { allowed: true }
    }
    return { allowed: data !== false }
  } catch (err) {
    console.warn('[rate-limit] excepción, se permite la petición', {
      message: err instanceof Error ? err.message : 'desconocido',
    })
    return { allowed: true }
  }
}

export function clientIp(req: { headers: Headers }): string {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ip = forwarded || req.headers.get('x-real-ip')?.trim() || 'unknown'
  return ip.toLowerCase().slice(0, 64)
}

/** Devuelve una respuesta 429 si se superó el límite; null si la petición puede seguir. */
export async function enforceRateLimit(
  req: { headers: Headers },
  route: string,
  opts: RateLimitOptions,
): Promise<NextResponse | null> {
  const { allowed } = await rateLimit(`${route}:${clientIp(req)}`, opts)
  if (allowed) return null
  return NextResponse.json(
    { error: 'Demasiados intentos. Esperá un momento e intentá de nuevo.' },
    { status: 429, headers: { 'Retry-After': String(opts.windowSeconds) } },
  )
}
