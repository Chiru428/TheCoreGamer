import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: "..",
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "shared.akamai.steamstatic.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
      { protocol: "https", hostname: "images.igdb.com" },
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "api.dicebear.com" },
      { protocol: "https", hostname: "assets.nintendo.com" },
    ],
  },



  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://pagead2.googlesyndication.com https://www.googletagmanager.com https://www.google-analytics.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://adservice.google.com https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https://res.cloudinary.com https://*.supabase.co https://pagead2.googlesyndication.com https://*.googleusercontent.com https://www.google.com https://www.gstatic.com https://images.unsplash.com https://shared.akamai.steamstatic.com https://images.igdb.com https://img.youtube.com https://api.dicebear.com https://assets.nintendo.com",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://res.cloudinary.com https://pagead2.googlesyndication.com https://www.google-analytics.com https://analytics.google.com https://googleads.g.doubleclick.net https://adservice.google.com https://api.igdb.com https://images.igdb.com https://id.twitch.tv https://*.sentry.io",
      "frame-src 'self' https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.youtube.com https://player.twitch.tv https://player.mux.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");

    // Allow the frontend origin to make cross-origin requests to the backend API.
    // CORS_ORIGIN is a dedicated env var pointing to the frontend URL.
    // We do NOT use NEXTAUTH_URL or SITE_URL — Vercel overrides those on the
    // backend project with the backend's own deployment URL.
    const frontendOrigin = (process.env.CORS_ORIGIN || "http://localhost:3000").replace(/\/$/, "");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy", value: csp },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
      {
        // CORS for all API routes — allows the frontend to make browser-side
        // cross-origin requests (e.g. SWR revalidation for polls, screenshots)
        // without hitting CORS preflight failures.
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: frontendOrigin },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,PATCH,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type,Authorization,x-csrf-token,x-internal-secret" },
          { key: "Access-Control-Allow-Credentials", value: "true" },
        ],
      },
    ];
  },
};

export default nextConfig;