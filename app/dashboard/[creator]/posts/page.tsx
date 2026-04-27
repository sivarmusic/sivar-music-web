import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCreatorBySlug, formatFollowers } from "@/lib/creators";

export default async function PostsPage({
  params,
}: {
  params: Promise<{ creator: string }>;
}) {
  const { creator: slug } = await params;
  const cookieStore = await cookies();
  const session = cookieStore.get("creator_session")?.value;
  if (!session || slug !== session) redirect(`/dashboard/${session ?? ""}`);

  const creator = getCreatorBySlug(session);
  if (!creator) redirect("/members");

  return (
    <div className="pt-14 lg:pt-0">
      <div className="mb-8">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-white/30">
          Análisis de contenido
        </p>
        <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">
          Mis posts
        </h1>
      </div>

      {/* Post type tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {["Todos", "Reels", "Carruseles", "Fotos"].map((tab, i) => (
          <button
            key={tab}
            className={`rounded-full px-4 py-2 text-[0.7rem] font-semibold transition ${
              i === 0
                ? "bg-white text-black"
                : "border border-white/10 text-white/40 hover:text-white/70"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Top hashtags */}
      <div className="mb-5 rounded-2xl border border-white/8 bg-white/3 p-5">
        <p className="mb-4 text-[0.65rem] font-black uppercase tracking-[0.24em] text-white/40">
          Hashtags que más engagement te traen
        </p>
        <div className="flex flex-wrap gap-2">
          {creator.topHashtags.map((h) => (
            <div
              key={h.tag}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5"
            >
              <span className="text-[0.72rem] font-bold text-white/80">
                {h.tag}
              </span>
              <span className="ml-1.5 text-[0.65rem] text-white/35">
                {formatFollowers(h.avgEngagement)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Series detectadas */}
      <div className="mb-5 rounded-2xl border border-white/8 bg-white/3 p-5">
        <div className="mb-1 flex items-center gap-2">
          <span>🎯</span>
          <p className="text-[0.7rem] font-black uppercase tracking-[0.2em] text-white/50">
            Tus series detectadas
          </p>
        </div>
        <p className="mb-4 text-[0.65rem] text-white/25">
          Por hashtags repetidos · rankeadas por performance
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {creator.topHashtags.slice(0, 4).map((h) => (
            <div
              key={h.tag}
              className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/3 p-3"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/8 text-[0.65rem] font-bold text-white/60">
                {h.tag.replace("#", "").slice(0, 3).toUpperCase()}
              </div>
              <div>
                <p className="text-[0.8rem] font-bold text-white">{h.tag}</p>
                <p className="text-[0.65rem] text-white/40">
                  {formatFollowers(h.avgEngagement)} eng prom
                </p>
                <p className="text-[0.65rem] font-semibold text-amber-400">
                  🔥 {h.multiplier}x tu mediana
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top posts */}
      <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
        <p className="mb-4 text-[0.7rem] font-black uppercase tracking-[0.2em] text-white/50">
          Top Posts
        </p>
        <div className="flex flex-col gap-4">
          {creator.topPosts.map((post) => (
            <div
              key={post.id}
              className="flex gap-4 rounded-xl border border-white/6 bg-white/3 p-4"
            >
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white/8 text-2xl">
                {post.type === "reel" ? "▶" : post.type === "carousel" ? "▦" : "◻"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-[0.65rem] text-white/30">
                  {new Date(post.date).toLocaleDateString("es-CO", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                  {" · "}
                  <span className="capitalize">{post.platform}</span>
                  {" · "}
                  <span className="capitalize">{post.type}</span>
                </p>
                <p className="mb-2 line-clamp-2 text-[0.8rem] font-semibold leading-snug text-white/80">
                  {post.caption}
                </p>
                <div className="flex flex-wrap gap-3 text-[0.65rem]">
                  <span className="text-white/45">
                    👁 {formatFollowers(post.views)}
                  </span>
                  <span className="text-white/45">
                    ♡ {formatFollowers(post.likes)}
                  </span>
                  <span className="text-white/45">
                    💬 {post.comments.toLocaleString()}
                  </span>
                  <span className="font-semibold text-emerald-400">
                    ER {post.er}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
