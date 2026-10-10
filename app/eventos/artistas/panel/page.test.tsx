import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LanguageProvider } from '@/lib/i18n'
import ArtistaPanelPage from './page'

const nav = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => nav, usePathname: () => '/eventos/artistas/panel' }))

const PROFILE = { id: 'a1', slug: 'javii', nombre_artistico: 'Javii', genero: 'Pop', bio: null, foto_url: null, instagram: null, spotify: null, tiktok: null, youtube: null, apple_music: null, otro_link: null }
const EVENTS = [
  { id: 'e1', nombre: 'Javii en vivo', fecha: '2026-12-12T02:00:00Z', venue: 'San Salvador', direccion: null, descripcion: null, imagen_url: null, link_externo: null, lat: null, lng: null, precio: 12, max_entradas: null, status: 'pendiente' },
  { id: 'e2', nombre: 'Sala abierta', fecha: '2026-12-20T02:00:00Z', venue: 'CIFCO', direccion: null, descripcion: null, imagen_url: null, link_externo: null, lat: null, lng: null, precio: null, max_entradas: null, status: 'aprobado' },
]

const profileState = vi.hoisted(() => ({ value: null as unknown }))
vi.mock('@/lib/supabase-browser', () => {
  const rows = (table: string) => table === 'artist_events' ? EVENTS : []
  return {
    supabaseBrowser: {
      auth: {
        getSession: () => Promise.resolve({ data: { session: { access_token: 't', user: { id: 'a1' } } } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
        signOut: () => Promise.resolve(),
      },
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: profileState.value }),
            order: () => Promise.resolve({ data: rows(table) }),
          }),
        }),
      }),
    },
  }
})

function renderPanel() {
  render(<LanguageProvider><ArtistaPanelPage /></LanguageProvider>)
}

describe('Panel de artista (rediseño)', () => {
  it('perfil aprobado: nombre, chip publicado y eventos con su estado', async () => {
    profileState.value = PROFILE
    renderPanel()
    expect(await screen.findByRole('heading', { level: 1, name: 'Javii' })).toBeInTheDocument()
    expect(screen.getByText('Perfil publicado')).toBeInTheDocument()
    expect(await screen.findByText('En revisión')).toBeInTheDocument()
    expect(screen.getByText('Publicado')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Ver perfil público/ })).toHaveAttribute('href', '/eventos/artistas/javii')
  })

  it('Editar perfil abre la pestaña de perfil con los campos', async () => {
    profileState.value = PROFILE
    renderPanel()
    await screen.findByRole('heading', { level: 1, name: 'Javii' })
    fireEvent.click(screen.getByRole('button', { name: /Editar perfil/ }))
    expect(await screen.findByLabelText('Género musical')).toHaveValue('Pop')
  })

  it('sin perfil aprobado: vuelve al login (comportamiento intacto)', async () => {
    profileState.value = null
    nav.push.mockReset()
    renderPanel()
    await vi.waitFor(() => expect(nav.push).toHaveBeenCalledWith('/eventos/artistas/login'))
  })
})
