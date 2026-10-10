import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { enforceRateLimit } from '@/lib/rate-limit'
import { ACCESS_COOKIE, REFRESH_COOKIE, accessCookieOptions, refreshCookieOptions } from '@/lib/staff-auth'

export async function POST(req: NextRequest) {
  const limited = await enforceRateLimit(req, 'staff-login', { limit: 40, windowSeconds: 15 * 60 })
  if (limited) return limited

  const body = await req.json().catch(() => null)
  const rawEmail = typeof body?.email === 'string' ? body.email.trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!rawEmail || !password || rawEmail.length > 254) {
    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 400 })
  }

  // Cuentas de staff pueden loguearse con un usuario simple en vez de un correo —
  // internamente se mapea a un correo interno de Sivar Music.
  const loginEmail = rawEmail.includes('@') ? rawEmail : `${rawEmail}@sivarmusic.com`

  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )

  const { data, error } = await client.auth.signInWithPassword({ email: loginEmail, password })

  if (error || !data.session) {
    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
  }

  const role = data.user?.app_metadata?.role
  if (role !== 'admin' && role !== 'verificador') {
    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(ACCESS_COOKIE, data.session.access_token, accessCookieOptions())
  // El refresh token permite renovar el acceso sin pedir contraseña durante el turno.
  res.cookies.set(REFRESH_COOKIE, data.session.refresh_token, refreshCookieOptions())

  return res
}
