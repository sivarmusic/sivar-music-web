import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LanguageProvider } from '@/lib/i18n'
import EventClient from './EventClient'

const nav = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('next/navigation', () => ({
  useParams: () => ({ slug: 'pink-fest' }),
  useRouter: () => nav,
}))
vi.mock('@/lib/supabase-browser', () => ({
  supabaseBrowser: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
  },
}))

const BASE = {
  id: 'e1', slug: 'pink-fest', nombre: 'Pink Fest 2026', descripcion: 'La noche rosa vuelve.',
  fecha: '2026-11-15T01:00:00Z', venue: 'CIFCO', direccion: 'Av. La Revolución', lat: null, lng: null,
  imagen_url: null, precio: 25, artistas: ['Javii'],
}

function renderWith(extra: Record<string, unknown>) {
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ json: () => Promise.resolve({ event: { ...BASE, ...extra } }) })))
  return render(<LanguageProvider><EventClient /></LanguageProvider>)
}

describe('Detalle de evento (rediseño)', () => {
  beforeEach(() => nav.push.mockReset())
  afterEach(() => vi.unstubAllGlobals())

  it('disponible: chip, total por cantidad y compra lleva al login con next', async () => {
    renderWith({ soldOut: false, remaining: null })
    expect(await screen.findByRole('heading', { level: 1, name: 'Pink Fest 2026' })).toBeInTheDocument()
    expect(screen.getAllByText('Disponible').length).toBeGreaterThan(0)
    fireEvent.click(screen.getAllByRole('button', { name: 'Agregar una entrada' })[0])
    expect(screen.getAllByText('$50.00').length).toBeGreaterThan(0)
    fireEvent.click(screen.getAllByRole('button', { name: /^Comprar 2/ })[0])
    await vi.waitFor(() => expect(nav.push).toHaveBeenCalled())
    expect(nav.push.mock.calls[0][0]).toContain(encodeURIComponent('/eventos/pink-fest/checkout?cantidad=2'))
  })

  it('quedan pocas: muestra "Quedan N" y frena el selector en ese número', async () => {
    renderWith({ soldOut: false, remaining: 3 })
    await screen.findByRole('heading', { level: 1, name: 'Pink Fest 2026' })
    expect(screen.getAllByText('Quedan 3').length).toBeGreaterThan(0)
    const inc = screen.getAllByRole('button', { name: 'Agregar una entrada' })[0]
    fireEvent.click(inc); fireEvent.click(inc); fireEvent.click(inc)
    expect(inc).toBeDisabled()
    expect(screen.getAllByText('Solo quedan 3 entradas').length).toBeGreaterThan(0)
  })

  it('agotado: sello, sin selector ni botón de compra', async () => {
    renderWith({ soldOut: true, remaining: null })
    await screen.findByRole('heading', { level: 1, name: 'Pink Fest 2026' })
    expect(screen.getAllByText('Agotado').length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: /^Comprar/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Agregar una entrada' })).not.toBeInTheDocument()
  })

  it('sin afiche usa el fallback tipográfico', async () => {
    renderWith({})
    await screen.findByRole('heading', { level: 1, name: 'Pink Fest 2026' })
    expect(screen.getByRole('img', { name: /sin afiche/ })).toBeInTheDocument()
  })
})
