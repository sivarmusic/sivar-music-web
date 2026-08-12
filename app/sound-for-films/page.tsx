import type { Metadata } from "next";
import HeaderNav from "../components/HeaderNav";
import SoundForFilmsShowcase from "../components/SoundForFilmsShowcase";
import { getSoundForFilmsProjects } from "../data/soundForFilmsProjects";

export const metadata: Metadata = {
  title: "Sound for Films | Sivar Music",
  description:
    "Cinematic sound, original music and audio storytelling for film.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

// Video URLs are signed per request and expire, so this page cannot be cached.
export const dynamic = "force-dynamic";

export default async function SoundForFilmsPage() {
  const soundForFilmsProjects = await getSoundForFilmsProjects();

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(214,207,191,0.12)_0%,transparent_30%)]" />

      <HeaderNav
        logoSizeClassName="w-[92px] sm:w-[124px] md:w-[147px]"
        logoSizes="(min-width: 768px) 147px, (min-width: 640px) 124px, 92px"
      />

      <div className="relative z-10">
        <SoundForFilmsShowcase projects={soundForFilmsProjects} />
      </div>
    </main>
  );
}
