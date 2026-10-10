import { NextRequest, NextResponse } from 'next/server'
import { enforceRateLimit } from '@/lib/rate-limit'
import { supabase } from '@/lib/supabase'
import { EXT_BY_MIME, matchesMime } from '@/lib/imageUpload'
import { checkEventCapacity, holdsCapacity } from '@/lib/eventCapacity'

// 4 MB: Vercel rechaza cuerpos > 4.5 MB antes de llegar a la función (413 HTML).
const MAX_BYTES = 4 * 1024 * 1024

// Solo se puede subir o reemplazar el comprobante mientras la orden no esté confirmada.
const UPLOADABLE_STATUSES = ['pendiente_comprobante', 'en_revision', 'rechazado']

export async function POST(req: NextRequest) {
  const limited = await enforceRateLimit(req, 'upload-comprobante', { limit: 40, windowSeconds: 3600 })
  if (limited) return limited

  const formData = await req.formData()
  const orderId = formData.get('orderId') as string
  const file = formData.get('file') as File

  if (!orderId || !file) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
  if (!(file.type in EXT_BY_MIME)) return NextResponse.json({ error: 'Formato no permitido' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'El archivo supera los 4MB' }, { status: 400 })

  const { data: order, error: fetchError } = await supabase
    .from('event_orders')
    .select('order_code, comprobante_path, status, cantidad, event_id, created_at, events(max_entradas)')
    .eq('id', orderId)
    .single()

  if (fetchError || !order) return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })

  if (!UPLOADABLE_STATUSES.includes(order.status)) {
    return NextResponse.json({ error: 'Esta orden ya fue confirmada' }, { status: 409 })
  }

  // Una orden rechazada (o con la reserva vencida) que sube comprobante vuelve a
  // ocupar cupo al pasar a en_revision: se re-chequea antes de aceptarlo.
  const needsCapacity = order.status === 'rechazado' || !holdsCapacity(order)
  if (needsCapacity && order.event_id) {
    const ev = order.events as unknown as { max_entradas: number | null } | null
    const capacity = await checkEventCapacity(supabase, order.event_id, ev?.max_entradas, Number(order.cantidad) || 1)
    if (!capacity.ok) {
      return NextResponse.json({ error: capacity.message, remaining: capacity.remaining }, { status: 409 })
    }
  }

  const bytes = await file.arrayBuffer()
  if (!matchesMime(new Uint8Array(bytes.slice(0, 12)), file.type)) {
    return NextResponse.json({ error: 'El archivo no coincide con su formato' }, { status: 400 })
  }

  if (order.comprobante_path) {
    await supabase.storage.from('comprobantes').remove([order.comprobante_path])
  }

  // La extensión sale del tipo validado, no del nombre que manda el cliente.
  const path = `eventos/${order.order_code}/comprobante.${EXT_BY_MIME[file.type]}`

  const { error: uploadError } = await supabase.storage
    .from('comprobantes')
    .upload(path, bytes, { contentType: file.type, upsert: true })

  if (uploadError) {
    console.error('[eventos/upload] fallo al subir comprobante', { orderId, message: uploadError.message })
    return NextResponse.json({ error: 'No se pudo subir el comprobante. Intentá de nuevo.' }, { status: 500 })
  }

  const { error: updateError } = await supabase
    .from('event_orders')
    .update({ comprobante_path: path, status: 'en_revision' })
    .eq('id', orderId)
    .in('status', UPLOADABLE_STATUSES)

  if (updateError) {
    console.error('[eventos/upload] fallo al actualizar orden', { orderId, message: updateError.message })
    return NextResponse.json({ error: 'No se pudo registrar el comprobante. Intentá de nuevo.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
