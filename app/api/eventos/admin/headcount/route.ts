import { NextRequest, NextResponse } from 'next/server'
import { serverError } from '@/lib/api-error'
import { supabase } from '@/lib/supabase'
import { verifyStaffSession } from '@/lib/staff-auth'

export async function GET(req: NextRequest) {
  const user = await verifyStaffSession()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const eventKey = req.nextUrl.searchParams.get('event_key')
  if (!eventKey) return NextResponse.json({ error: 'event_key requerido' }, { status: 400 })

  const { data, error } = await supabase
    .from('headcounts')
    .select('count')
    .eq('event_key', eventKey)
    .maybeSingle()

  if (error) return serverError('eventos/admin/headcount', error)
  return NextResponse.json({ count: data?.count ?? 0 })
}

export async function PATCH(req: NextRequest) {
  const user = await verifyStaffSession()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { event_key, delta, count } = await req.json()
  if (!event_key) return NextResponse.json({ error: 'event_key requerido' }, { status: 400 })

  const { data: existing } = await supabase
    .from('headcounts')
    .select('count')
    .eq('event_key', event_key)
    .maybeSingle()

  const current = existing?.count ?? 0
  const nextCount = Math.max(0, typeof count === 'number' ? count : current + (Number(delta) || 0))

  const { data, error } = await supabase
    .from('headcounts')
    .upsert({ event_key, count: nextCount }, { onConflict: 'event_key' })
    .select('count')
    .single()

  if (error) return serverError('eventos/admin/headcount', error)
  return NextResponse.json({ count: data.count })
}
