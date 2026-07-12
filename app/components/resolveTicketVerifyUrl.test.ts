import { describe, it, expect } from 'vitest'
import { resolveTicketVerifyUrl } from './resolveTicketVerifyUrl'

describe('resolveTicketVerifyUrl', () => {
  it('routes a Pink Fest verification URL to /pinkfest/verificar/{token}', () => {
    const decoded = 'https://sivarmusic.com/pinkfest/verificar/abc-123'
    expect(resolveTicketVerifyUrl(decoded, '/eventos/admin/verificar')).toBe(
      '/pinkfest/verificar/abc-123',
    )
  })

  it('routes a general-eventos verification URL to /eventos/admin/verificar/{token}', () => {
    const decoded = 'https://sivarmusic.com/eventos/alguna/ruta/verificar/tok-xyz'
    expect(resolveTicketVerifyUrl(decoded, '/eventos/admin/verificar')).toBe(
      '/eventos/admin/verificar/tok-xyz',
    )
  })

  it('falls back to {fallbackBase}/{decoded} when input is a raw token (not a URL)', () => {
    expect(resolveTicketVerifyUrl('raw-token-abc', '/eventos/admin/verificar')).toBe(
      '/eventos/admin/verificar/raw-token-abc',
    )
  })

  it('falls back to {fallbackBase}/{decoded} when the URL has no /verificar/ segment', () => {
    const decoded = 'https://sivarmusic.com/alguna/ruta/sin/verificar'
    expect(resolveTicketVerifyUrl(decoded, '/eventos/admin/verificar')).toBe(
      '/eventos/admin/verificar/https://sivarmusic.com/alguna/ruta/sin/verificar',
    )
  })
})
