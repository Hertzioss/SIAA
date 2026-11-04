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
        hostname: "data.escritorio.team",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "data.escritorio.team",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "escritorio-legal-supabase.bkczgx.easypanel.host",
        pathname: "/storage/v1/object/public/**",
      }
    ],
  },

};
export default nextConfig;