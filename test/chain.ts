// Query builder falso para mocks de Supabase: cualquier método encadenado
// devuelve el mismo objeto y, al hacer await, resuelve con `result`.
// `single`/`maybeSingle` también resuelven con `result`.
export function chain(result: unknown, calls?: { method: string; args: unknown[] }[]) {
  const target: Record<string, unknown> = {}
  const proxy: unknown = new Proxy(target, {
    get(_t, prop: string) {
      if (prop === 'then') {
        return (resolve: (v: unknown) => unknown) => resolve(result)
      }
      return (...args: unknown[]) => {
        calls?.push({ method: prop, args })
        return proxy
      }
    },
  })
  return proxy
}
