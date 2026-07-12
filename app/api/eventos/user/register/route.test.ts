import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.mock factories are hoisted above all imports, so any mock targets
// they reference must be defined via vi.hoisted to avoid TDZ errors.
const mocks = vi.hoisted(() => {
  return {
    createUser: vi.fn(),
    upsert: vi.fn(),
    sendWelcome: vi.fn(),
  }
})

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { admin: { createUser: mocks.createUser } },
    from: () => ({ upsert: mocks.upsert }),
  },
}))

vi.mock('@/lib/email', () => ({
  sendWelcome: mocks.sendWelcome,
}))

import { POST } from './route'
import { NextRequest } from 'next/server'

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/eventos/user/register', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

beforeEach(() => {
  mocks.createUser.mockReset()
  mocks.upsert.mockClear()
  mocks.upsert.mockResolvedValue({ error: null })
  mocks.sendWelcome.mockReset()
  // sendWelcome resolves to undefined by default so the route's
  // .catch() chain doesn't blow up. Specific tests can override with
  // mockRejectedValueOnce / mockResolvedValueOnce.
  mocks.sendWelcome.mockResolvedValue(undefined)
})

describe('POST /api/eventos/user/register', () => {
  it('returns 200 { success: true }, auto-confirms the user, and fires sendWelcome with { to, nombre }', async () => {
    mocks.createUser.mockResolvedValueOnce({
      data: { user: { id: 'u-1' } },
      error: null,
    })

    const res = await POST(
      makeRequest({ email: 'ana@example.com', password: 'secret1', nombre: 'Ana López' }),
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ success: true })

    expect(mocks.createUser).toHaveBeenCalledTimes(1)
    expect(mocks.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'ana@example.com',
        password: 'secret1',
        email_confirm: true,
      }),
    )

    expect(mocks.sendWelcome).toHaveBeenCalledTimes(1)
    expect(mocks.sendWelcome).toHaveBeenCalledWith({
      to: 'ana@example.com',
      nombre: 'Ana López',
    })
  })

  it('upserts the attendee_profile with the new user id after a successful signup', async () => {
    mocks.createUser.mockResolvedValueOnce({
      data: { user: { id: 'u-42' } },
      error: null,
    })

    await POST(
      makeRequest({
        email: 'jose@example.com',
        password: 'secret1',
        nombre: 'José Pérez',
        telefono: '+50370000000',
      }),
    )

    expect(mocks.upsert).toHaveBeenCalledTimes(1)
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'u-42',
        nombre: 'José Pérez',
        telefono: '+50370000000',
      }),
    )
  })

  it('still returns 200 { success: true } when sendWelcome rejects (fire-and-forget resilience)', async () => {
    mocks.createUser.mockResolvedValueOnce({
      data: { user: { id: 'u-77' } },
      error: null,
    })
    mocks.sendWelcome.mockRejectedValueOnce(new Error('resend down'))

    const res = await POST(
      makeRequest({ email: 'ana@example.com', password: 'secret1', nombre: 'Ana' }),
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ success: true })
    expect(mocks.sendWelcome).toHaveBeenCalledTimes(1)
  })

  it('returns 409 { error: "user_exists" } when the email is already registered', async () => {
    mocks.createUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'User already registered' },
    })

    const res = await POST(
      makeRequest({ email: 'dup@example.com', password: 'secret1', nombre: 'Dup' }),
    )

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body).toEqual({ error: 'user_exists' })
    expect(mocks.sendWelcome).not.toHaveBeenCalled()
  })

  it('returns 500 { error: "server_error" } and does not leak the raw provider message for a generic admin error', async () => {
    mocks.createUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'internal Supabase stack trace with secrets' },
    })

    const res = await POST(
      makeRequest({ email: 'fail@example.com', password: 'secret1', nombre: 'Fail' }),
    )

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body).toEqual({ error: 'server_error' })
    // No raw provider internals must leak through the response body.
    expect(JSON.stringify(body)).not.toMatch(/Supabase stack trace/)
    expect(JSON.stringify(body)).not.toMatch(/secrets/)
    expect(mocks.sendWelcome).not.toHaveBeenCalled()
  })

  it('returns 400 "Faltan campos" when any required field is missing', async () => {
    const res = await POST(
      makeRequest({ email: 'a@b.com', password: 'secret1' }),
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Faltan campos')
    expect(mocks.createUser).not.toHaveBeenCalled()
  })

  it('returns 400 "al menos 6" when the password is too short', async () => {
    const res = await POST(
      makeRequest({ email: 'a@b.com', password: '12345', nombre: 'Ana' }),
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/al menos 6/)
    expect(mocks.createUser).not.toHaveBeenCalled()
  })
})
