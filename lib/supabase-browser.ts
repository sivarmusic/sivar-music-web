import { createClient } from '@supabase/supabase-js'

// Cliente para uso en el browser (componentes 'use client')
// Solo tiene permisos anon — los datos sensibles siempre van por API routes server-side
export const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
