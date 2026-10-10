import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { LanguageProvider } from '@/lib/i18n'
import EventosClient from './EventosClient'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push() {} }) }))

vi.mock('@/lib/supabase-browser', () => ({
  supabaseBrowser: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
  },
}))

const future = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString()

const EVENTS = [
  { id: '1', slug: 'pink-fest', nombre: 'Pink Fest', fecha: future(10), venue: 'CIFCO', imagen_url: null, precio: 25, artistas: ['Javii'], kind: 'ticket' },
  { id: '2', slug: 'acustico', nombre: 'Monica Acústico', fecha: future(20), venue: 'Teatro Nacional', imagen_url: null, precio: 20, artistas: ['Monica'], kind: 'ticket' },
]

function mockFetch(impl: () => Promise<unknown>) {
  vi.stubGlobal('fetch', vi.fn(impl))
}

function renderPage() {
  return render(<LanguageProvider><EventosClient /></LanguageProvider>)
}

describe('EventosClient (rediseño)', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.unstubAllGlobals())

  it('muestra destacado, grilla y precio con dos decimales', async () => {
    mockFetch(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ events: EVENTS }) }))
    renderPage()
    expect(await screen.findByRole('heading', { level: 3, name: 'Pink Fest' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Monica Acústico' })).toBeInTheDocument()
    expect(screen.getByText('Más fechas')).toBeInTheDocument()
    expect(screen.getByText('$25.00')).toBeInTheDocument()
    // sin imagen: fallback tipográfico, no emoji
    expect(screen.getAllByRole('img', { name: /sin afiche/ }).length).toBe(2)
  })

  it('búsqueda sin resultados ofrece limpiar', async () => {
    mockFetch(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ events: EVENTS }) }))
    renderPage()
    await screen.findByRole('heading', { level: 3, name: 'Pink Fest' })
    fireEvent.change(screen.getAllByRole('searchbox')[0], { target: { value: 'zzz' } })
    expect(await screen.findByText('Sin resultados para “zzz”')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar búsqueda' }))
    expect(await screen.findByRole('heading', { level: 3, name: 'Pink Fest' })).toBeInTheDocument()
  })

  it('muestra el estado de error con reintento', async () => {
    mockFetch(() => Promise.reject(new Error('net')))
    renderPage()
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /Reintentar/ })).toBeInTheDocument()
  })
})
