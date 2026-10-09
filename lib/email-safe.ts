// Envío de correo sin romper el flujo principal y sin tragarse los fallos.
// El SDK de Resend NO lanza ante errores de API (p. ej. tope diario del plan
// gratuito): devuelve { data, error }. Este helper cubre ambos casos.

type SendResult = { error?: { message?: string; name?: string } | null } | void | undefined

export async function sendSafely(
  kind: string,
  ref: string,
  send: () => Promise<SendResult>,
): Promise<boolean> {
  try {
    const result = await send()
    const error = result && typeof result === 'object' ? result.error : null
    if (error) {
      console.error('[email] envío fallido', { kind, ref, name: error.name, message: error.message })
      return false
    }
    return true
  } catch (err) {
    console.error('[email] excepción al enviar', {
      kind, ref, message: err instanceof Error ? err.message : 'desconocido',
    })
    return false
  }
}
