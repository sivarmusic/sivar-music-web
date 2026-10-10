// Mensaje claro para el artista según la respuesta de /api/eventos/artistas/upload.
export function uploadErrorMessage(status: number, serverMessage?: string): string {
  if (status === 403) return 'Tu perfil de artista todavía no está activo. Escribinos a admin@sivarmusic.com.'
  if (status === 429) return 'Subiste muchas imágenes en poco tiempo. Esperá unos minutos e intentá de nuevo.'
  if (status === 401) return 'Tu sesión venció. Volvé a iniciar sesión.'
  return serverMessage || 'No se pudo subir la imagen. Intentá de nuevo.'
}
