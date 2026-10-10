import { describe, it, expect } from 'vitest'
import { chain } from '@/test/chain'
import { checkEventCapacity, holdsCapacity, PENDING_HOLD_MS } from './eventCapacity'

const NOW = Date.parse('2026-12-10T12:00:00Z')
const ago = (ms: number) => new Date(NOW - ms).toISOString()

describe('holdsCapacity', () => {
  it('confirmado y en_revision siempre retienen cupo', () => {
    expect(holdsCapacity({ status: 'confirmado', created_at: ago(PENDING_HOLD_MS * 5) }, NOW)).toBe(true)
    expect(holdsCapacity({ status: 'en_revision', created_at: ago(PENDING_HOLD_MS * 5) }, NOW)).toBe(true)
  })
  it('pendiente_comprobante retiene hasta el plazo y luego libera', () => {
    expect(holdsCapacity({ status: 'pendiente_comprobante', created_at: ago(PENDING_HOLD_MS - 1000) }, NOW)).toBe(true)
    expect(holdsCapacity({ status: 'pendiente_comprobante', created_at: ago(PENDING_HOLD_MS + 1000) }, NOW)).toBe(false)
  })
  it('rechazado no retiene; pendiente sin fecha cuenta (falla cerrado)', () => {
    expect(holdsCapacity({ status: 'rechazado', created_at: ago(0) }, NOW)).toBe(false)
    expect(holdsCapacity({ status: 'pendiente_comprobante' }, NOW)).toBe(true)
  })
})

describe('checkEventCapacity', () => {
  const db = (rows: unknown[]) => ({ from: () => ({ select: () => chain({ data: rows, error: null }) }) }) as never

  it('ignora pendientes vencidas al sumar', async () => {
    const old = new Date(Date.now() - PENDING_HOLD_MS - 60_000).toISOString()
    const rows = [
      { cantidad: 5, status: 'confirmado', created_at: old },
      { cantidad: 4, status: 'pendiente_comprobante', created_at: old },
      { cantidad: 1, status: 'pendiente_comprobante', created_at: new Date().toISOString() },
    ]
    const r = await checkEventCapacity(db(rows), 'e1', 10, 4)
    expect(r.ok).toBe(true) // vendidas = 5 + 1 = 6, quedan 4
    const r2 = await checkEventCapacity(db(rows), 'e1', 10, 5)
    expect(r2).toMatchObject({ ok: false, remaining: 4 })
  })

  it('falla cerrado si la consulta da error', async () => {
    const bad = { from: () => ({ select: () => chain({ data: null, error: { message: 'x' } }) }) } as never
    expect(await checkEventCapacity(bad, 'e1', 10, 1)).toMatchObject({ ok: false, remaining: 0 })
  })
})
