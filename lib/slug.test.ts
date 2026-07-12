import { describe, it, expect } from 'vitest'
import { slugify } from './slug'

describe('slugify', () => {
  it('lowercases, replaces spaces with hyphens, and strips diacritics', () => {
    expect(slugify('Hola Mundo')).toBe('hola-mundo')
  })

  it('strips Spanish diacritics to ASCII equivalents', () => {
    expect(slugify('Programación de Evento')).toBe('programacion-de-evento')
    expect(slugify('Año Nuevo')).toBe('ano-nuevo')
  })

  it('collapses multiple separators and trims leading/trailing hyphens', () => {
    expect(slugify('  Doble   Espacio  ')).toBe('doble-espacio')
    expect(slugify('---valor---')).toBe('valor')
  })

  it('returns an empty string for empty input', () => {
    expect(slugify('')).toBe('')
  })

  it('handles unicode emoji-adjacent text without crashing', () => {
    // Emoji are not in [a-z0-9\s-] and are stripped, but the function should not throw.
    const result = slugify('fiesta 🎉 nocturna')
    expect(result).toBe('fiesta-nocturna')
  })
})
