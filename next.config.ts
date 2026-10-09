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
  async headers() {
    // Headers de seguridad globales. Sin CSP enforcing. La cámara queda
    // permitida en el mismo origen: el escáner de QR del admin la necesita.
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
  async redirects() {
    // Pink Fest ya no existe como módulo: los links viejos van al listado.
    return [
      { source: '/pinkfest/:path*', destination: '/eventos', permanent: false },
    ];
  },
  async rewrites() {
    return [
      { source: '/ruidosa', destination: '/ruidosa/index.html' },
      // El HTML de /ruidosa referencia sus archivos con rutas relativas
      // ("img/...", "audio/..."). Servido en /ruidosa (sin barra final), el
      // navegador las resuelve contra "/", así que se redirigen a su carpeta.
      { source: '/img/:path*', destination: '/ruidosa/img/:path*' },
      { source: '/audio/:path*', destination: '/ruidosa/audio/:path*' },
      // La misma página, bajo el perfil de la artista. Servida en
      // /artists/vanessa-garcia/fyc-ruidosa, las rutas relativas se resuelven
      // contra /artists/vanessa-garcia/, así que también se redirigen.
      { source: '/artists/vanessa-garcia/fyc-ruidosa', destination: '/ruidosa/index.html' },
      { source: '/artists/vanessa-garcia/img/:path*', destination: '/ruidosa/img/:path*' },
      { source: '/artists/vanessa-garcia/audio/:path*', destination: '/ruidosa/audio/:path*' },
    ];
  },
};

export default nextConfig;
