import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = 'Sivar Music <no-reply@sivarmusic.com>'

// Mientras no esté verificado el dominio, usar el email de Resend para pruebas
const FROM_DEV = 'Sivar Music <onboarding@resend.dev>'
const from = process.env.NODE_ENV === 'production' ? FROM : FROM_DEV

export async function sendOrderConfirmation({
  to, nombre, orderCode, eventName, cantidad, total, pagoUrl,
}: {
  to: string; nombre: string; orderCode: string
  eventName: string; cantidad: number; total: number; pagoUrl: string
}) {
  return resend.emails.send({
    from,
    to,
    subject: `Tu orden ${orderCode} — ${eventName}`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
        <h2 style="color:#F472B6;margin:0 0 8px">Sivar Music</h2>
        <h3 style="margin:0 0 24px;color:#111">¡Hola ${nombre.split(' ')[0]}! Recibimos tu solicitud</h3>
        <div style="background:#fdf2f8;border:1px solid #fbcfe8;border-radius:12px;padding:20px;margin-bottom:20px;text-align:center">
          <p style="margin:0 0 4px;font-size:12px;color:#9f1239;font-weight:bold;letter-spacing:2px;text-transform:uppercase">Tu código de orden</p>
          <p style="margin:0;font-size:32px;font-weight:bold;color:#be185d;letter-spacing:4px">${orderCode}</p>
          <p style="margin:8px 0 0;font-size:12px;color:#6b7280">Incluí este código como concepto en tu transferencia</p>
        </div>
        <p style="color:#374151"><strong>Evento:</strong> ${eventName}</p>
        <p style="color:#374151"><strong>Entradas:</strong> ${cantidad} × $10 = <strong>$${total}.00</strong></p>
        <div style="margin:24px 0">
          <a href="${pagoUrl}" style="background:#F472B6;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">
            Ver datos de pago →
          </a>
        </div>
        <p style="color:#6b7280;font-size:13px">Una vez que hagás la transferencia, subí el comprobante en el link de arriba. Te confirmaremos por WhatsApp en las próximas horas.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
        <p style="color:#9ca3af;font-size:12px;text-align:center">Sivar Music Group · A beneficio de la cultura</p>
      </div>
    `,
  })
}

export async function sendTicketConfirmed({
  to, nombre, orderCode, eventName, eventDate, eventVenue, verUrl,
}: {
  to: string; nombre: string; orderCode: string
  eventName: string; eventDate: string; eventVenue: string; verUrl: string
}) {
  return resend.emails.send({
    from,
    to,
    subject: `✓ Entrada confirmada — ${eventName}`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
        <h2 style="color:#F472B6;margin:0 0 8px">Sivar Music</h2>
        <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:20px;margin-bottom:20px;text-align:center">
          <p style="font-size:36px;margin:0">🎉</p>
          <h3 style="color:#166534;margin:8px 0 4px">¡Tu entrada está confirmada!</h3>
          <p style="margin:0;color:#15803d;font-weight:bold;letter-spacing:2px">${orderCode}</p>
        </div>
        <p style="color:#374151"><strong>Evento:</strong> ${eventName}</p>
        <p style="color:#374151"><strong>Fecha:</strong> ${eventDate}</p>
        <p style="color:#374151"><strong>Lugar:</strong> ${eventVenue}</p>
        <div style="margin:24px 0">
          <a href="${verUrl}" style="background:#22c55e;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">
            Ver mis entradas y QR →
          </a>
        </div>
        <p style="color:#6b7280;font-size:13px">Presentá el código QR en la entrada del evento. Podés guardarlo en tu galería o tenerlo listo en este link.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
        <p style="color:#9ca3af;font-size:12px;text-align:center">Sivar Music Group</p>
      </div>
    `,
  })
}

export async function sendWelcome({
  to, nombre,
}: {
  to: string; nombre: string
}) {
  return resend.emails.send({
    from,
    to,
    subject: 'Bienvenido/a a Sivar Music',
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
        <h2 style="color:#F472B6;margin:0 0 8px">Sivar Music</h2>
        <h3 style="color:#111">¡Hola ${nombre.split(' ')[0]}!</h3>
        <p style="color:#374151">Tu cuenta en Sivar Music fue creada. Podés iniciar sesión para ver tus entradas a cualquier evento.</p>
        <a href="https://sivarmusic.com/eventos/mi-cuenta" style="background:#F472B6;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;margin:16px 0">
          Ver mis entradas →
        </a>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
        <p style="color:#9ca3af;font-size:12px;text-align:center">Sivar Music Group</p>
      </div>
    `,
  })
}
