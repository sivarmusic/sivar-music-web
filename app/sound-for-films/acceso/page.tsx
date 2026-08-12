import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import AccessForm from "./AccessForm";
import {
  GATE_COOKIE,
  getGateSettings,
  verifyAccessToken,
} from "@/lib/sound-for-films-gate";

export const metadata: Metadata = {
  title: "Sound for Films | Sivar Music",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function SoundForFilmsAccessPage() {
  const settings = await getGateSettings();

  if (!settings.gateEnabled) {
    redirect("/sound-for-films");
  }

  const cookieStore = await cookies();
  if (await verifyAccessToken(cookieStore.get(GATE_COOKIE)?.value)) {
    redirect("/sound-for-films");
  }

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(214,207,191,0.10)_0%,transparent_40%)]" />

      <div className="relative z-10 flex flex-col items-center gap-8 px-6 text-center">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.36em] text-white/40">
          Sivar Music Group
        </p>

        <h1 className="text-[clamp(2.8rem,9vw,6rem)] font-black uppercase leading-[0.88] tracking-[-0.05em] text-white">
          Sound for Films
        </h1>

        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[#d6cfbf]/60">
          Acceso restringido
        </p>

        <AccessForm />
      </div>
    </div>
  );
}
