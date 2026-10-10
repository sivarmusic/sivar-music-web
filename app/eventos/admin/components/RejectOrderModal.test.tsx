import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RejectOrderModal from './RejectOrderModal'

describe('RejectOrderModal', () => {
  it('muestra el diálogo con el código y el detalle de la orden', () => {
    render(<RejectOrderModal code="SMG-7K4Q2" detail="Javier Chávez · 2 entradas · $50.00" onCancel={() => {}} onConfirm={() => {}} />)
    const dialog = screen.getByRole('dialog', { name: '¿Rechazar SMG-7K4Q2?' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByText(/Javier Chávez · 2 entradas · \$50\.00/)).toBeInTheDocument()
    expect(screen.getByText('rechazada')).toBeInTheDocument()
  })

  it('confirma solo con "Sí, rechazar"; Cancelar y Escape cierran sin confirmar', () => {
    const onCancel = vi.fn()
    const onConfirm = vi.fn()
    render(<RejectOrderModal code="SMG-1" detail="" onCancel={onCancel} onConfirm={onConfirm} />)

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledTimes(2)
    expect(onConfirm).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /Sí, rechazar/ }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('el foco inicial cae en Cancelar (la acción destructiva no queda a un Enter)', () => {
    render(<RejectOrderModal code="SMG-1" detail="" onCancel={() => {}} onConfirm={() => {}} />)
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus()
  })
})
