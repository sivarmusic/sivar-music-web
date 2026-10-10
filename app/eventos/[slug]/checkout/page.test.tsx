import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { LanguageProvider } from '@/lib/i18n'
import CheckoutPage from './page'

const nav = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }))
vi.mock('next/navigation', () => ({
  useParams: () => ({ slug: 'pink-fest' }),
  useSearchParams: () => new URLSearchParams('cantidad=4'),
  useRouter: () => nav,
}))

const session = { access_token: 'tok', user: { id: 'u1', email: 'javier@gmail.com', user_metadata: {} } }
vi.mock('@/lib/supabase-browser', () => ({
  supabaseBrowser: {
    auth: {
      getSession: () => Promise.resolve({ data: { session } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }),
    }),
  },
}))

const EVENT = { id: 'e1', slug: 'pink-fest', nombre: 'Pink Fest', fecha: '2026-12-02T02:00:00Z', venue: 'CIFCO', precio: 25, imagen_url: null }

function mockFetch(order: () => Promise<unknown>) {
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url.startsWith('/api/eventos/events/')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ event: EVENT }) })
    return order()
  }))
}

async function renderForm() {
  render(<LanguageProvider><CheckoutPage /></LanguageProvider>)
  await screen.findByRole('heading', { level: 1, name: 'Tus datos' })
  await waitFor(() => expect(screen.getByRole('button', { name: /Continuar al pago/ })).toBeEnabled())
}

const fill = (id: string, value: string) =>
  fireEvent.change(document.getElementById(id) as HTMLInputElement, { target: { value } })

describe('Checkout (rediseño)', () => {
  beforeEach(() => { nav.push.mockReset(); nav.replace.mockReset() })
  afterEach(() => vi.unstubAllGlobals())

  it('con sesión: correo solo lectura y resumen con la cantidad de la URL', async () => {
    mockFetch(() => Promise.reject(new Error('no')))
    await renderForm()
    const email = document.getElementById('co-email') as HTMLInputElement
    expect(email.value).toBe('javier@gmail.com')
    expect(email).toHaveAttribute('readonly')
    expect(screen.getByText('4 entradas × $25.00')).toBeInTheDocument()
    expect(screen.getByText('$100.00')).toBeInTheDocument()
  })

  it('errores por campo: aria-invalid, aria-describedby y resumen en alerta', async () => {
    const order = vi.fn()
    mockFetch(order as never)
    await renderForm()
    fireEvent.click(screen.getByRole('button', { name: /Continuar al pago/ }))

    const nombre = document.getElementById('co-nombre') as HTMLInputElement
    const tel = document.getElementById('co-telefono') as HTMLInputElement
    expect(nombre).toHaveAttribute('aria-invalid', 'true')
    expect(tel).toHaveAttribute('aria-invalid', 'true')
    expect(document.getElementById(nombre.getAttribute('aria-describedby')!)).toHaveTextContent('Ingresá tu nombre completo.')
    expect(document.getElementById(tel.getAttribute('aria-describedby')!)).toHaveTextContent('Ingresá un teléfono válido')
    expect(screen.getByRole('alert')).toHaveTextContent('Revisá 2 campos')
    expect(nombre).toHaveFocus()
    expect(order).not.toHaveBeenCalled()
  })

  it('"no quedan entradas": ofrece Comprar N y ajusta la cantidad', async () => {
    mockFetch(() => Promise.resolve({ ok: false, status: 409, json: () => Promise.resolve({ error: 'x', remaining: 3 }) }))
    await renderForm()
    fill('co-nombre', 'Javier Chávez'); fill('co-telefono', '7123 4567')
    fireEvent.click(screen.getByRole('button', { name: /Continuar al pago/ }))

    expect(await screen.findByText('No quedan entradas disponibles para 4')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Continuar al pago/ })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: /Comprar 3/ }))
    expect(screen.getByText('3 entradas × $25.00')).toBeInTheDocument()
    expect(screen.queryByText('No quedan entradas disponibles para 4')).not.toBeInTheDocument()
  })

  it('agotado (remaining 0): no ofrece comprar', async () => {
    mockFetch(() => Promise.resolve({ ok: false, status: 409, json: () => Promise.resolve({ error: 'x', remaining: 0 }) }))
    await renderForm()
    fill('co-nombre', 'Javier Chávez'); fill('co-telefono', '7123 4567')
    fireEvent.click(screen.getByRole('button', { name: /Continuar al pago/ }))
    expect(await screen.findByText('Ya no quedan entradas disponibles para este evento.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Comprar/ })).not.toBeInTheDocument()
  })

  it('solicitud activa con este teléfono: error en el campo y aviso informativo', async () => {
    mockFetch(() => Promise.resolve({ ok: false, status: 409, json: () => Promise.resolve({ error: 'largo', code: 'phone_active' }) }))
    await renderForm()
    fill('co-nombre', 'Javier Chávez'); fill('co-telefono', '7123 4567')
    fireEvent.click(screen.getByRole('button', { name: /Continuar al pago/ }))

    expect(await screen.findByText('Ya hay una solicitud activa con este teléfono.')).toBeInTheDocument()
    expect(document.getElementById('co-telefono')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('¿Ya empezaste una compra?')).toBeInTheDocument()
  })

  it('compra exitosa: crea la orden y va a pago', async () => {
    mockFetch(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ order: { id: 'ord-9' } }) }))
    await renderForm()
    fill('co-nombre', 'Javier Chávez'); fill('co-telefono', '7123 4567')
    fireEvent.click(screen.getByRole('button', { name: /Continuar al pago/ }))
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith('/eventos/pink-fest/pago/ord-9'))
  })
})
