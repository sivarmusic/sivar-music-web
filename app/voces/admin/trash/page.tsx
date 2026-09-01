export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

// Reubicado a /voces/admin/papelera (etapa 2 del rediseño del admin). Queda
// este redirect para no romper links viejos (emails, marcadores).
export default function AdminTrashRedirect() {
  redirect("/voces/admin/papelera");
}
