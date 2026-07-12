import { describe, it, expect } from 'vitest'
import { buildTicketRows } from './eventTickets'

describe('buildTicketRows', () => {
  it('returns one row per requested quantity', () => {
    const rows = buildTicketRows('order-1', 'ABC123', 3)
    expect(rows).toHaveLength(3)
  })

  it('numbers tickets starting at 1 in order', () => {
    const rows = buildTicketRows('order-1', 'ABC123', 3)
    expect(rows.map((r) => r.ticket_number)).toEqual([1, 2, 3])
  })

  it('propagates order_id and order_code onto every row', () => {
    const rows = buildTicketRows('order-99', 'XYZ', 2)
    for (const row of rows) {
      expect(row.order_id).toBe('order-99')
      expect(row.order_code).toBe('XYZ')
    }
  })

  it('assigns a unique qr_token to every row', () => {
    const rows = buildTicketRows('order-1', 'ABC123', 10)
    const tokens = rows.map((r) => r.qr_token)
    expect(new Set(tokens).size).toBe(tokens.length)
    // UUID v4 shape: 8-4-4-4-12 hex chars separated by dashes
    for (const t of tokens) {
      expect(t).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    }
  })

  it('returns an empty array for a zero-quantity order', () => {
    expect(buildTicketRows('order-1', 'ABC123', 0)).toEqual([])
  })
})
