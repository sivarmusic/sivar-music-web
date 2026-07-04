import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { email, password, nombre, telefono } = await req.json()

  if (!email || !password || !nombre) {
    return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: email.trim(),
    password,
    user_metadata: { nombre: nombre.trim() },
    email_confirm: true,
  })

  if (error) {
    if (error.message.includes('already')) {
      return NextResponse.json({ error: 'Ya existe una cuenta con ese correo' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (data.user) {
    await supabase.from('attendee_profiles').upsert({
      id: data.user.id,
      nombre: nombre.trim(),
      telefono: telefono?.trim() || null,
    })
  }

  return NextResponse.json({ success: true })
}
