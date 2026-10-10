import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { LanguageProvider } from '@/lib/i18n'
import PagoPage from './page'

const nav = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }))
vi.mock('next/navigation', () => ({
  useParams: () => ({ slug: 'pink-fest', orderId: 'ord-1' }),
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

const ORDER = {
  id: 'ord-1', order_code: 'SMG-7K4Q2', cantidad: 2, status: 'pendiente_comprobante',
  events: { slug: 'pink-fest', nombre: 'Pink Fest', precio: 25, venue: 'CIFCO', fecha: '2026-12-02T02:00:00Z' },
}

type Handler = (url: string, init?: RequestInit) => Promise<unknown>
function mockFetch(order: Record<string, unknown>, upload: Handler) {
  vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
    if (url.startsWith('/api/eventos/order/')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ order }) })
    return upload(url, init)
  }))
}

const pick = (name: string, type: string, bytes = 1024) => {
  const f = new File([new Uint8Array(bytes)], name, { type })
  fireEvent.change(document.getElementById('file-input') as HTMLInputElement, { target: { files: [f] } })
}

function renderPage() {
  return render(<LanguageProvider><PagoPage /></LanguageProvider>)
}

describe('Pago (rediseño)', () => {
  const writeText = vi.fn(() => Promise.resolve())
  beforeEach(() => {
    localStorage.clear(); nav.push.mockReset(); nav.replace.mockReset(); writeText.mockClear()
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    URL.createObjectURL = vi.fn(() => 'blob:x'); URL.revokeObjectURL = vi.fn()
  })
  afterEach(() => vi.unstubAllGlobals())

  it('muestra el código de orden grande y lo copia al portapapeles', async () => {
    mockFetch(ORDER, () => Promise.reject(new Error('no')))
    renderPage()
    expect(await screen.findByRole('heading', { level: 1, name: 'Transferí y subí tu comprobante' })).toBeInTheDocument()
    // el código aparece en el boleto y en la fila de concepto (resaltada)
    expect(screen.getAllByText('SMG-7K4Q2').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Concepto · obligatorio')).toBeInTheDocument()

    const btn = screen.getByRole('button', { name: 'Copiar código' })
    fireEvent.click(btn)
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('SMG-7K4Q2'))
    await waitFor(() => expect(btn).toHaveClass('is-copied'))
    expect(screen.getByText('Copiado: SMG-7K4Q2')).toBeInTheDocument()
  })

  it('copia concepto y monto exacto desde la lista', async () => {
    mockFetch(ORDER, () => Promise.reject(new Error('no')))
    renderPage()
    await screen.findByText('Concepto · obligatorio')
    fireEvent.click(screen.getByRole('button', { name: 'Copiar monto' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('50.00'))
    fireEvent.click(screen.getByRole('button', { name: 'Copiar concepto' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('SMG-7K4Q2'))
  })

  it('rechaza un archivo de más de 4 MB mostrando su tamaño real', async () => {
    mockFetch(ORDER, () => Promise.reject(new Error('no')))
    renderPage()
    await screen.findByText('Concepto · obligatorio')
    pick('escaneo.pdf', 'application/pdf', 5 * 1024 * 1024)
    expect(await screen.findByText('Pesa 5 MB. El máximo es 4 MB.')).toBeInTheDocument()
    expect(screen.getByText('escaneo.pdf')).toBeInTheDocument()
    // no se puede enviar
    expect(screen.getByRole('button', { name: 'Enviar comprobante' })).toBeDisabled()
  })

  it('rechaza un formato no admitido', async () => {
    mockFetch(ORDER, () => Promise.reject(new Error('no')))
    renderPage()
    await screen.findByText('Concepto · obligatorio')
    pick('foto.heic', 'image/heic')
    expect(await screen.findByText('Solo JPG, PNG, WebP o PDF.')).toBeInTheDocument()
  })

  it('corte de red: avisa que la orden sigue reservada y permite reintentar', async () => {
    let calls = 0
    mockFetch(ORDER, () => {
      calls += 1
      if (calls === 1) return Promise.reject(new TypeError('Failed to fetch'))
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ success: true }) })
    })
    renderPage()
    await screen.findByText('Concepto · obligatorio')
    pick('captura.jpg', 'image/jpeg')
    fireEvent.click(screen.getByRole('button', { name: 'Enviar comprobante' }))
    expect(await screen.findByText('Se cortó la subida')).toBeInTheDocument()
    expect(screen.getByText('Revisá tu conexión. Tu orden sigue reservada.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Comprobante recibido ✓')).toBeInTheDocument()
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith('/eventos/pink-fest/gracias/ord-1'), { timeout: 2000 })
  })

  it('error del servidor: muestra el mensaje y conserva el archivo para reintentar', async () => {
    mockFetch(ORDER, () => Promise.resolve({
      ok: false, status: 500, json: () => Promise.resolve({ error: 'No se pudo subir el comprobante. Intentá de nuevo.' }),
    }))
    renderPage()
    await screen.findByText('Concepto · obligatorio')
    pick('captura.png', 'image/png')
    fireEvent.click(screen.getByRole('button', { name: 'Enviar comprobante' }))
    expect(await screen.findByText('No se pudo subir el comprobante. Intentá de nuevo.')).toBeInTheDocument()
    expect(screen.getByText('captura.png')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('orden rechazada: explica qué pasó y permite subir otro comprobante', async () => {
    mockFetch({ ...ORDER, status: 'rechazado' }, () => Promise.reject(new Error('no')))
    renderPage()
    expect(await screen.findByRole('heading', { level: 1, name: 'No pudimos confirmar tu pago' })).toBeInTheDocument()
    expect(screen.getByText('el monto transferido no es $50.00,')).toBeInTheDocument()
    expect(document.getElementById('file-input')).not.toBeNull()
  })

  it('orden en revisión redirige a gracias', async () => {
    mockFetch({ ...ORDER, status: 'en_revision' }, () => Promise.reject(new Error('no')))
    renderPage()
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith('/eventos/pink-fest/gracias/ord-1'))
    await act(async () => {})
  })
})
