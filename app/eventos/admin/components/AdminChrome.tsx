'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Icon, type IconName } from '../../components/icons'

interface Tab { href: string; label: string; icon: IconName; also?: string[] }

const ADMIN_TABS: Tab[] = [
  { href: '/eventos/admin', label: 'Eventos', icon: 'calendar', also: ['/eventos/admin/nuevo', '/eventos/admin/editar', '/eventos/admin/eventos'] },
  { href: '/eventos/admin/ordenes', label: 'Órdenes', icon: 'ticket' },
  { href: '/eventos/admin/verificar', label: 'Puerta', icon: 'scan' },
  { href: '/eventos/admin/contador', label: 'Contador', icon: 'users' },
  { href: '/eventos/admin/cortesias', label: 'Cortesías', icon: 'gift' },
  { href: '/eventos/admin/artistas', label: 'Artistas', icon: 'mic' },
]

const VERIFICADOR_TABS: Tab[] = [
  { href: '/eventos/admin', label: 'Solicitudes', icon: 'ticket' },
  { href: '/eventos/admin/verificar', label: 'Verificar', icon: 'scan' },
  { href: '/eventos/admin/contador', label: 'Contador', icon: 'users' },
]

function isActive(pathname: string | null, tab: Tab) {
  if (!pathname) return false
  if (tab.href === '/eventos/admin') {
    return pathname === tab.href || (tab.also ?? []).some(p => pathname.startsWith(p))
  }
  return pathname.startsWith(tab.href)
}

/** Pantallas de puerta: tema claro, a pantalla completa, sin barra de navegación. */
function isDoorPath(pathname: string | null) {
  return !!pathname && (pathname.startsWith('/eventos/admin/verificar') || pathname.startsWith('/eventos/admin/contador'))
}

export default function AdminChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [role, setRole] = useState<'admin' | 'verificador' | null>(null)
  const bare = pathname === '/eventos/admin/login'
  const door = isDoorPath(pathname)

  useEffect(() => {
    if (bare || door) return
    fetch('/api/staff/auth/session')
      .then(r => r.ok ? r.json() : null)
      .then(data => setRole(data?.role ?? null))
  }, [bare, door])

  if (bare) return <div className="ev-surface">{children}</div>
  if (door) return <div className="ev-surface ev-door-page">{children}</div>

  const tabs = role === 'verificador' ? VERIFICADOR_TABS : ADMIN_TABS

  async function logout() {
    await fetch('/api/staff/auth/logout', { method: 'POST' })
    router.push('/eventos/admin/login')
  }

  return (
    <div className="ev-surface">
      <a className="ev-skip-link" href="#main">Saltar al contenido</a>
      <div className="ev-admin">
        <header className="ev-admin-top">
          <Link href="/eventos/admin" aria-label="Sivar Eventos — Panel" style={{ display: 'inline-flex' }}>
            <span className="ev-wordmark" aria-hidden="true">Sivar<br />Eventos</span>
          </Link>
          <span className="ev-admin-top__badge">{role === 'verificador' ? 'Puerta' : 'Admin'}</span>
          <button type="button" className="ev-icon-btn" onClick={logout} aria-label="Cerrar sesión">
            <Icon name="log-out" size="lg" />
          </button>
        </header>

        <aside className="ev-admin-side" aria-label="Navegación del panel">
          <nav className="ev-side-nav">
            <p className="ev-side-nav__group">Panel</p>
            {tabs.map(tab => (
              <Link key={tab.href} href={tab.href} aria-current={isActive(pathname, tab) ? 'page' : undefined}>
                <Icon name={tab.icon} />{tab.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="ev-admin-main" id="main">{children}</main>

        <nav className="ev-admin-tabbar" aria-label="Navegación del panel" style={{ ['--tabs' as string]: tabs.length }}>
          {tabs.map(tab => (
            <Link key={tab.href} href={tab.href} aria-current={isActive(pathname, tab) ? 'page' : undefined}>
              <Icon name={tab.icon} size="lg" />{tab.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  )
}
