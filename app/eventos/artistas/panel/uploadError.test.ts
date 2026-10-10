import { describe, it, expect } from 'vitest'
import { uploadErrorMessage } from './uploadError'

describe('uploadErrorMessage', () => {
  it('403: perfil de artista no activo', () => {
    expect(uploadErrorMessage(403)).toMatch(/todavía no está activo/)
  })
  it('429: límite de subidas', () => {
    expect(uploadErrorMessage(429)).toMatch(/muchas imágenes/)
  })
  it('usa el mensaje del servidor en otros errores y uno genérico si falta', () => {
    expect(uploadErrorMessage(400, 'El archivo supera los 5MB')).toBe('El archivo supera los 5MB')
    expect(uploadErrorMessage(500)).toMatch(/No se pudo subir/)
  })
})
