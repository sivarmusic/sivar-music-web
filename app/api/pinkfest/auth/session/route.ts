import { NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/pinkfest-auth'

export async function GET() {
  const user = await verifyAdminSession()
  if (!user) return NextResponse.json({ authenticated: false }, { status: 401 })
  return NextResponse.json({ authenticated: true, email: user.email })
}
