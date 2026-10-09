import { describe, it, expect, vi } from 'vitest'

const send = vi.hoisted(() => vi.fn().mockResolvedValue({ data: {}, error: null }))
vi.mock('resend', () => ({ Resend: class { emails = { send } } }))

import { esc, sendAdminNewArtistApplication } from './email'

describe('esc', () => {
  it('escapa los caracteres peligrosos', () => {
    expect(esc(`<a href="x">&'`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;')
  })
})

describe('plantillas de correo', () => {
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
