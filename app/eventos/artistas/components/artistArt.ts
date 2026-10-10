import arteEntradas from '../../assets/arte-entradas.svg'

/** Arte de marca de arte-entradas (motivo de Sivar, nunca arte de otro artista). */
export const ARTIST_ART: string =
  typeof arteEntradas === 'string' ? arteEntradas : (arteEntradas as { src: string }).src
