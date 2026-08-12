import { Resend } from "resend";
import { supabase } from "@/lib/supabase";

/**
 * Voces admin email notifications (instant, on-event sends).
 *
 * Ported from voces-bds's lib/email.ts, trimmed to the one instant
 * notification this batch's routes actually trigger: notifyNewClient,
 * called by app/api/voces/client/register on admin-created clients.
 *
 * notifyCastingCantante / notifyCastingLocutor added in batch 5 (public
 * casting-application flow: app/api/voces/casting/apply and
 * app/api/voces/cantantes/casting/apply), following the same
 * getInstantRecipients()/sendTo()/wrap() shape as notifyNewClient, ported
 * from voces-bds's lib/email.ts. Link targets updated to this repo's
 * /voces/admin/casting and /voces/admin/cantantes/casting panels.
 *
 * Not ported here (nothing in this batch calls it yet):
 *  - sendDigestForUser — reads voces_notification_queue (populated by
 *    lib/voces-notifications.ts's queueVocesEvent) and sends periodic
 *    digests; belongs to a future cron route, not any admin page in this
 *    batch.
 *
 * Deliberately a separate module from:
 *  - lib/email.ts — this repo's own Sivar Events ticketing emails, unrelated.
 *  - lib/voces-notifications.ts — just the digest queue insert.
 */

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_PROD = "Sivar Music <no-reply@sivarmusic.com>";
const FROM_DEV = "Sivar Music <onboarding@resend.dev>";
// VOCES_RESEND_FROM lets this be overridden independently of this repo's
// existing lib/email.ts sender; falls back to that file's NODE_ENV pattern.
const FROM =
  process.env.VOCES_RESEND_FROM ||
  (process.env.NODE_ENV === "production" ? FROM_PROD : FROM_DEV);

async function getInstantRecipients(
  col: "casting_cantante" | "casting_locutor" | "new_client"
): Promise<string[]> {
  try {
    const { data: prefs } = await supabase
      .from("voces_user_notification_prefs")
      .select("client_id")
      .eq(col, true);
    if (!prefs?.length) return [];
    const { data: clients } = await supabase
      .from("voces_clients")
      .select("email")
      .in("id", prefs.map((p) => p.client_id))
      .eq("active", true);
    return (clients ?? []).map((c) => c.email).filter(Boolean);
  } catch {
    return [];
  }
}

async function sendTo(to: string[], subject: string, html: string) {
  if (!process.env.RESEND_API_KEY || !to.length) return;
  await Promise.all(
    to.map((email) => resend.emails.send({ from: FROM, to: email, subject, html }))
  );
}

function wrap(content: string) {
  return `<div style="font-family:sans-serif;max-width:580px;margin:0 auto;background:#0a0a0b;color:#e8e4df;padding:32px 24px;border-radius:12px">
    <div style="margin-bottom:24px"><img src="https://sivarmusic.com/SMG%20PNG.png" alt="Sivar Music" style="height:28px"/></div>
    ${content}
    <div style="margin-top:32px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.08);font-size:12px;color:rgba(255,255,255,0.3)">
      Sivar Music · <a href="https://sivarmusic.com/voces/configuracion" style="color:rgba(255,255,255,0.3)">Configurar notificaciones</a>
    </div>
  </div>`;
}

function table(rows: { label: string; value: string }[]) {
  return `<table style="width:100%;border-collapse:collapse;font-size:14px">
    ${rows
      .map(
        (r) => `<tr>
      <td style="padding:7px 0;color:rgba(255,255,255,0.4);width:120px;vertical-align:top">${r.label}</td>
      <td style="padding:7px 0;color:#fff">${r.value}</td>
    </tr>`
      )
      .join("")}
  </table>`;
}

export async function notifyCastingCantante(data: { nombre: string; email: string; casting: string }) {
  const to = await getInstantRecipients("casting_cantante");
  if (!to.length) return;
  await sendTo(
    to,
    `Nueva postulación cantante — ${data.casting}`,
    wrap(`
    <h2 style="margin:0 0 8px;font-size:18px;color:#fff">Nueva postulación de cantante</h2>
    <p style="margin:0 0 20px;color:rgba(255,255,255,0.5);font-size:14px">Acaba de llegar una nueva respuesta al casting.</p>
    ${table([
      { label: "Casting", value: `<b>${data.casting}</b>` },
      { label: "Cantante", value: data.nombre },
      { label: "Email", value: data.email || "—" },
    ])}
    <a href="https://sivarmusic.com/voces/admin/cantantes/casting" style="display:inline-block;margin-top:20px;padding:10px 20px;background:rgb(232,76,43);color:#fff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:500">Ver postulaciones</a>
  `)
  );
}

export async function notifyCastingLocutor(data: { nombre: string; email: string; casting: string }) {
  const to = await getInstantRecipients("casting_locutor");
  if (!to.length) return;
  await sendTo(
    to,
    `Nueva postulación locutor — ${data.casting}`,
    wrap(`
    <h2 style="margin:0 0 8px;font-size:18px;color:#fff">Nueva postulación de locutor</h2>
    <p style="margin:0 0 20px;color:rgba(255,255,255,0.5);font-size:14px">Acaba de llegar una nueva respuesta al casting.</p>
    ${table([
      { label: "Casting", value: `<b>${data.casting}</b>` },
      { label: "Locutor", value: data.nombre },
      { label: "Email", value: data.email || "—" },
    ])}
    <a href="https://sivarmusic.com/voces/admin/casting" style="display:inline-block;margin-top:20px;padding:10px 20px;background:rgb(232,76,43);color:#fff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:500">Ver postulaciones</a>
  `)
  );
}

export async function notifyNewClient(data: { nombre: string; email: string }) {
  const to = await getInstantRecipients("new_client");
  if (!to.length) return;
  await sendTo(
    to,
    `Nuevo cliente registrado — ${data.nombre || data.email}`,
    wrap(`
    <h2 style="margin:0 0 8px;font-size:18px;color:#fff">Nuevo cliente registrado</h2>
    <p style="margin:0 0 20px;color:rgba(255,255,255,0.5);font-size:14px">Se registró un nuevo cliente en la plataforma.</p>
    ${table([
      { label: "Nombre", value: data.nombre || "—" },
      { label: "Email", value: data.email },
    ])}
    <a href="https://sivarmusic.com/voces/admin/clients" style="display:inline-block;margin-top:20px;padding:10px 20px;background:rgb(232,76,43);color:#fff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:500">Ver clientes</a>
  `)
  );
}
