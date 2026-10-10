'use client'
import { useLanguage } from '@/lib/i18n'
import { copyFor } from '../../copy'

/** Pasos de la compra: Datos → Pago → Confirmación. `current` es 0, 1 o 2. */
export default function OrderSteps({ current, style }: { current: 0 | 1 | 2; style?: React.CSSProperties }) {
  const { lang } = useLanguage()
  const labels = [copyFor(lang, 'evs.step1'), copyFor(lang, 'evs.step2'), copyFor(lang, 'evs.step3')]
  return (
    <ol className="ev-steps" aria-label={copyFor(lang, 'evs.stepsLabel')} style={{ maxWidth: 560, ...style }}>
      {labels.map((label, i) => (
        <li
          key={label}
          className={`ev-steps__item${i < current ? ' is-done' : ''}`}
          aria-current={i === current ? 'step' : undefined}
        >
          {label}
        </li>
      ))}
    </ol>
  )
}
