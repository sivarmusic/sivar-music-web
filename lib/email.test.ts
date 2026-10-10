import { describe, it, expect, vi, beforeEach } from 'vitest'

const send = vi.hoisted(() => vi.fn().mockResolvedValue({ data: {}, error: null }))
vi.mock('resend', () => ({ Resend: class { emails = { send } } }))

import { esc, sendAdminNewArtistApplication } from './email'
import { sendSafely } from './email-safe'

describe('esc', () => {
  it('escapa los caracteres peligrosos', () => {
    expect(esc(`<a href="x">&'`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;')
  })
})

describe('RESEND_API_KEY', () => {
  it('sin clave el envío no lanza: sendSafely devuelve false', async () => {
    vi.stubEnv('RESEND_API_KEY', '')
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const ok = await sendSafely('welcome', 'u1', () => sendAdminNewArtistApplication({
      nombreArtistico: 'A', nombreContacto: 'B', email: 'a@x.com', telefono: '', genero: '', bio: '',
    }))
    expect(ok).toBe(false)
    vi.unstubAllEnvs()
  })
})

describe('plantillas de correo', () => {
  beforeEach(() => { vi.stubEnv('RESEND_API_KEY', 're_test') })
  it('escapan el HTML que viene de usuarios', async () => {
    await sendAdminNewArtistApplication({
      nombreArtistico: '<script>alert(1)</script>', nombreContacto: 'Ana', email: 'a@x.com',
      telefono: '', genero: '', bio: '<img src=x onerror=1>',
    })
    const html: string = send.mock.calls[0][0].html
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<img src=x')
    expect(html).toContain('&lt;script&gt;')
  })
})
