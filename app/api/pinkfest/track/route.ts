import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const BOT_PATTERN = /bot|crawler|spider|curl|wget|python|go-http|java|scrapy/i

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'

  const userAgent = req.headers.get('user-agent') || ''

  if (BOT_PATTERN.test(userAgent)) {
    return NextResponse.json({ ok: true })
  }

  const visitDate = new Date().toISOString().split('T')[0]

  await supabase.from('pinkfest_visits').upsert(
    { ip, user_agent: userAgent, visit_date: visitDate },
    { onConflict: 'ip,visit_date', ignoreDuplicates: true }
  )

  return NextResponse.json({ ok: true })
}
