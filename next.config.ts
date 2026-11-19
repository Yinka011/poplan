import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [
      { source: "/landing", destination: "/", permanent: false },
      { source: "/login/organizer", destination: "/organizer", permanent: false },
      { source: "/login/organizer/:path*", destination: "/organizer/:path*", permanent: false },
      { source: "/login/brand", destination: "/brand", permanent: false },
      { source: "/login/brand/:path*", destination: "/brand/:path*", permanent: false },
    ];
  },
};

export default nextConfig;
