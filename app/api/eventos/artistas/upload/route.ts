import { NextRequest, NextResponse } from 'next/server'
import { enforceRateLimit } from '@/lib/rate-limit'
import { serverError } from '@/lib/api-error'
import { supabase } from '@/lib/supabase'
import { validateImage } from '@/lib/imageUpload'

const FOLDERS: Record<string, string> = { perfil: 'perfil', galeria: 'galeria', evento: 'eventos' }

export async function POST(req: NextRequest) {
  const limited = await enforceRateLimit(req, 'upload-artist', { limit: 20, windowSeconds: 3600 })
  if (limited) return limited

  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Se requiere autenticación' }, { status: 401 })
  }
  const token = authHeader.slice(7)
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })

  // Solo artistas aprobados (con perfil) pueden subir imágenes.
  const { data: artist } = await supabase.from('artist_profiles').select('id').eq('id', user.id).maybeSingle()
  if (!artist) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const type = (formData.get('type') as string) || 'galeria'

  if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })
  const folder = FOLDERS[type] ?? 'galeria'

  const check = await validateImage(file)
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status })

  const path = `artistas/${user.id}/${folder}/${Date.now()}.${check.ext}`

  const { error } = await supabase.storage
    .from('event-images')
    .upload(path, check.bytes, { contentType: check.mime, upsert: false })

  if (error) return serverError('eventos/artistas/upload', error)

  const { data } = supabase.storage.from('event-images').getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl })
}
