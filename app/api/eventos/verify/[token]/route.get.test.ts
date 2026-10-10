import { describe, it, expect, vi, beforeEach } from 'vitest'
import { chain } from '@/test/chain'

const m = vi.hoisted(() => ({ result: {} as unknown }))
vi.mock('@/lib/staff-auth', () => ({ verifyStaffSession: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ supabase: { from: () => chain(m.result) } }))

import { GET } from './route'
import { NextRequest } from 'next/server'

const call = () => GET({} as NextRequest, { params: Promise.resolve({ token: 't' }) })

beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}))

describe('GET /api/eventos/verify/[token]', () => {
  it('404 con token inexistente', async () => {
    m.result = { data: null, error: null }
    expect((await call()).status).toBe(404)
  })

  it('400 si la orden no está confirmada', async () => {
    m.result = { data: { id: 't1', ticket_number: 1, check_in_at: null, event_orders: { status: 'en_revision', order_code: 'SM-1', nombre: 'A', cantidad: 1, order_type: 'compra', cortesia_categoria: null, events: { nombre: 'S' } } }, error: null }
    expect((await call()).status).toBe(400)
  })

  it('200 con datos del ticket confirmado', async () => {
    m.result = { data: { id: 't1', ticket_number: 2, check_in_at: null, event_orders: { status: 'confirmado', order_code: 'SM-1', nombre: 'Ana', cantidad: 2, order_type: 'compra', cortesia_categoria: null, events: { nombre: 'Show' } } }, error: null }
    const res = await call()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.ticket).toMatchObject({ order_code: 'SM-1', ticket_number: 2, evento: 'Show' })
  })
})
