// Los QR pueden codificar una URL completa (.../verificar/{token}) o el
// qr_token crudo. Esta función detecta cuál es y arma la ruta de
// verificación correcta.
export function resolveTicketVerifyUrl(decoded: string, fallbackBase: string): string {
  try {
    const url = new URL(decoded)
    const parts = url.pathname.split('/').filter(Boolean)
    const idx = parts.indexOf('verificar')
    if (idx !== -1 && parts[idx + 1]) {
      return `/eventos/admin/verificar/${parts[idx + 1]}`
    }
    return `${fallbackBase}/${decoded}`
  } catch {
    return `${fallbackBase}/${decoded}`
  }
}
