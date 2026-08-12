export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { redirect } from "next/navigation";

// Ported from voces-bds's app/admin/login/page.tsx: redirects to the regular
// login flow (if the client is an admin, /api/voces/client/login already
// sets both voces_client and voces_admin cookies — no separate admin login).
export default function AdminLoginPage() {
  redirect("/voces/login?next=/voces/admin/clients");
}
