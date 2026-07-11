import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  // Cuentas de staff pueden loguearse con un usuario simple (ej. "sivarentradas1")
  // en vez de un correo — internamente se mapea a un correo interno de Sivar Music.
  const loginEmail = email?.includes('@') ? email.trim() : `${email?.trim()}@sivarmusic.com`

  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )

  const { data, error } = await client.auth.signInWithPassword({ email: loginEmail, password })

  if (error || !data.session) {
    return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })
  }

  const role = data.user?.app_metadata?.role
  if (role !== 'admin' && role !== 'verificador') {
    return NextResponse.json({ error: 'Esta cuenta no tiene acceso al panel' }, { status: 403 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set('pf_admin_token', data.session.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  })

  return res
}
