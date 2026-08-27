export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

// Reubicado a /voces/admin/castings/locutores/candidates/[id] (etapa 2 del
// rediseño del admin). Queda este redirect para no romper links viejos
// (emails, marcadores).
export default async function AdminCastingCandidatesRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/voces/admin/castings/locutores/candidates/${id}`);
}
