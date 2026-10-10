'use client'
import { useLanguage } from '@/lib/i18n'
import { copyFor, type CopyKey } from '../../copy'

/** t = diccionario global del sitio; c = textos de la ticketera (app/eventos/copy.ts). */
export function useCopy() {
  const { lang, t, dateLocale } = useLanguage()
  const c = (key: CopyKey, vars?: Record<string, string | number>) => copyFor(lang, key, vars)
  return { lang, t, c, dateLocale }
}
