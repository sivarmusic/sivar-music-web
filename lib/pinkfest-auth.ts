import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

export async function verifyAdminSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get('pf_admin_token')?.value
  if (!token) return null

  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )

  const { data: { user }, error } = await client.auth.getUser(token)
  if (error || !user) return null
  return user
}
