import { describe, it, expect } from 'vitest'
import { safeInternalPath } from './safe-redirect'

const FB = '/eventos/mi-cuenta'

describe('safeInternalPath', () => {
  it('acepta rutas internas con query', () => {
    expect(safeInternalPath('/eventos/x/checkout?cantidad=2', FB)).toBe('/eventos/x/checkout?cantidad=2')
  })
  it.each([
    'https://evil.tld', 'http://evil.tld/x', '//evil.tld', '/\\evil.tld', '\\\\evil.tld',
    'javascript:alert(1)', '@evil.tld', 'evil.tld', '', '/a\\b', '/a\nb',
  ])('rechaza %j', v => {
    expect(safeInternalPath(v, FB)).toBe(FB)
  })
  it('rechaza null/undefined', () => {
    expect(safeInternalPath(null, FB)).toBe(FB)
    expect(safeInternalPath(undefined, FB)).toBe(FB)
  })
  it('respeta el prefijo exigido', () => {
    const o = { prefix: '/eventos/admin' }
    expect(safeInternalPath('/eventos/admin/verificar/abc', '/eventos/admin', o)).toBe('/eventos/admin/verificar/abc')
    expect(safeInternalPath('/eventos/admin', '/x', o)).toBe('/eventos/admin')
    expect(safeInternalPath('/eventos/administrador', '/x', o)).toBe('/x')
    expect(safeInternalPath('/otra', '/x', o)).toBe('/x')
  })
})
