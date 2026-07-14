/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "off",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self), interest-cohort=()",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
        ],
      },
      {
        source: "/api/laporan/kongsi/:token/pdf",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store",
          },
        ],
      },
      {
        source: "/share/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
