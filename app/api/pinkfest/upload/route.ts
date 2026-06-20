import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const MAX_BYTES = 5 * 1024 * 1024

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const orderId = formData.get('orderId') as string
  const file = formData.get('file') as File

  if (!orderId || !file) {
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Formato no permitido. Usá JPG, PNG, WebP o PDF.' },
      { status: 400 }
    )
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'El archivo supera los 5MB.' }, { status: 400 })
  }

  const { data: order, error: fetchError } = await supabase
    .from('pinkfest_orders')
    .select('order_code, comprobante_path')
    .eq('id', orderId)
    .single()

  if (fetchError || !order) {
    return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
  }

  // Borrar archivo anterior si existe
  if (order.comprobante_path) {
    await supabase.storage.from('comprobantes').remove([order.comprobante_path])
  }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `pinkfest/${order.order_code}/comprobante.${ext}`
  const bytes = await file.arrayBuffer()

  const { error: uploadError } = await supabase.storage
    .from('comprobantes')
    .upload(path, bytes, { contentType: file.type, upsert: true })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { error: updateError } = await supabase
    .from('pinkfest_orders')
    .update({ comprobante_path: path, status: 'en_revision' })
    .eq('id', orderId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
