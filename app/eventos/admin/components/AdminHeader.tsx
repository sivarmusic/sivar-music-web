'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ADMIN_TABS = [
  { href: '/eventos/admin', label: 'Eventos' },
  { href: '/eventos/admin/cortesias', label: 'Cortesías' },
  { href: '/eventos/admin/verificar', label: 'Verificar' },
  { href: '/eventos/admin/artistas', label: 'Artistas' },
]

const VERIFICADOR_TABS = [
  { href: '/eventos/admin', label: 'Solicitudes' },
  { href: '/eventos/admin/verificar', label: 'Verificar' },
]

export default function AdminHeader() {
  const pathname = usePathname()
  const [role, setRole] = useState<'admin' | 'verificador' | null>(null)

  useEffect(() => {
    fetch('/api/pinkfest/auth/session')
      .then(r => r.ok ? r.json() : null)
      .then(data => setRole(data?.role ?? null))
  }, [])

  const tabs = role === 'verificador' ? VERIFICADOR_TABS : ADMIN_TABS

  return (
    <header className="sticky top-0 z-20 bg-[#0a0008]/95 backdrop-blur-md border-b border-white/8">
      <div className="px-4 py-3 flex items-center gap-3 max-w-4xl mx-auto">
        <Link href="/eventos/admin" className="flex-none flex items-center gap-2.5">
          <img src="/favicon.ico" alt="Sivar Music" className="h-8 w-8 rounded-lg" />
          <div className="hidden sm:block">
            <p className="text-[#F472B6] text-[9px] font-bold tracking-[0.25em] uppercase leading-none">Sivar Music</p>
            <p className="text-white font-bold text-sm leading-tight">Admin</p>
          </div>
        </Link>
        <div className="flex-1" />
        <nav className="flex items-center gap-1 overflow-x-auto">
          {tabs.map(tab => {
            const active = tab.href === '/eventos/admin' ? pathname === tab.href : pathname?.startsWith(tab.href)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`text-xs font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap transition ${
                  active ? 'bg-[#F472B6]/15 text-[#F472B6]' : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
