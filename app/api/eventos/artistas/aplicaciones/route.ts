import { NextResponse } from 'next/server'
import { serverError } from '@/lib/api-error'
import { supabase } from '@/lib/supabase'
import { verifyAdminSession } from '@/lib/staff-auth'

export async function GET() {
  const user = await verifyAdminSession()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await supabase
    .from('artist_applications')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return serverError('eventos/artistas/aplicaciones', error)
  return NextResponse.json({ applications: data })
}
