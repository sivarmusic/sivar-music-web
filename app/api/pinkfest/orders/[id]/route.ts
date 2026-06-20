import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyAdminSession } from '@/lib/pinkfest-auth'
import crypto from 'crypto'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAdminSession()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const { status, rechazo_motivo } = await req.json()

  if (!['confirmado', 'rechazado'].includes(status)) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
  }

  const updateData: Record<string, unknown> = {
    status,
    rechazo_motivo: rechazo_motivo || null,
  }

  // Generar qr_token único al confirmar (solo si no tiene uno ya)
  if (status === 'confirmado') {
    const { data: existing } = await supabase
      .from('pinkfest_orders')
      .select('qr_token')
      .eq('id', id)
      .single()

    if (!existing?.qr_token) {
      updateData.qr_token = crypto.randomUUID()
    }
  }

  const { data, error } = await supabase
    .from('pinkfest_orders')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ order: data })
}
