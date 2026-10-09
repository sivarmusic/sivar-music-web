import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendSafely } from './email-safe'

beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => {}) })

describe('sendSafely', () => {
  it('true cuando Resend responde sin error', async () => {
    expect(await sendSafely('t', 'SM-1', async () => ({ error: null }))).toBe(true)
  })

  it('false y log estructurado cuando Resend devuelve { error } sin lanzar', async () => {
    const ok = await sendSafely('ticket_confirmed', 'SM-1', async () => ({ error: { name: 'daily_quota_exceeded', message: 'limit' } }))
    expect(ok).toBe(false)
    expect(console.error).toHaveBeenCalledWith('[email] envío fallido', expect.objectContaining({ kind: 'ticket_confirmed', ref: 'SM-1' }))
  })

  it('false cuando el envío lanza', async () => {
    expect(await sendSafely('t', 'r', async () => { throw new Error('boom') })).toBe(false)
  })
})
