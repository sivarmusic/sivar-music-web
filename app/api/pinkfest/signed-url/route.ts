import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyAdminSession } from '@/lib/pinkfest-auth'

export async function GET(req: NextRequest) {
  const user = await verifyAdminSession()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const path = req.nextUrl.searchParams.get('path')
  if (!path) return NextResponse.json({ error: 'Path requerido' }, { status: 400 })

  const { data, error } = await supabase.storage
    .from('comprobantes')
    .createSignedUrl(path, 3600)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ url: data.signedUrl })
}
