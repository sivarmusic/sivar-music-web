import { NextRequest, NextResponse } from 'next/server'
import { enforceRateLimit } from '@/lib/rate-limit'
import { supabase } from '@/lib/supabase'
import { sendSafely } from '@/lib/email-safe'
import { sendWelcome } from '@/lib/email'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export async function POST(req: NextRequest) {
  const limited = await enforceRateLimit(req, 'register', { limit: 20, windowSeconds: 3600 })
  if (limited) return limited

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })
  }
  const { password, telefono } = body
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : ''

  if (!email || typeof password !== 'string' || !password || !nombre) {
    return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })
  }
  if (email.length > 254 || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'El correo no es válido' }, { status: 400 })
  }
  if (nombre.length > 100) {
    return NextResponse.json({ error: 'El nombre es demasiado largo (máx. 100 caracteres)' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
  }
  if (password.length > 72) {
    return NextResponse.json({ error: 'La contraseña es demasiado larga (máx. 72 caracteres)' }, { status: 400 })
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    user_metadata: { nombre },
    email_confirm: true,
  })

  if (error) {
    if (error.message.toLowerCase().includes('already')) {
      return NextResponse.json({ error: 'user_exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  if (data.user) {
    await supabase.from('attendee_profiles').upsert({
      id: data.user.id,
      nombre,
      telefono: typeof telefono === 'string' ? telefono.trim().slice(0, 30) || null : null,
    })
    await sendSafely('welcome', data.user.id, () => sendWelcome({ to: email, nombre }))
  }

  return NextResponse.json({ success: true })
}
