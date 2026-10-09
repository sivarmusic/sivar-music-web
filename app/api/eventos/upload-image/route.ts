import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyAdminSession } from '@/lib/staff-auth'
import { validateImage } from '@/lib/imageUpload'
import { serverError } from '@/lib/api-error'

export async function POST(req: NextRequest) {
  const user = await verifyAdminSession()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const rawSlug = (formData.get('slug') as string) || 'evento'
  // Solo caracteres seguros para el path del bucket.
  const slug = rawSlug.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'evento'

  if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })

  const check = await validateImage(file)
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status })

  const path = `${slug}/cover.${check.ext}`

  const { error } = await supabase.storage
    .from('event-images')
    .upload(path, check.bytes, { contentType: check.mime, upsert: true })

  if (error) return serverError('eventos/upload-image', error)

  const { data } = supabase.storage.from('event-images').getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl })
}
