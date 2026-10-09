import { NextRequest, NextResponse } from 'next/server'
import { serverError } from '@/lib/api-error'
import { supabase } from '@/lib/supabase'
import { verifyAdminSession } from '@/lib/staff-auth'
import { slugify } from '@/lib/slug'

async function uniqueSlug(base: string) {
  const root = slugify(base) || 'artista'
  let slug = root
  let n = 2
  while (true) {
    const { data } = await supabase.from('artist_profiles').select('id').eq('slug', slug).maybeSingle()
    if (!data) return slug
    slug = `${root}-${n}`
    n++
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await verifyAdminSession()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const { status } = await req.json()
  if (!['aprobado', 'rechazado'].includes(status)) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
  }

  const { data: application, error: fetchErr } = await supabase
    .from('artist_applications')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchErr || !application) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })

  if (status === 'aprobado') {
    const { data: invited, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(application.email, {
      redirectTo: 'https://sivarmusic.com/eventos/artistas/nueva-contrasena',
    })
    if (inviteErr || !invited.user) {
      console.error('[eventos/artistas/aplicaciones] invitación fallida', { message: inviteErr?.message })
      return NextResponse.json({ error: 'No se pudo invitar al artista. Puede que ese correo ya tenga una cuenta.' }, { status: 500 })
    }

    const slug = await uniqueSlug(application.nombre_artistico)

    const { error: profileErr } = await supabase.from('artist_profiles').insert({
      id: invited.user.id,
      slug,
      nombre_artistico: application.nombre_artistico,
      genero: application.genero,
      bio: application.bio,
      instagram: application.instagram,
      spotify: application.spotify,
      tiktok: application.tiktok,
      youtube: application.youtube,
      otro_link: application.otro_link,
    })
    if (profileErr) return serverError('eventos/artistas/aplicaciones', profileErr)
  }

  const { error: updateErr } = await supabase
    .from('artist_applications')
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq('id', id)

  if (updateErr) return serverError('eventos/artistas/aplicaciones', updateErr)
  return NextResponse.json({ success: true })
}
