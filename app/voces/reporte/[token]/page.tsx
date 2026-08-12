import type { Metadata } from "next";
import ReporteClient from "@/app/voces/components/admin/reportes/ReporteClient";
import { verifyShareToken } from "@/lib/voces-reportes/shareToken";

export const dynamic = "force-dynamic";

// Es una URL pública con datos de negocio: que no la indexe nadie.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

// Ported from voces-bds's app/reporte/[token]/page.tsx: public, read-only
// view of a shared report. No session required — the token itself (signed,
// verified server-side via lib/voces-reportes/shareToken's verifyShareToken)
// is the authorization, and it carries its own date range, so the visitor
// only ever sees the exact report that was shared.
//  - lib/reportes/shareToken -> lib/voces-reportes/shareToken (already built
//    in batch 4b).
//  - app/components/reportes/ReporteClient -> this repo's already-ported
//    app/voces/components/admin/reportes/ReporteClient, which already
//    supports the `shareToken` prop (read-only mode: hides admin actions,
//    fetches via ?token= instead of ?desde&hasta) and already fetches from
//    app/api/voces/reportes/route.ts, which already serves both the
//    admin-cookie path and this public share-token path (batch 4b) — so this
//    page only needs to verify the token server-side for the invalid/expired
//    state and hand off to that existing client component.
export default async function ReporteCompartidoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const payload = verifyShareToken(token);

  if (!payload) {
    return (
      <main className="min-h-screen flex items-center justify-center px-5">
        <div className="ds-card p-8 max-w-[420px] text-center">
          <h1 className="text-[20px] font-[600] mb-2" style={{ color: "var(--color-text-primary)" }}>Link no disponible</h1>
          <p className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
            Este link de reporte es inválido o ya venció. Pedile a un administrador que genere uno nuevo.
          </p>
        </div>
      </main>
    );
  }

  return <ReporteClient desde={payload.d} hasta={payload.h} shareToken={token} />;
}
