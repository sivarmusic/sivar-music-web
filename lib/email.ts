import { Resend } from 'resend'
import { ADMIN_EMAIL } from './constants'

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


export async function sendAdminNewOrderRequest({
  orderCode, eventName, nombre, telefono, email, cantidad, total,
}: {
  orderCode: string; eventName: string; nombre: string
  telefono: string; email: string; cantidad: number; total: number
}) {
  return resend.emails.send({
    from,
    to: ADMIN_EMAIL,
    subject: `Nueva solicitud de entrada — ${eventName} (${orderCode})`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
        <h2 style="color:#F472B6;margin:0 0 8px">Sivar Music — Nueva solicitud</h2>
        <p style="color:#374151"><strong>Evento:</strong> ${eventName}</p>
        <p style="color:#374151"><strong>Código de orden:</strong> ${orderCode}</p>
        <p style="color:#374151"><strong>Nombre:</strong> ${nombre}</p>
        <p style="color:#374151"><strong>Teléfono:</strong> ${telefono}</p>
        <p style="color:#374151"><strong>Email:</strong> ${email}</p>
        <p style="color:#374151"><strong>Entradas:</strong> ${cantidad} × total <strong>$${total}.00</strong></p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
        <p style="color:#9ca3af;font-size:12px;text-align:center">Revisá el panel admin para confirmar el comprobante cuando llegue.</p>
      </div>
    `,
  })
}

export async function sendAdminNewArtistApplication({
  nombreArtistico, nombreContacto, email, telefono, genero, bio,
}: {
  nombreArtistico: string; nombreContacto: string; email: string
  telefono: string; genero: string; bio: string
}) {
  return resend.emails.send({
    from,
    to: ADMIN_EMAIL,
    subject: `Nueva solicitud de artista — ${nombreArtistico}`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
        <h2 style="color:#F472B6;margin:0 0 8px">Sivar Events for Artists</h2>
        <p style="color:#374151"><strong>Nombre artístico:</strong> ${nombreArtistico}</p>
        <p style="color:#374151"><strong>Contacto:</strong> ${nombreContacto}</p>
        <p style="color:#374151"><strong>Email:</strong> ${email}</p>
        <p style="color:#374151"><strong>Teléfono:</strong> ${telefono || '—'}</p>
        <p style="color:#374151"><strong>Género:</strong> ${genero || '—'}</p>
        <p style="color:#374151"><strong>Bio:</strong> ${bio || '—'}</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
        <p style="color:#9ca3af;font-size:12px;text-align:center">Revisá y aprobá la solicitud en el panel de admin.</p>
      </div>
    `,
  })
}

export async function sendAdminNewArtistEvent({
  nombreArtistico, nombreEvento, fecha, venue,
}: {
  nombreArtistico: string; nombreEvento: string; fecha: string; venue: string
}) {
  return resend.emails.send({
    from,
    to: ADMIN_EMAIL,
    subject: `Evento por confirmar — ${nombreEvento} (${nombreArtistico})`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
        <h2 style="color:#F472B6;margin:0 0 8px">Sivar Events for Artists</h2>
        <p style="color:#374151"><strong>Artista:</strong> ${nombreArtistico}</p>
        <p style="color:#374151"><strong>Evento:</strong> ${nombreEvento}</p>
        <p style="color:#374151"><strong>Fecha:</strong> ${new Date(fecha).toLocaleString('es-SV')}</p>
        <p style="color:#374151"><strong>Venue:</strong> ${venue}</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
        <p style="color:#9ca3af;font-size:12px;text-align:center">Revisá y confirmá el evento en el panel de admin antes de que se publique.</p>
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
    subject: `¡Tu entrada está confirmada! — ${eventName}`,
    html: `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background-color:#0a0008;padding:40px 20px;">
  <div style="max-width:480px;margin:0 auto;">

    <div style="text-align:center;margin-bottom:28px;">
      <p style="color:#F472B6;font-size:11px;font-weight:700;letter-spacing:0.25em;text-transform:uppercase;margin:0 0 6px;">Sivar Music</p>
      <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0;">Sivar Events</h1>
    </div>

    <div style="background-color:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:32px 28px;text-align:center;margin-bottom:12px;">
      <p style="font-size:40px;margin:0 0 16px;">🎉</p>
      <h2 style="color:#ffffff;font-size:20px;font-weight:700;margin:0 0 8px;">¡Tu entrada está confirmada!</h2>
      <p style="color:rgba(255,255,255,0.5);font-size:14px;margin:0 0 24px;line-height:1.6;">
        Hola ${nombre.split(' ')[0]}, tus entradas para <strong style="color:#ffffff;">${eventName}</strong> están listas.
      </p>

      <div style="background-color:rgba(244,114,182,0.1);border:1px solid rgba(244,114,182,0.25);border-radius:12px;padding:14px 20px;margin-bottom:20px;">
        <p style="color:rgba(255,255,255,0.4);font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 4px;">Código de orden</p>
        <p style="color:#F472B6;font-size:26px;font-weight:700;letter-spacing:0.12em;margin:0;">${orderCode}</p>
      </div>

      <div style="text-align:left;border-top:1px solid rgba(255,255,255,0.08);padding-top:16px;margin-bottom:24px;">
        <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:0 0 8px;">📅 ${eventDate}</p>
        <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:0;">📍 ${eventVenue}</p>
      </div>

      <a href="${verUrl}" style="display:inline-block;background-color:#F472B6;color:#ffffff;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;text-decoration:none;padding:14px 32px;border-radius:14px;">
        Ver mis entradas y QR →
      </a>
    </div>

    <div style="background-color:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:16px 20px;text-align:center;margin-bottom:24px;">
      <p style="color:rgba(255,255,255,0.35);font-size:12px;margin:0;line-height:1.6;">
        Iniciá sesión o creá una cuenta en Sivar Events para ver tu código QR y presentarlo en la entrada del evento.
      </p>
    </div>

    <p style="text-align:center;color:rgba(255,255,255,0.15);font-size:11px;margin:0;">
      Sivar Music Group · El Salvador
    </p>

  </div>
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
