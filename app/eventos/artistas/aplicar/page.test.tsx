import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LanguageProvider } from '@/lib/i18n'
import AplicarArtistaPage from './page'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/eventos/artistas/aplicar' }))
vi.mock('@/lib/supabase-browser', () => ({
  supabaseBrowser: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
  },
}))

const el = (id: string) => document.getElementById(id) as HTMLInputElement
const fill = (id: string, value: string) => fireEvent.change(el(id), { target: { value } })

function renderPage() {
  render(<LanguageProvider><AplicarArtistaPage /></LanguageProvider>)
}

describe('Aplicar artista (rediseño)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('enviar vacío: errores por campo con aria-invalid/describedby y sin llamar a la API', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /Enviar solicitud/ }))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/campos marcados/)
    const stage = el('ap-a')
    expect(stage).toHaveAttribute('aria-invalid', 'true')
    const described = document.getElementById(stage.getAttribute('aria-describedby')!)
    expect(described).toHaveTextContent('Completá este campo.')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('campos válidos: envía y muestra la confirmación; error del servidor en alerta', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ error: 'Correo ya registrado' }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
    vi.stubGlobal('fetch', fetchMock)
    renderPage()
    fill('ap-a', 'Javii'); fill('ap-n', 'Javier'); fill('ap-e', 'j@correo.com')
    fill('ap-ig', 'https://instagram.com/j'); fill('ap-sp', 'https://open.spotify.com/j')
    fill('ap-tk', 'https://tiktok.com/@j'); fill('ap-yt', 'https://youtube.com/j')
    fireEvent.click(screen.getByRole('button', { name: /Enviar solicitud/ }))
    expect(await screen.findByText('Correo ya registrado')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Enviar solicitud/ }))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Gracias por aplicar' })).toBeInTheDocument())
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
