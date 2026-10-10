import { Icon, type IconName } from '../../components/icons'

export type DoorKind = 'valid' | 'used' | 'invalid'

interface Props {
  kind: DoorKind
  icon: IconName
  word: React.ReactNode
  detail?: React.ReactNode
  meta?: string[]
  band?: string
  /** Aviso sobre fondo blanco (p. ej. evento ya pasado). */
  warning?: React.ReactNode
  /** Error de la acción principal (p. ej. falló el check-in). */
  error?: string
  /** Botones de 88 px de la barra inferior. */
  children?: React.ReactNode
}

/**
 * Resultado de la puerta: pantalla completa de alto contraste con palabra gigante + icono
 * (nunca solo color). `role="alert"` para que el lector de pantalla lo anuncie al aparecer.
 */
export default function DoorResult({ kind, icon, word, detail, meta, band, warning, error, children }: Props) {
  return (
    <section className={`ev-door-result ev-door-result--${kind}`} role="alert" aria-live="assertive">
      <div className="ev-door-result__body">
        <span className="ev-door-result__icon" aria-hidden="true"><Icon name={icon} /></span>
        <p className="ev-door-result__word">{word}</p>
        {warning && <div className="ev-door-result__warn">{warning}</div>}
        {detail && <p className="ev-door-result__detail">{detail}</p>}
        {meta?.map((line, i) => <p key={i} className="ev-door-result__meta">{line}</p>)}
        {band && <div className="ev-door-result__band"><span>{band}</span></div>}
        {error && <p className="ev-door-result__error" role="alert">{error}</p>}
      </div>
      <div className="ev-door__actions">{children}</div>
    </section>
  )
}
