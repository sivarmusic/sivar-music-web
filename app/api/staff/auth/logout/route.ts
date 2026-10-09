import { NextResponse } from 'next/server'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete('pf_admin_token')
  res.cookies.delete('pf_admin_refresh')
  return res
}
