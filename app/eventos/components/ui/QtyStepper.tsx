'use client'
import { Icon } from '../icons'

interface QtyStepperProps {
  value: number
  min?: number
  max: number
  onChange: (value: number) => void
  decLabel: string
  incLabel: string
  inputLabel: string
  /** Variante sobre papel (boleto). */
  paper?: boolean
  iconSize?: 'lg'
  style?: React.CSSProperties
  inputStyle?: React.CSSProperties
  /** Nombre accesible del grupo (si no se rotula externamente). */
  groupLabel?: string
  labelledBy?: string
}

/** Selector de cantidad del sistema (.ev-qty). Siempre dentro de [min, max]. */
export default function QtyStepper({
  value, min = 1, max, onChange, decLabel, incLabel, inputLabel, paper, iconSize, style, inputStyle, groupLabel, labelledBy,
}: QtyStepperProps) {
  const clamp = (n: number) => Math.min(max, Math.max(min, Math.floor(n)))
  return (
    <div
      className={`ev-qty${paper ? ' ev-qty--paper' : ''}`}
      role="group"
      aria-label={labelledBy ? undefined : groupLabel}
      aria-labelledby={labelledBy}
      style={style}
    >
      <button type="button" className="ev-qty__btn" aria-label={decLabel} disabled={value <= min} onClick={() => onChange(clamp(value - 1))}>
        <Icon name="minus" size={iconSize} />
      </button>
      <input
        className="ev-qty__value"
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        aria-label={inputLabel}
        style={inputStyle}
        onChange={e => {
          const n = Number(e.target.value)
          if (Number.isFinite(n) && e.target.value !== '') onChange(clamp(n))
        }}
      />
      <button type="button" className="ev-qty__btn" aria-label={incLabel} disabled={value >= max} onClick={() => onChange(clamp(value + 1))}>
        <Icon name="plus" size={iconSize} />
      </button>
    </div>
  )
}
