import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { ADMIN_EMAIL } from '@/lib/constants'

// POST — si la sesión de "Mi cuenta" ya es la del admin, arma la cookie
// de sesión de /eventos/admin sin pedir usuario/contraseña de nuevo.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Se requiere autenticación' }, { status: 401 })
  }
  const token = authHeader.slice(7)

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
  if (user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set('pf_admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  })
  return res
}
