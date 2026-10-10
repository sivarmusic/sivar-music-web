import { describe, it, expect } from 'vitest'
import { formatMoney, formatMoneyFull, orderTotal } from './format'

describe('format', () => {
  it('formatea enteros sin centavos y decimales con dos', () => {
    expect(formatMoney(10)).toBe('$10')
    expect(formatMoney(12.5)).toBe('$12.50')
  })
  it('formatMoneyFull siempre usa dos decimales', () => {
    expect(formatMoneyFull(37.5)).toBe('$37.50')
    expect(formatMoneyFull(10)).toBe('$10.00')
  })
  it('orderTotal redondea a centavos', () => {
    expect(orderTotal(3, 12.5)).toBe(37.5)
    expect(orderTotal(3, 0.1)).toBe(0.3)
  })
})
