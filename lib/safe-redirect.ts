// Redirecciones post-login: solo rutas internas del mismo sitio. Evita el open
// redirect por ?redirect= / ?next= (https://evil.tld, //evil.tld, /\evil.tld,
// javascript:, etc.). Devuelve `fallback` si el valor no es seguro.

const BASE = 'http://internal.invalid'

export function safeInternalPath(
  value: string | null | undefined,
  fallback: string,
  opts: { prefix?: string } = {},
): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 500) return fallback
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback
  // Sin backslash ni caracteres de control en ningún lado (los navegadores los normalizan).
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return fallback
  try {
    const u = new URL(value, BASE)
    if (u.origin !== BASE) return fallback
    if (opts.prefix) {
      const p = opts.prefix
      if (u.pathname !== p && !u.pathname.startsWith(p + '/')) return fallback
    }
  } catch {
    return fallback
  }
  return value
}
