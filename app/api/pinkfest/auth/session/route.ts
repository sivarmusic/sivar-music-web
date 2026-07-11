import { NextResponse } from 'next/server'
import { getSessionRole } from '@/lib/pinkfest-auth'

export async function GET() {
  const session = await getSessionRole()
  if (!session) return NextResponse.json({ authenticated: false }, { status: 401 })
  return NextResponse.json({ authenticated: true, email: session.email, role: session.role })
}
