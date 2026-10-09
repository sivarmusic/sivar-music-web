import { NextResponse } from 'next/server'

type DbError = { message?: string; code?: string } | null | undefined

/**
 * Respuesta de error para fallos internos (Supabase, storage, etc.): el detalle
 * va al log del servidor y el cliente recibe un mensaje genérico en español.
 */
export function serverError(tag: string, error: DbError, ctx?: Record<string, unknown>) {
  console.error(`[${tag}] error interno`, { code: error?.code, message: error?.message, ...ctx })
  if (error?.code === '23505') {
    return NextResponse.json({ error: 'Ya existe un registro con esos datos' }, { status: 409 })
  }
  return NextResponse.json({ error: 'Ocurrió un error. Intentá de nuevo en unos minutos.' }, { status: 500 })
}
