import { NextRequest, NextResponse } from 'next/server'
import { serverError } from '@/lib/api-error'
import { supabase } from '@/lib/supabase'
import { verifyAdminSession } from '@/lib/staff-auth'

export async function POST(req: NextRequest) {
  const user = await verifyAdminSession()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const slug = (formData.get('slug') as string) || 'evento'

  if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })

  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${slug}/cover.${ext}`
  const bytes = await file.arrayBuffer()

  const { error } = await supabase.storage
    .from('event-images')
    .upload(path, bytes, { contentType: file.type, upsert: true })

  if (error) return serverError('eventos/upload-image', error)

  const { data } = supabase.storage.from('event-images').getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl })
}
