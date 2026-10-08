import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'mthpqfiozddtohkcrbui.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async rewrites() {
    return [
      { source: '/ruidosa', destination: '/ruidosa/index.html' },
      // El HTML de /ruidosa referencia sus archivos con rutas relativas
      // ("img/...", "audio/..."). Servido en /ruidosa (sin barra final), el
      // navegador las resuelve contra "/", así que se redirigen a su carpeta.
      { source: '/img/:path*', destination: '/ruidosa/img/:path*' },
      { source: '/audio/:path*', destination: '/ruidosa/audio/:path*' },
    ];
  },
};

export default nextConfig;
