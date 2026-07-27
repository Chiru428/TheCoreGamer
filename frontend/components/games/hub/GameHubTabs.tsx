'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { GameHubData } from '@/types';
import OverviewTab from './OverviewTab';
import ReviewsTab from './ReviewsTab';
import ArticlesTab from './ArticlesTab';
import ScreenshotsTab from './ScreenshotsTab';
import DlcTab from './DlcTab';
import SimilarTab from './SimilarTab';
import PricesTab from './PricesTab';
import styles from './gamehub.module.css';

type TabId = 'overview' | 'reviews' | 'articles' | 'media' | 'dlc' | 'prices' | 'similar';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'articles', label: 'Articles' },
  { id: 'media', label: 'Media' },
  { id: 'dlc', label: 'DLC & Editions' },
  { id: 'prices', label: 'Prices' },
  { id: 'similar', label: 'Similar' },
];

const TAB_IDS = TABS.map((t) => t.id);

function isTabId(value: string | null): value is TabId {
  return !!value && (TAB_IDS as string[]).includes(value);
}

export default function GameHubTabs({ game, slug }: { game: GameHubData; slug: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get('tab');
  const [active, setActive] = useState<TabId>(isTabId(tabParam) ? tabParam : 'overview');

  // Sync state if URL changes (e.g., from clicking 'Write a Review' Link in GameHero)
  useEffect(() => {
    const currentTab = searchParams.get('tab');
    if (isTabId(currentTab)) {
      setActive(currentTab);
    } else {
      setActive('overview');
    }
  }, [searchParams]);

  const selectTab = (tab: TabId) => {
    setActive(tab);
    const sp = new URLSearchParams(searchParams.toString());
    if (tab === 'overview') sp.delete('tab');
    else sp.set('tab', tab);
    router.replace(sp.toString() ? `${pathname}?${sp.toString()}` : pathname, { scroll: false });
  };

  return (
    <>
      <nav 
        className="w-full bg-[#2453A4] sticky z-30 shadow-lg" 
        style={{ top: 'var(--sticky-offset, 90px)' }}
        aria-label="Game sections"
      >
        <div className="max-w-[1280px] mx-auto px-4 lg:px-8 h-[50px] flex overflow-x-auto whitespace-nowrap [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={active === tab.id}
              className={`flex items-center px-4 md:px-5 h-full font-bold text-[13px] uppercase tracking-wide border-b-4 transition-colors flex-shrink-0 ${
                active === tab.id 
                  ? 'text-white border-white' 
                  : 'text-white/70 border-transparent hover:text-white hover:border-white/50'
              }`}
              onClick={() => selectTab(tab.id)}
            >
              {tab.label}
              {tab.id === 'articles' && game.articlesCount > 0 && ` (${game.articlesCount})`}
              {tab.id === 'prices' && game.priceData.length > 0 && ` (${game.priceData.length})`}
            </button>
          ))}
        </div>
      </nav>

      {/* Only the active tab mounts — content is fetched lazily via SWR
          inside each tab, and SWR's cache keeps data across switches. */}
      <div className={styles.tabContent}>
        {active === 'overview' && <OverviewTab game={game} onWriteReview={() => selectTab('reviews')} />}
        {active === 'reviews' && <ReviewsTab game={game} slug={slug} />}
        {active === 'articles' && <ArticlesTab game={game} slug={slug} />}
        {active === 'media' && <ScreenshotsTab slug={slug} game={game} />}
        {active === 'dlc' && <DlcTab game={game} />}
        {active === 'prices' && <PricesTab game={game} slug={slug} />}
        {active === 'similar' && <SimilarTab game={game} />}
      </div>
    </>
  );
}
