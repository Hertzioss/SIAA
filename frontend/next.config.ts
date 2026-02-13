import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "desarrollo-siaa-db.jnvzha.easypanel.host",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "data.escritorio.legal",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://escritorio.legal; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https://desarrollo-siaa-db.jnvzha.easypanel.host https://data.escritorio.legal; font-src 'self' data:; connect-src 'self' https://data.escritorio.legal https://ve.dolarapi.com https://desarrollo-siaa-db.jnvzha.easypanel.host;",
          },
        ],
      },
    ];
  },
};
export default nextConfig;