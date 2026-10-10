import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import AdminDashboard from './AdminDashboard'

// El router real es estable entre renders; un mock inestable reiniciaría el efecto de carga.
const router = { push() {} }
vi.mock('next/navigation', () => ({ useRouter: () => router }))

const ORDER = {
  id: 'o1', order_code: 'SMG-7K4Q2', nombre: 'Javier Chávez', telefono: '7123 4567', email: 'javier@gmail.com',
  cantidad: 2, status: 'en_revision', created_at: new Date().toISOString(), comprobante_path: 'proofs/a.pdf',
  order_type: 'compra', event_id: 'e1', events: { nombre: 'Pink Fest', slug: 'pink-fest' }, event_tickets: [],
}
const EVENT = { id: 'e1', nombre: 'Pink Fest', slug: 'pink-fest', fecha: new Date(Date.now() + 86_400_000).toISOString(), precio: 25, visible: true, venue: 'CIFCO' }

let calls: { url: string; init?: RequestInit }[]

function mockApi(patchResponse: Record<string, unknown> = { ok: true }) {
  calls = []
  vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
    calls.push({ url, init })
    const json = (body: unknown, ok = true) => Promise.resolve({ ok, status: ok ? 200 : 400, json: () => Promise.resolve(body) })
    if (url === '/api/staff/auth/session') return json({ role: 'admin' })
    if (url.startsWith('/api/eventos/events')) return json({ events: [EVENT] })
    if (url === '/api/eventos/orders') return json({ orders: [ORDER] })
    if (url.startsWith('/api/eventos/orders/') && init?.method === 'PATCH') return json(patchResponse)
    return json({})
  }))
}

describe('AdminDashboard · órdenes', () => {
  beforeEach(() => mockApi())
  afterEach(() => vi.unstubAllGlobals())

  it('rechazar pide confirmación y solo envía el PATCH al confirmar', async () => {
    render(<AdminDashboard view="ordenes" />)
    fireEvent.click(await screen.findByRole('button', { name: /Rechazar/ }))

    const dialog = screen.getByRole('dialog', { name: '¿Rechazar SMG-7K4Q2?' })
    expect(within(dialog).getByText(/Javier Chávez · 2 entradas · \$50\.00/)).toBeInTheDocument()
    expect(calls.some(c => c.init?.method === 'PATCH')).toBe(false)

    fireEvent.click(within(dialog).getByRole('button', { name: /Sí, rechazar/ }))
    await waitFor(() => expect(calls.some(c => c.init?.method === 'PATCH')).toBe(true))
    const patch = calls.find(c => c.init?.method === 'PATCH')!
    expect(patch.url).toBe('/api/eventos/orders/o1')
    expect(JSON.parse(patch.init!.body as string)).toEqual({ status: 'rechazado' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('cancelar el modal no cambia la orden', async () => {
    render(<AdminDashboard view="ordenes" />)
    fireEvent.click(await screen.findByRole('button', { name: /Rechazar/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(calls.some(c => c.init?.method === 'PATCH')).toBe(false)
  })

  it('confirmar con correo fallido avisa en un toast de error', async () => {
    mockApi({ ok: true, emailSent: false })
    render(<AdminDashboard view="ordenes" />)
    fireEvent.click(await screen.findByRole('button', { name: /Confirmar/ }))
    expect(await screen.findByText('Orden confirmada, pero el correo no pudo enviarse')).toBeInTheDocument()
  })
})
