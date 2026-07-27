import Header from '@/components/ui/Header';
import Footer from '@/components/ui/Footer';
import CookieBanner from '@/components/ui/CookieBanner';
import BackToTop from '@/components/ui/BackToTop';
import RouteTracker from '@/components/ui/RouteTracker';
import AdSlot from '@/components/monetization/AdSlot';
import SearchOverlay from '@/components/search/SearchOverlay';
import { fetchHomepage } from '@/lib/api';

// Hide all ad layer boxes when AdSense is not yet configured
const adsEnabled = !!process.env.NEXT_PUBLIC_ADSENSE_ID;

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  // Top ticker bar — breaking news takes priority, falls back to latest articles
  const homepage = await fetchHomepage().catch(() => null);
  const breaking = homepage?.data?.breaking ?? [];
  const latest = homepage?.data?.latest ?? [];
  const tickerArticles = (breaking.length > 0 ? breaking : latest).slice(0, 8);

  return (
    <>
      {/* A1 — Skip navigation link (WCAG 2.1 AA) */}
      <a href="#main-content" className="skip-nav">
        Skip to main content
      </a>

      <RouteTracker />

      <Header tickerArticles={tickerArticles} />
      <SearchOverlay />
      <main id="main-content" className="min-h-screen">{children}</main>


      {/* Footer Leaderboard Ad */}
      {adsEnabled && (
      <div className="w-full bg-[#D0D0D0] dark:bg-[#0A0A10] py-5 border-y border-black/5 dark:border-white/5 flex justify-center">
        <div className="w-full max-w-[970px] min-h-[250px] flex items-center justify-center px-4">
          <AdSlot slot="ADS-08" className="w-full" />
        </div>
      </div>
      )}

      <Footer />
      <BackToTop />
      <CookieBanner />
    </>
  );
}
