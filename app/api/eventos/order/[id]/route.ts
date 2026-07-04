import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data, error } = await supabase
    .from('event_orders')
    .select('id, order_code, nombre, cantidad, status, events(slug, nombre, precio, venue, fecha)')
    .eq('id', id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
  return NextResponse.json({ order: data })
}
