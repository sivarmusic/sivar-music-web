import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { verifyAdminSession } from "@/lib/pinkfest-auth";
import ArtistManager from "./ArtistManager";

export const metadata: Metadata = {
  title: "Artistas · Admin | Sivar Music",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ArtistsAdminPage() {
  const user = await verifyAdminSession();
  if (!user) {
    redirect("/admin/login");
  }

  const { data: artists } = await supabase
    .from("artists")
    .select(
      "id, slug, name, genre, summary, profile_paragraphs, profile_highlights, visible, sort_order"
    )
    .order("sort_order", { ascending: true });

  return (
    <main className="flex min-h-screen flex-col items-center gap-10 bg-black px-6 py-16 text-center text-white">
      <div className="flex flex-col gap-2">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.36em] text-white/40">
          Sivar Music Group
        </p>
        <h1 className="text-3xl font-black uppercase tracking-[-0.03em]">
          Artistas
        </h1>
        <p className="text-xs uppercase tracking-[0.28em] text-[#d6cfbf]/60">
          Roster del sello
        </p>
      </div>

      <ArtistManager initialArtists={artists ?? []} />

      <Link
        href="/artists"
        className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-white/40 transition hover:text-white/70"
      >
        Ver página pública
      </Link>
    </main>
  );
}
