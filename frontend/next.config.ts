import type { NextConfig } from 'next';
import path from 'path';
import bundleAnalyzer from '@next/bundle-analyzer';

const nextConfig: NextConfig = {
  compress: true, // B5 — enable gzip compression in production

  turbopack: {
    root: path.join(__dirname),
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**' },
      { protocol: 'https', hostname: '**.supabase.co', pathname: '/**' },
      ...(process.env.NEXT_PUBLIC_R2_HOST
        ? [{ protocol: 'https' as const, hostname: process.env.NEXT_PUBLIC_R2_HOST.replace(/^https?:\/\//, ''), pathname: '/**' }]
        : []),
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
      { protocol: 'https', hostname: '**.steamstatic.com', pathname: '/**' },
      { protocol: 'https', hostname: 'cdn.akamai.steamstatic.com', pathname: '/**' },
      { protocol: 'https', hostname: 'store.steampowered.com', pathname: '/**' },
      { protocol: 'https', hostname: '**.imgur.com', pathname: '/**' },
      { protocol: 'https', hostname: 'imgur.com', pathname: '/**' },
      { protocol: 'https', hostname: '**.googleusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'images.igdb.com', pathname: '/**' },
      { protocol: 'https', hostname: 'img.youtube.com', pathname: '/**' },
      { protocol: 'https', hostname: 'api.dicebear.com', pathname: '/**' },
      { protocol: 'https', hostname: 'assets.nintendo.com', pathname: '/**' },
      { protocol: 'https', hostname: 'upload.wikimedia.org', pathname: '/**' },

      { protocol: 'https', hostname: 'cdn2.steamgriddb.com', pathname: '/**' },
      { protocol: 'https', hostname: 'game.intel.com', pathname: '/**' },
      { protocol: 'https', hostname: 'images.steamusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'static.wikia.nocookie.net', pathname: '/**' },
      { protocol: 'https', hostname: '**.wikia.nocookie.net', pathname: '/**' },
      { protocol: 'https', hostname: '**.fandom.com', pathname: '/**' },
      { protocol: 'https', hostname: '**.gstatic.com', pathname: '/**' },
      { protocol: 'https', hostname: 'cdn.discordapp.com', pathname: '/**' },
      { protocol: 'https', hostname: 'cdn.discord.com', pathname: '/**' },
      { protocol: 'https', hostname: 'media0.giphy.com', pathname: '/**' },
      { protocol: 'https', hostname: 'media1.giphy.com', pathname: '/**' },
      { protocol: 'https', hostname: 'media2.giphy.com', pathname: '/**' },
      { protocol: 'https', hostname: 'media3.giphy.com', pathname: '/**' },
      { protocol: 'https', hostname: 'media4.giphy.com', pathname: '/**' },
      { protocol: 'https', hostname: 'm.media-amazon.com', pathname: '/**' },
      { protocol: 'https', hostname: 'xboxwire.thesourcemediaassets.com', pathname: '/**' },
    ],
  },
  async redirects() {
    return [
      { source: '/walkthroughs', destination: '/guides?type=Walkthrough', permanent: true },
      { source: '/walkthroughs/:slug', destination: '/guides/:slug', permanent: true },
      { source: '/mod-guides', destination: '/guides?type=Mod Guide', permanent: true },
      { source: '/mod-guides/:slug', destination: '/guides/:slug', permanent: true },
    ];
  },
  async rewrites() {
    const apiUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    return {
      beforeFiles: [
        {
          source: '/offline',
          destination: '/offline',
        },
        // Exact-match rules (no trailing segment) — must come BEFORE the :path* variants
        // so that bare POST /api/auth/register (etc.) are proxied to the backend
        // instead of falling through to NextAuth's [...nextauth] catch-all.
        {
          source: '/api/auth/2fa',
          destination: `${apiUrl}/api/auth/2fa`,
        },
        {
          source: '/api/auth/login',
          destination: `${apiUrl}/api/auth/login`,
        },
        {
          source: '/api/auth/register',
          destination: `${apiUrl}/api/auth/register`,
        },
        {
          source: '/api/auth/forgot-password',
          destination: `${apiUrl}/api/auth/forgot-password`,
        },
        {
          source: '/api/auth/reset-password',
          destination: `${apiUrl}/api/auth/reset-password`,
        },
        {
          source: '/api/auth/verify-email',
          destination: `${apiUrl}/api/auth/verify-email`,
        },
        {
          source: '/api/auth/oauth-sync',
          destination: `${apiUrl}/api/auth/oauth-sync`,
        },
        {
          source: '/api/auth/refresh',
          destination: `${apiUrl}/api/auth/refresh`,
        },
        // Wildcard rules — catch sub-paths like /api/auth/register/confirm etc.
        {
          source: '/api/auth/2fa/:path*',
          destination: `${apiUrl}/api/auth/2fa/:path*`,
        },
        {
          source: '/api/auth/login/:path*',
          destination: `${apiUrl}/api/auth/login/:path*`,
        },
        {
          source: '/api/auth/register/:path*',
          destination: `${apiUrl}/api/auth/register/:path*`,
        },
        {
          source: '/api/auth/forgot-password/:path*',
          destination: `${apiUrl}/api/auth/forgot-password/:path*`,
        },
        {
          source: '/api/auth/reset-password/:path*',
          destination: `${apiUrl}/api/auth/reset-password/:path*`,
        },
        {
          source: '/api/auth/verify-email/:path*',
          destination: `${apiUrl}/api/auth/verify-email/:path*`,
        },
        {
          source: '/api/auth/oauth-sync/:path*',
          destination: `${apiUrl}/api/auth/oauth-sync/:path*`,
        },
        {
          source: '/api/auth/refresh/:path*',
          destination: `${apiUrl}/api/auth/refresh/:path*`,
        },
      ],
      afterFiles: [],
      fallback: [
        {
          source: '/api/:path*',
          destination: `${apiUrl}/api/:path*`,
        },
      ],
    };
  },
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'" +
      " https://pagead2.googlesyndication.com" +
      " https://www.googletagmanager.com" +
      " https://www.google-analytics.com" +
      " https://googleads.g.doubleclick.net" +
      " https://tpc.googlesyndication.com" +
      " https://adservice.google.com" +
      " https://cdn.jsdelivr.net" +
      " https://www.clarity.ms" +
      " https://clarity.ms" +
      " https://scripts.clarity.ms",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://use.typekit.net https://p.typekit.net https://db.onlinewebfonts.com",
      "img-src 'self' data: blob:" +
      " https://res.cloudinary.com" +
      " https://*.supabase.co" +
      " https://pagead2.googlesyndication.com" +
      " https://*.googleusercontent.com" +
      " https://www.google.com" +
      " https://www.gstatic.com" +
      " https://images.unsplash.com" +
      " https://*.imgur.com" +
      " https://imgur.com" +
      " https://*.steamstatic.com" +
      " https://store.steampowered.com" +
      " https://images.igdb.com" +
      " https://img.youtube.com" +
      " https://api.dicebear.com" +
      " https://assets.nintendo.com" +
      " https://upload.wikimedia.org" +
      " https://cdn2.steamgriddb.com" +
      " https://game.intel.com" +
      " https://images.steamusercontent.com" +
      " https://static.wikia.nocookie.net" +
      " https://*.wikia.nocookie.net" +
      " https://*.fandom.com" +
      " https://*.gstatic.com" +
      " https://cdn.discordapp.com" +
      " https://cdn.discord.com" +
      (process.env.NEXT_PUBLIC_R2_HOST ? ` https://${process.env.NEXT_PUBLIC_R2_HOST.replace(/^https?:\/\//, '')}` : '') +
      " https://media0.giphy.com https://media1.giphy.com https://media2.giphy.com https://media3.giphy.com https://media4.giphy.com" +
      " https://m.media-amazon.com" +
      " https://xboxwire.thesourcemediaassets.com",
      "font-src 'self' https://fonts.gstatic.com https://use.typekit.net https://p.typekit.net https://db.onlinewebfonts.com",
      `connect-src 'self'` +
      ` https://res.cloudinary.com` +
      ` https://pagead2.googlesyndication.com` +
      ` https://www.google-analytics.com` +
      ` https://analytics.google.com` +
      ` https://googleads.g.doubleclick.net` +
      ` https://adservice.google.com` +
      ` https://api.igdb.com` +
      ` https://*.sentry.io` +
      ` https://raw.githubusercontent.com` +
      ` https://images.igdb.com` +
      ` https://game.intel.com` +
      ` https://fonts.googleapis.com` +
      ` https://fonts.gstatic.com` +
      ` https://www.googletagmanager.com` +
      ` https://images.unsplash.com` +
      ` https://*.imgur.com` +
      ` https://*.steamstatic.com` +
      ` https://use.typekit.net` +
      ` https://p.typekit.net` +
      ` https://*.algolia.net` +
      ` https://*.algolianet.com` +
      ` https://*.algolia.io` +
      ` https://*.clarity.ms` +
      (process.env.NEXT_PUBLIC_API_URL
        ? ` ${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')}`
        : '') +
      (process.env.NEXT_PUBLIC_R2_HOST
        ? ` https://${process.env.NEXT_PUBLIC_R2_HOST.replace(/^https?:\/\//, '')}`
        : ''),
      "frame-src 'self'" +
      " https://pagead2.googlesyndication.com" +
      " https://googleads.g.doubleclick.net" +
      " https://tpc.googlesyndication.com" +
      " https://www.youtube.com" +
      " https://player.mux.com",  // B5 — video embeds
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ');

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
      {
        source: '/(dashboard|settings|notifications)/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/(articles|reviews|news|guides|opinions|features|deals|lists|games|platforms|genres)/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=300, stale-while-revalidate=60' },
          { key: 'Surrogate-Control', value: 'max-age=300' },
        ],
      },
      {
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
      {
        source: '/(settings|admin)/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store, no-cache' }],
      },
    ];
  },
};

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default withBundleAnalyzer(nextConfig);