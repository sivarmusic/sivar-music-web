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

// sendWelcome is PRESENT for forward-compat with fix-confirm-email.
// Asserting it was called would couple this change to that one, so it stays
// inert here. fix-confirm-email adds the positive expectation.
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
})

describe('POST /api/eventos/user/register', () => {
  it('returns 200 { success: true } and creates the user with email_confirm:true on a valid payload', async () => {
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

  it('returns 409 with the "Ya existe una cuenta" body when the email is already registered', async () => {
    mocks.createUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'User already registered' },
    })

    const res = await POST(
      makeRequest({ email: 'dup@example.com', password: 'secret1', nombre: 'Dup' }),
    )

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toMatch(/ya existe una cuenta/i)
  })

  it('returns 500 with the error message for a generic admin error', async () => {
    mocks.createUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'boom' },
    })

    const res = await POST(
      makeRequest({ email: 'fail@example.com', password: 'secret1', nombre: 'Fail' }),
    )

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('boom')
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
