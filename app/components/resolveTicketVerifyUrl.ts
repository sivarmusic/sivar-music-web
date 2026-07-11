// Los QR de Pink Fest codifican una URL completa (/pinkfest/verificar/{token});
// los de la plataforma general de eventos codifican el qr_token crudo.
// Esta función detecta cuál es y arma la ruta de verificación correcta,
// para que un solo escáner sirva para ambos sistemas de tickets.
export function resolveTicketVerifyUrl(decoded: string, fallbackBase: string): string {
  try {
    const url = new URL(decoded)
    const parts = url.pathname.split('/').filter(Boolean)
    const idx = parts.indexOf('verificar')
    if (idx !== -1 && parts[idx + 1]) {
      const base = parts[0] === 'pinkfest' ? '/pinkfest/verificar' : '/eventos/admin/verificar'
      return `${base}/${parts[idx + 1]}`
    }
    return `${fallbackBase}/${decoded}`
  } catch {
    return `${fallbackBase}/${decoded}`
  }
}
