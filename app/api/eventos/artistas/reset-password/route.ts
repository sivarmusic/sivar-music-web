import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Falta el correo' }, { status: 400 })

  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )

  await client.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: 'https://sivarmusic.com/eventos/artistas/nueva-contrasena',
  })

  return NextResponse.json({ success: true })
}
