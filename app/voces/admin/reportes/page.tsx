export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/voces-session";
import ReporteClient from "@/app/voces/components/admin/reportes/ReporteClient";

// Ported from voces-bds's app/admin/reportes/page.tsx.
//
// Unlike every other page under app/voces/admin/*, this one is NOT gated by
// the client-side useAuth() + router.replace("/voces/login") pattern —
// deliberately, matching the original: it reads the admin session directly
// server-side and redirect()s before any client JS runs, so an
// unauthenticated request never even receives the report shell (the
// original's comment: "El middleware deja pasar /admin, así que la
// protección real vive acá y en la API" — same is true here, this repo's
// voces admin pages aren't gated by middleware either).
//  - Auth: reads voces_session via next/headers' headers(), wrapped in a
//    Request so it can be passed to getAdmin() (lib/voces-session.ts), which
//    verifies the HMAC signature and rereads is_admin from the DB — same
//    check as every app/api/voces/admin/* route, replacing the old
//    voces_admin cookie read.
//  - Redirect target: /login?next=/admin/reportes -> /voces/login?next=/voces/admin/reportes.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function defaultRange(): { desde: string; hasta: string } {
  const now = new Date();
  const desde = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const hasta = now.toISOString().slice(0, 10);
  return { desde, hasta };
}

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>;
}) {
  // Guard: solo admins. Igual que el original, la protección real vive acá
  // y en la API (/api/voces/reportes), no en middleware. Verifica firma de
  // sesión + is_admin en la fila, no la presencia de una cookie.
  const h = await headers();
  const admin = await getAdmin(new Request("http://local/", { headers: h }));
  if (!admin) {
    redirect("/voces/login?next=/voces/admin/reportes");
  }

  const sp = await searchParams;
  const def = defaultRange();
  const desde = sp.desde && DATE_RE.test(sp.desde) ? sp.desde : def.desde;
  const hasta = sp.hasta && DATE_RE.test(sp.hasta) ? sp.hasta : def.hasta;

  return <ReporteClient desde={desde} hasta={hasta} />;
}
