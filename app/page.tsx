import HeaderNav from "./components/HeaderNav";

export default function Home() {
  const heroVideoSrc = "/video-portada-sivar-music-web.mp4";

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <video
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        controls={false}
      >
        <source src={heroVideoSrc} type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-black/45" />

      <HeaderNav />

      <div className="relative z-10 flex min-h-screen flex-col">
        <div className="relative z-10 mt-auto px-6 pb-14 md:px-12">
          <h1 className="max-w-xl text-5xl font-black uppercase leading-[0.9] tracking-tight drop-shadow-[0_6px_16px_rgba(0,0,0,0.45)] md:text-7xl">
            Sivar
            <br />
            Music
            <br />
            Group
          </h1>
        </div>
      </div>

    </main>
  );
}
