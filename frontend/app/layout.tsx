import type { Metadata } from 'next';
import Script from 'next/script';
import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import './globals.css';
import ToastContainer from '@/components/ui/Toast';
import UserProfileModal from '@/components/ui/UserProfileModal';
import SessionProvider from '@/components/ui/SessionProvider';
import WebVitals from '@/components/ui/WebVitals';
import ServiceWorkerRegistration from '@/components/ui/ServiceWorkerRegistration';
import ClarityScript from '@/components/shared/ClarityScript';
import ScrollRestoration from '@/components/ui/ScrollRestoration';
import { SITE_NAME, SITE_DESCRIPTION, SITE_URL } from '@/lib/constants';

const ADSENSE_PUB_ID = process.env.NEXT_PUBLIC_ADSENSE_ID;

export const metadata: Metadata = {
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  openGraph: { type: 'website', siteName: SITE_NAME, locale: 'en_US' },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        {/* Google Fonts — trimmed to fonts actually used in the design system.
            Roboto, Inter, Josefin Sans, Poppins, and Barlow were loaded but
            overridden by the local Calibre variable font for body text.
            Removing them saves ~6 network requests and unblocks first paint. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Google Fonts — only families actively used in the UI (Rajdhani for headings/badges, IBM Plex Sans for gaming-content blocks) */}
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:ital,wght@0,400;0,600;0,700;1,400&family=Rajdhani:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Adobe Fonts (Typekit) — Acumin Pro & Gibson, primary app fonts */}
        <link rel="stylesheet" href="https://use.typekit.net/vmc1rba.css" />

        {ADSENSE_PUB_ID && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUB_ID}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#080a0f" />
        <link rel="alternate" type="application/rss+xml" title="TheCoreGamer" href="/rss.xml" />
        <link rel="alternate" type="application/rss+xml" title="TheCoreGamer Reviews" href="/rss/reviews.xml" />
        <link rel="alternate" type="application/rss+xml" title="TheCoreGamer News" href="/rss/news.xml" />
        <link rel="alternate" type="application/rss+xml" title="TheCoreGamer Deals" href="/rss/deals.xml" />
        <link rel="alternate" type="application/rss+xml" title="TheCoreGamer Guides" href="/rss/guides.xml" />
        <link rel="alternate" type="application/rss+xml" title="TheCoreGamer Features" href="/rss/features.xml" />
      </head>
      <body className="font-sans antialiased bg-bg-primary text-text-primary">
        {/* Theme hydration script */}
        <Script id="theme-hydration" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: `
          (function(){try{var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}})();
        `}} />
        {/* NextAuth session provider + Zustand bridge */}
        <NextAuthSessionProvider>
          <SessionProvider />
          <div>
            {children}
          </div>
        </NextAuthSessionProvider>
        <ToastContainer />
        <UserProfileModal />
        {/* B7 — Core Web Vitals reporting to GA4 */}
        <WebVitals />
        <ServiceWorkerRegistration />
        <ScrollRestoration />
        <ClarityScript />
      </body>
    </html>
  );
}
