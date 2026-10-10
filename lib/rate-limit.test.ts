import { describe, it, expect, vi, beforeEach } from 'vitest'

const rpc = vi.hoisted(() => vi.fn())
vi.mock('@/lib/supabase', () => ({ supabase: { rpc } }))

import { rateLimit, enforceRateLimit, clientIp } from './rate-limit'

beforeEach(() => {
  rpc.mockReset()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

describe('rateLimit', () => {
  it('permite cuando el rpc responde true', async () => {
    rpc.mockResolvedValueOnce({ data: true, error: null })
    expect((await rateLimit('k', { limit: 5, windowSeconds: 60 })).allowed).toBe(true)
    expect(rpc).toHaveBeenCalledWith('check_rate_limit', { p_key: 'k', p_limit: 5, p_window_seconds: 60 })
  })

  it('bloquea al superar el límite (rpc false) con 429 y Retry-After', async () => {
    rpc.mockResolvedValueOnce({ data: false, error: null })
    const res = await enforceRateLimit({ headers: new Headers({ 'x-forwarded-for': '1.2.3.4, 9.9.9.9' }) }, 'register', { limit: 1, windowSeconds: 3600 })
    expect(res?.status).toBe(429)
    expect(res?.headers.get('Retry-After')).toBe('3600')
    expect(rpc.mock.calls[0][1].p_key).toBe('register:1.2.3.4')
  })

  it('falla abierta si el rpc devuelve error', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'function does not exist' } })
    expect((await rateLimit('k', { limit: 1, windowSeconds: 60 })).allowed).toBe(true)
  })

  it('falla abierta si el rpc lanza', async () => {
    rpc.mockRejectedValueOnce(new Error('network'))
    expect((await rateLimit('k', { limit: 1, windowSeconds: 60 })).allowed).toBe(true)
  })
})

describe('clientIp', () => {
  it('toma el primer valor de x-forwarded-for', () => {
    expect(clientIp({ headers: new Headers({ 'x-forwarded-for': ' 10.0.0.1 , 2.2.2.2' }) })).toBe('10.0.0.1')
  })
})
