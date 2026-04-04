import type { SoundForFilmsProject } from "../data/soundForFilmsProjects";

type SoundForFilmsHeroProps = {
  previewProject: SoundForFilmsProject;
  totalProjects: number;
};

function formatCount(value: number) {
  return value.toString().padStart(2, "0");
}

export default function SoundForFilmsHero({
  previewProject,
  totalProjects,
}: SoundForFilmsHeroProps) {
  return (
    <section className="relative isolate min-h-screen overflow-hidden bg-black text-white">
      <div className="absolute inset-0 bg-black" />

      <video
        className="absolute inset-0 h-full w-full scale-[1.02] object-cover"
        autoPlay
        muted
        loop
        playsInline
        controls={false}
        preload="auto"
      >
        <source src={previewProject.videoSrc} type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.76)_0%,rgba(0,0,0,0.32)_30%,rgba(0,0,0,0.18)_48%,rgba(0,0,0,0.84)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(214,207,191,0.18)_0%,transparent_42%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08)_0%,transparent_38%)]" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1600px] flex-col justify-end px-6 pb-10 pt-28 md:px-10 md:pb-14 md:pt-32">
        <div className="max-w-5xl space-y-5 md:space-y-7">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-white/55">
            Sivar Music Group
          </p>
          <h1 className="max-w-5xl text-[clamp(3.5rem,10vw,8.75rem)] font-black uppercase leading-[0.86] tracking-[-0.06em] text-white [text-shadow:0_16px_44px_rgba(0,0,0,0.55)]">
            Sound for Films
          </h1>
          <p className="max-w-3xl text-sm font-semibold uppercase tracking-[0.18em] text-[#d6cfbf] md:text-base">
            Cinematic sound, original music and audio storytelling for film
          </p>
          <p className="max-w-2xl text-base text-white/74 md:text-lg">
            A curated selection of film work, sound design and original scoring.
          </p>
        </div>

        <div className="mt-10 flex flex-col gap-5 md:mt-12 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <a
              href="#sound-for-films-showcase"
              className="inline-flex w-fit items-center gap-3 rounded-full border border-white/14 bg-black/35 px-5 py-3 text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-white transition hover:border-white/32 hover:bg-black/52"
            >
              Enter Reel
              <span aria-hidden>↓</span>
            </a>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-white/42">
              Fullscreen showcase with editable placeholders
            </p>
          </div>

          <div className="flex flex-col gap-3 text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-white/45 sm:flex-row sm:items-center sm:gap-6">
            <span>{formatCount(totalProjects)} selected works</span>
            <span>{previewProject.title}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
