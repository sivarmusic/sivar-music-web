import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { sendAdminNewArtistApplication } from '@/lib/email'

export async function POST(req: NextRequest) {
  const { nombreArtistico, nombreContacto, email, telefono, genero, bio, instagram, spotify, tiktok, youtube, otroLink } = await req.json()

  if (!nombreArtistico?.trim() || !nombreContacto?.trim() || !email?.trim()
    || !instagram?.trim() || !spotify?.trim() || !tiktok?.trim() || !youtube?.trim()) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const { error } = await supabase.from('artist_applications').insert({
    nombre_artistico: nombreArtistico.trim(),
    nombre_contacto: nombreContacto.trim(),
    email: email.trim(),
    telefono: telefono?.trim() || null,
    genero: genero?.trim() || null,
    bio: bio?.trim() || null,
    instagram: instagram?.trim() || null,
    spotify: spotify?.trim() || null,
    tiktok: tiktok?.trim() || null,
    youtube: youtube?.trim() || null,
    otro_link: otroLink?.trim() || null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  sendAdminNewArtistApplication({
    nombreArtistico: nombreArtistico.trim(),
    nombreContacto: nombreContacto.trim(),
    email: email.trim(),
    telefono: telefono?.trim() ?? '',
    genero: genero?.trim() ?? '',
    bio: bio?.trim() ?? '',
  }).catch(() => {})

  return NextResponse.json({ success: true })
}
