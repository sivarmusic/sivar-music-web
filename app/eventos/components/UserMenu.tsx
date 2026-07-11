'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useLanguage } from '@/lib/i18n'
import { ADMIN_EMAIL } from '@/lib/constants'

interface Profile {
  name: string
  avatarUrl: string | null
  isAdmin: boolean
}

export default function UserMenu() {
  const { t } = useLanguage()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined)
  const [open, setOpen] = useState(false)
  const [enteringAdmin, setEnteringAdmin] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function applySession(session: { user: { user_metadata?: Record<string, string>; email?: string } } | null) {
      const user = session?.user
      if (!user) { setProfile(null); return }
      const meta = user.user_metadata ?? {}
      setProfile({
        name: meta.full_name || meta.name || user.email?.split('@')[0] || '',
        avatarUrl: meta.avatar_url || meta.picture || null,
        isAdmin: user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase(),
      })
    }

    supabaseBrowser.auth.getSession().then(({ data }) => applySession(data.session))
    const { data: listener } = supabaseBrowser.auth.onAuthStateChange((_event, session) => applySession(session))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleLogout() {
    setOpen(false)
    await supabaseBrowser.auth.signOut()
    router.push('/eventos')
  }

  async function handleAdminPanel() {
    setEnteringAdmin(true)
    try {
      const { data } = await supabaseBrowser.auth.getSession()
      const token = data.session?.access_token
      if (!token) return
      const res = await fetch('/api/eventos/admin/auto-login', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) { setOpen(false); router.push('/eventos/admin') }
    } finally {
      setEnteringAdmin(false)
    }
  }

  if (profile === undefined) return <div className="w-9 h-9 rounded-full bg-white/5 animate-pulse flex-none" />

  if (profile === null) {
    return (
      <Link
        href="/eventos/mi-cuenta"
        className="flex-none bg-[#F472B6] hover:bg-[#ec4899] active:scale-95 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all whitespace-nowrap"
      >
        {t('home.signIn')}
      </Link>
    )
  }

  return (
    <div
      ref={rootRef}
      className="relative flex-none"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full bg-white/6 hover:bg-white/10 transition"
      >
        {profile.avatarUrl ? (
          <img src={profile.avatarUrl} alt={profile.name} className="w-7 h-7 rounded-full object-cover" />
        ) : (
          <span className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center flex-none">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/50">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </span>
        )}
        <span className="text-white text-xs font-semibold max-w-[100px] truncate hidden sm:block">{profile.name}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-[#150a12] border border-white/10 rounded-2xl shadow-xl overflow-hidden z-30 py-1">
          <Link href="/eventos/mi-cuenta" className="block px-4 py-2.5 text-white/70 hover:text-white hover:bg-white/6 text-sm transition" onClick={() => setOpen(false)}>
            {t('menu.myTickets')}
          </Link>
          <Link href="/eventos/mi-cuenta/ajustes" className="block px-4 py-2.5 text-white/70 hover:text-white hover:bg-white/6 text-sm transition" onClick={() => setOpen(false)}>
            {t('menu.settings')}
          </Link>
          {profile.isAdmin && (
            <>
              <div className="border-t border-white/8 my-1" />
              <button onClick={handleAdminPanel} disabled={enteringAdmin}
                className="w-full text-left px-4 py-2.5 text-[#F472B6] hover:text-white hover:bg-[#F472B6]/10 disabled:opacity-50 text-sm font-semibold transition">
                {enteringAdmin ? t('menu.enteringAdmin') : t('menu.adminPanel')}
              </button>
            </>
          )}
          <div className="border-t border-white/8 my-1" />
          <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-white/70 hover:text-white hover:bg-white/6 text-sm transition">
            {t('menu.logout')}
          </button>
        </div>
      )}
    </div>
  )
}
