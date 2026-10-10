import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import VerificarTokenPage from './page'

const push = vi.fn()
const router = { push }
const params = { token: 'tok-1' }
vi.mock('next/navigation', () => ({
  useParams: () => params,
  useRouter: () => router,
}))

const TICKET = {
  order_code: 'SMG-7K4Q2', nombre: 'Javier Chávez', cantidad: 2, evento: 'Pink Fest 2026',
  evento_fecha: new Date(Date.now() + 5 * 86_400_000).toISOString(),
  ticket_number: 1, check_in_at: null as string | null, order_type: 'compra', cortesia_categoria: null,
}

function mockVerify(status: number, ticket?: Partial<typeof TICKET>) {
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
    ok: status === 200, status,
    json: () => Promise.resolve(status === 200 ? { ticket: { ...TICKET, ...ticket } } : { error: 'x' }),
  })))
}

describe('Puerta · verificar entrada', () => {
  beforeEach(() => push.mockClear())
  afterEach(() => vi.unstubAllGlobals())

  it('entrada válida: palabra gigante, comprador, número de entrada y botón de confirmar', async () => {
    mockVerify(200)
    render(<VerificarTokenPage />)
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Válida')
    expect(alert).toHaveTextContent('Javier Chávez')
    expect(alert).toHaveTextContent('Entrada 1 de 2')
    expect(screen.getByRole('button', { name: /Confirmar ingreso/ })).toBeInTheDocument()
  })

  it('ya ingresó: avisa con la hora del escaneo previo y no ofrece confirmar', async () => {
    mockVerify(200, { check_in_at: '2026-11-14T02:14:00.000Z' })
    render(<VerificarTokenPage />)
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/Ya\s*ingresó/)
    expect(alert).toHaveTextContent(/Ingresó a las/)
    expect(screen.queryByRole('button', { name: /Confirmar ingreso/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Escanear siguiente/ }))
    expect(push).toHaveBeenCalledWith('/eventos/admin/verificar')
  })

  it('QR inválido (404): resultado "Inválida" con "No dejar pasar"', async () => {
    mockVerify(404)
    render(<VerificarTokenPage />)
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Inválida')
    expect(alert).toHaveTextContent('No dejar pasar')
  })

  it('si el check-in falla muestra el error y permite reintentar', async () => {
    mockVerify(200)
    render(<VerificarTokenPage />)
    await screen.findByRole('button', { name: /Confirmar ingreso/ })
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({ error: 'Falla del servidor' }) })))
    fireEvent.click(screen.getByRole('button', { name: /Confirmar ingreso/ }))
    await waitFor(() => expect(screen.getByText('Falla del servidor')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /Reintentar ingreso/ })).toBeInTheDocument()
  })
})
