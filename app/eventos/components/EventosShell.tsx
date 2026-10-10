'use client'
import { useLanguage } from '@/lib/i18n'

/**
 * Wrapper del tema "eventos" (tokens --ev-* y fuente de rótulo). Por sí solo no pinta
 * nada: las páginas migradas añaden `.ev-surface` en su raíz. Además fija el `lang`
 * del contenido según el idioma elegido (el <html> raíz es global del sitio).
 */
export default function EventosShell({
  fontClassName,
  children,
}: {
  fontClassName: string
  children: React.ReactNode
}) {
  const { lang } = useLanguage()
  return (
    <div data-theme="eventos" lang={lang} className={fontClassName}>
      {children}
    </div>
  )
}
