'use client'
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'
import { Icon, type IconName } from '../../components/icons'

interface ShellProps {
  id: string
  label: string
  optional?: string
  error?: string
  hint?: string
  className?: string
}

function Shell({ id, label, optional, error, hint, className, children }: ShellProps & { children: ReactNode }) {
  return (
    <div className={`ev-field${error ? ' ev-field--error' : ''}${className ? ` ${className}` : ''}`}>
      <label className="ev-field__label" htmlFor={id}>
        {label}{optional && <> <span className="ev-opt">{optional}</span></>}
      </label>
      {children}
      {error
        ? <p className="ev-field__error" id={`${id}-e`}><Icon name="alert-circle" size="sm" />{error}</p>
        : hint ? <p className="ev-field__hint" id={`${id}-h`}>{hint}</p> : null}
    </div>
  )
}

function describedBy(id: string, error?: string, hint?: string) {
  return error ? `${id}-e` : hint ? `${id}-h` : undefined
}

type FieldProps = ShellProps & { icon?: IconName; suffix?: ReactNode } & Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className'>

/** Campo de texto del sistema: etiqueta visible, error con aria-invalid + aria-describedby. */
export function Field({ id, label, optional, error, hint, className, icon, suffix, ...input }: FieldProps) {
  const control = (
    <input
      {...input}
      className="ev-input"
      id={id}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy(id, error, hint)}
    />
  )
  return (
    <Shell id={id} label={label} optional={optional} error={error} hint={hint} className={className}>
      {icon || suffix ? (
        <div className="ev-field__control">
          {icon && <Icon name={icon} />}
          {control}
          {suffix}
        </div>
      ) : control}
    </Shell>
  )
}

type AreaProps = ShellProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id' | 'className'>

export function AreaField({ id, label, optional, error, hint, className, ...area }: AreaProps) {
  return (
    <Shell id={id} label={label} optional={optional} error={error} hint={hint} className={className}>
      <textarea
        {...area}
        className="ev-textarea"
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
      />
    </Shell>
  )
}
