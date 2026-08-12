import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { verifyAdminSession } from "@/lib/pinkfest-auth";
import GateToggle from "./GateToggle";

export const metadata: Metadata = {
  title: "Sound for Films · Acceso | Sivar Music",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function SoundForFilmsAdminPage() {
  const user = await verifyAdminSession();
  if (!user) {
    redirect("/pinkfest/admin/login");
  }

  const { data } = await supabase
    .from("sound_for_films_settings")
    .select("gate_enabled, password_hash")
    .eq("id", 1)
    .maybeSingle();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 bg-black px-6 py-16 text-center text-white">
      <div className="flex flex-col gap-2">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.36em] text-white/40">
          Sivar Music Group
        </p>
        <h1 className="text-3xl font-black uppercase tracking-[-0.03em]">
          Sound for Films
        </h1>
        <p className="text-xs uppercase tracking-[0.28em] text-[#d6cfbf]/60">
          Control de acceso
        </p>
      </div>

      <GateToggle
        initialEnabled={data?.gate_enabled !== false}
        initialHasPassword={Boolean(data?.password_hash)}
      />

      <Link
        href="/sound-for-films"
        className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-white/40 transition hover:text-white/70"
      >
        Ver portfolio
      </Link>
    </main>
  );
}
