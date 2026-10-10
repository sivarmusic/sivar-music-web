import { describe, it, expect } from 'vitest'
import { parseCantidad, isAllowedImageUrl } from './eventValidation'

describe('parseCantidad', () => {
  it.each([[1, 1], [20, 20], ['3', 3], [undefined, 1], [null, 1]])('acepta %j', (v, out) => {
    expect(parseCantidad(v)).toBe(out)
  })
  it.each([0, -1, 21, 2.7, NaN, Infinity, 'abc', '2.5', '1e3', {}, [], true])('rechaza %j', v => {
    expect(parseCantidad(v)).toBeNull()
  })
})

describe('isAllowedImageUrl', () => {
  it('acepta bucket del proyecto y rutas relativas', () => {
    expect(isAllowedImageUrl('https://mthpqfiozddtohkcrbui.supabase.co/storage/v1/object/public/event-images/a/cover.jpg')).toBe(true)
    expect(isAllowedImageUrl('/eventos/qr-banco.png')).toBe(true)
  })
  it('rechaza otros hosts, http, protocol-relative y paths que no son del bucket público', () => {
    expect(isAllowedImageUrl('https://evil.tld/a.jpg')).toBe(false)
    expect(isAllowedImageUrl('http://mthpqfiozddtohkcrbui.supabase.co/storage/v1/object/public/a.jpg')).toBe(false)
    expect(isAllowedImageUrl('//evil.tld/a.jpg')).toBe(false)
    expect(isAllowedImageUrl('https://mthpqfiozddtohkcrbui.supabase.co/rest/v1/x')).toBe(false)
  })
})
