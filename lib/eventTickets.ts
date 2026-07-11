import crypto from 'crypto'

export function buildTicketRows(orderId: string, orderCode: string, cantidad: number) {
  return Array.from({ length: cantidad }, (_, i) => ({
    order_id: orderId,
    order_code: orderCode,
    ticket_number: i + 1,
    qr_token: crypto.randomUUID(),
  }))
}
