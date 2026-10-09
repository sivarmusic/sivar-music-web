import { NextRequest, NextResponse } from 'next/server'
import { serverError } from '@/lib/api-error'
import { supabase } from '@/lib/supabase'

const FOLDERS: Record<string, string> = { perfil: 'perfil', galeria: 'galeria', evento: 'eventos' }

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Se requiere autenticación' }, { status: 401 })
  }
  const token = authHeader.slice(7)
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const type = (formData.get('type') as string) || 'galeria'

  if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })
  const folder = FOLDERS[type] ?? 'galeria'

  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `artistas/${user.id}/${folder}/${Date.now()}.${ext}`
  const bytes = await file.arrayBuffer()

  const { error } = await supabase.storage
    .from('event-images')
    .upload(path, bytes, { contentType: file.type, upsert: true })

  if (error) return serverError('eventos/artistas/upload', error)

  const { data } = supabase.storage.from('event-images').getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl })
}
