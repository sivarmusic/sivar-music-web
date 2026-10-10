import { describe, it, expect, vi, beforeEach } from 'vitest'
import { chain } from '@/test/chain'

const m = vi.hoisted(() => ({ staff: vi.fn(), send: vi.fn(), order: {} as unknown }))
vi.mock('@/lib/staff-auth', () => ({ verifyStaffSession: m.staff }))
vi.mock('@/lib/email', () => ({ sendTicketConfirmed: m.send }))
vi.mock('@/lib/supabase', () => ({ supabase: { from: () => chain(m.order) } }))

import { POST } from './route'
import { NextRequest } from 'next/server'

const call = () => POST({} as NextRequest, { params: Promise.resolve({ id: 'o1' }) })
const confirmed = { data: { order_code: 'SM-1', nombre: 'Ana', email: 'a@x.com', status: 'confirmado', events: { nombre: 'S', slug: 's', venue: 'V', fecha: '2026-12-01T20:00:00Z' } }, error: null }

beforeEach(() => {
  m.staff.mockReset(); m.send.mockReset()
  m.staff.mockResolvedValue({ id: 's' }); m.order = confirmed
  m.send.mockResolvedValue({ error: null })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('POST /api/eventos/orders/[id]/resend', () => {
  it('401 sin staff', async () => {
    m.staff.mockResolvedValueOnce(null)
    expect((await call()).status).toBe(401)
  })

  it('400 si la orden no está confirmada', async () => {
    m.order = { data: { ...(confirmed.data), status: 'en_revision' }, error: null }
    expect((await call()).status).toBe(400)
    expect(m.send).not.toHaveBeenCalled()
  })

  it('200 cuando el correo sale', async () => {
    expect((await call()).status).toBe(200)
  })

  it('502 cuando Resend devuelve error', async () => {
    m.send.mockResolvedValueOnce({ error: { name: 'quota', message: 'limit' } })
    expect((await call()).status).toBe(502)
  })
})
