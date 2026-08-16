'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { ExternalLink, CalendarDays, ShieldCheck } from 'lucide-react';
import { FaWindows } from 'react-icons/fa';
import { getAlgoliaUserToken, sendAlgoliaEvent } from '@/lib/algolia';
import { trackClarityEvent } from '@/lib/clarity';
import { formatRelativeDate } from '@/lib/utils';
import type { GameHubData, GamePriceEntry } from '@/types';
import PriceHistoryChart from '@/components/deals/PriceHistoryChart';
import styles from './gamehub.module.css';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

/** Tracks the affiliate click via the frontend proxy (injects UTM + records IP), then opens the store */
async function handleBuyClick(price: GamePriceEntry, gameSlug: string, gameId: string, userToken: string) {
  trackClarityEvent('game_buy_click');
  try {
    const res = await fetch('/api/analytics/deal-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: price.url, store: price.shop, gameSlug }),
    });
    const json = await res.json();

    sendAlgoliaEvent({
      eventType: 'conversion',
      eventName: 'Deal Clicked',
      index: 'games',
      objectIDs: [`game_${gameId}`],
      userToken,
    });

    window.open(json.redirectUrl || price.url, '_blank', 'noopener,noreferrer');
  } catch {
    window.open(price.url, '_blank', 'noopener,noreferrer');
  }
}

function getStoreColor(storeName: string): string {
  const name = storeName.toLowerCase();
  // Format: "lightHex,darkHex borderClass"
  if (name.includes('epic')) return '#f1f5f9,#2a2a2a border-l-[#2b6bc9]'; // slate-100
  if (name.includes('greenman') || name.includes('gmg')) return '#dcfce7,#242e25 border-l-[#32a852]'; // green-100
  if (name.includes('fanatical')) return '#ffedd5,#302621 border-l-[#f97316]'; // orange-100
  if (name.includes('humble')) return '#fee2e2,#2e2324 border-l-[#ef4444]'; // red-100
  if (name.includes('steam')) return '#e0f2fe,#232933 border-l-[#0ea5e9]'; // sky-100
  if (name.includes('gog')) return '#f3e8ff,#2c2236 border-l-[#a855f7]'; // purple-100
  if (name.includes('planetplay')) return '#ccfbf1,#22292f border-l-[#14b8a6]'; // teal-100
  if (name.includes('gamesplanet')) return '#e0e7ff,#1e293b border-l-[#6366f1]'; // indigo-100
  if (name.includes('gamebillet')) return '#fef9c3,#2a2a2a border-l-[#eab308]'; // yellow-100
  if (name.includes('microsoft')) return '#d1fae5,#242e25 border-l-[#10b981]'; // emerald-100
  if (name.includes('indiegala')) return '#ffe4e6,#2e2324 border-l-[#dc2626]'; // rose-100
  if (name.includes('gamersgate')) return '#bae6fd,#22292f border-l-[#38bdf8]'; // sky-200
  if (name.includes('ea store') || name.includes('origin')) return '#ffedd5,#2e2324 border-l-[#f97316]'; // orange-100
  if (name.includes('nuuvem')) return '#dbeafe,#1e293b border-l-[#3b82f6]'; // blue-100
  return '#f3f4f6,#262626 border-l-gray-500'; // gray-100
}

const STORE_BRAND_COLORS: Record<string, string> = {
  Steam: '#38bdf8',
  Epic: '#6366f1',
  'Epic Game Store': '#6366f1',
  GOG: '#a855f7',
  Humble: '#ef4444',
  GameBillet: '#fbbf24',
  GreenManGaming: '#4ade80',
  Fanatical: '#fb923c',
  Microsoft: '#10b981',
  IndieGala: '#f43f5e',
  GamersGate: '#60a5fa',
  Nuuvem: '#3b82f6',
  JoyBuggy: '#a3e635',
  AllYouPlay: '#d946ef',
  WinGameStore: '#818cf8',
};

const DEFAULT_COLORS = ['#38bdf8', '#fbbf24', '#f472b6', '#a855f7', '#4ade80', '#fb923c', '#ef4444', '#10b981', '#f43f5e'];

function getStoreHexColor(shop: string, index: number = 0) {
  const shopLower = shop.toLowerCase();
  for (const key of Object.keys(STORE_BRAND_COLORS)) {
    if (shopLower.includes(key.toLowerCase())) {
      return STORE_BRAND_COLORS[key];
    }
  }
  return DEFAULT_COLORS[index % DEFAULT_COLORS.length];
}

function formatTimeLeft(expiryString: string) {
  const expiry = new Date(expiryString).getTime();
  const now = Date.now();
  const diff = expiry - now;
  if (diff <= 0) return 'Expired';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const mins = Math.floor((diff / 1000 / 60) % 60);
  
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export default function PricesTab({ game, slug }: { game: GameHubData; slug: string }) {
  const { data: session } = useSession();

  const [prices, setPrices] = useState<GamePriceEntry[]>(
    [...(game.priceData ?? [])].sort((a, b) => a.priceINR - b.priceINR)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historicalLows, setHistoricalLows] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`${API_BASE}/api/deals/prices?gameId=${encodeURIComponent(game.id)}`, {
      cache: 'no-store',
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        const items: GamePriceEntry[] = [];
        const lows: Record<string, number> = {};
        
        for (const s of (json?.data ?? [])) {
          items.push({
            shop: s.shop,
            priceINR: Number(s.priceINR),
            regularINR: s.regularINR != null ? Number(s.regularINR) : undefined,
            cutPercent: Number(s.cutPercent),
            voucher: s.voucher,
            expiry: s.expiry,
            drm: s.drm,
            url: s.url,
            recordedAt: s.recordedAt,
          });
          lows[s.shop] = s.historicalLow;
        }
        
        setPrices(items.sort((a, b) => a.priceINR - b.priceINR));
        setHistoricalLows(lows);
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn('[PricesTab] Failed to fetch live prices:', err);
        setError('Could not refresh prices — showing last known data.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [game.id]);

  if (prices.length === 0 && !loading) {
    return <div className="text-center py-12 text-gray-400 bg-[#1a1a1a] border border-dashed border-white/10 rounded-none">No price data tracked yet for {game.title}.</div>;
  }

  return (
    <div>
      <div className="section-title-bar">
        All Prices {prices.length > 0 && `(${prices.length})`}
        {loading && (
          <span className="ml-2 text-xs font-normal opacity-60 animate-pulse">Refreshing…</span>
        )}
      </div>

      {error && (
        <p className="text-xs text-amber-400 mb-3 px-1">{error}</p>
      )}

      <div className={`w-full rounded-none overflow-hidden ${styles.contentCard} !p-0`}>
        {/* Header */}
        <div className="hidden md:grid grid-cols-[3fr_2fr_3fr_4fr] gap-4 p-3 bg-[#2453A4] border-b border-[#183973] text-xs font-bold text-white uppercase tracking-wider">
          <div>Store</div>
          <div>Platforms</div>
          <div className="text-center">Store Low</div>
          <div className="text-right">Current</div>
        </div>

        {/* Rows */}
        <div className="flex flex-col">
          {prices.map((price, i) => {
            const storeLow = historicalLows[price.shop] ?? price.priceINR;
            const diff = price.priceINR - storeLow;
            const isHistoricalLow = diff <= 0;
            
            // Parse store styling
            const styleClasses = getStoreColor(price.shop);
            const [bgColors, borderColor] = styleClasses.split(' ');
            const [lightBg, darkBg] = bgColors.split(',');

            return (
              <div 
                key={price.shop + i} 
                className={`relative group flex flex-row justify-between md:grid md:grid-cols-[3fr_2fr_3fr_4fr] gap-2 md:gap-4 items-center p-3 md:px-4 md:py-3 border-b border-gray-100 dark:border-white/5 transition-colors cursor-pointer border-l-4 ${borderColor} bg-transparent hover:bg-black/5 dark:hover:bg-white/5`}
                style={{ '--store-bg-light': lightBg, '--store-bg-dark': darkBg } as any}
                onClick={() => handleBuyClick(price, slug, game.id, getAlgoliaUserToken(session?.user?.id))}
              >
                
                {/* Store & Mobile Badges */}
                <div className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-gray-900 dark:text-white text-[15px]">{price.shop}</span>
                    <div 
                      className="w-2.5 h-2.5 rounded-full shadow-sm" 
                      style={{ backgroundColor: getStoreHexColor(price.shop, i) }} 
                    />
                    <FaWindows size={14} className="md:hidden text-gray-400 ml-1" />
                  </div>
                  {price.drm && (
                    <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                      <ShieldCheck size={12} />
                      {price.drm}
                    </div>
                  )}
                  {/* Mobile Store Low (Hidden on Desktop) */}
                  <div className="flex md:hidden items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold">Store Low:</span>
                    <span className="text-amber-600 dark:text-[#eab308] font-bold text-[11px]">₹{storeLow.toFixed(2)}</span>
                    {!isHistoricalLow && (
                      <span className="text-[9px] text-gray-400">(−₹{diff.toFixed(2)})</span>
                    )}
                  </div>
                  
                  {/* Mobile Badges (Hidden on Desktop) */}
                  <div className="flex md:hidden flex-wrap items-center gap-1.5 mt-1">
                    {price.voucher && (
                      <div className="bg-blue-50 dark:bg-[#474f63] text-blue-700 dark:text-blue-100 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 uppercase tracking-wider">
                        {price.voucher}
                      </div>
                    )}

                  </div>
                </div>

                {/* Platforms */}
                <div className="hidden md:flex items-center text-gray-400">
                  <FaWindows size={16} />
                </div>

                {/* Store Low */}
                <div className="hidden md:flex flex-col items-center justify-center">
                  <div className="text-amber-600 dark:text-[#eab308] font-bold text-sm">₹{storeLow.toFixed(2)}</div>
                  {isHistoricalLow ? (
                    <div className="text-xs text-amber-600 dark:text-[#eab308]">same</div>
                  ) : (
                    <div className="text-xs text-gray-500 dark:text-gray-400">lower by ₹{diff.toFixed(2)}</div>
                  )}
                </div>

                {/* Desktop Badges & Price */}
                <div className="flex items-center justify-end gap-2 md:gap-4">
                  {/* Badges/Vouchers (Hidden on Mobile) */}
                  <div className="hidden md:flex flex-col items-end gap-1.5">
                    <div className="flex items-center gap-2">
                      {price.voucher && (
                        <div className="bg-blue-50 dark:bg-[#474f63] text-blue-700 dark:text-blue-100 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 uppercase tracking-wider">
                          {price.voucher}
                        </div>
                      )}
                      {price.cutPercent > 0 && (
                        <div className="bg-gray-100 dark:bg-white text-gray-900 dark:text-black font-bold text-xs px-1.5 py-0.5 rounded border border-black dark:border-transparent">
                          -{price.cutPercent}%
                        </div>
                      )}
                      {isHistoricalLow && (
                        <div className="bg-[#0ea5e9] text-white font-bold text-xs px-1.5 py-0.5 rounded" title="Lowest store price">
                          S
                        </div>
                      )}
                    </div>
                    {price.expiry && (
                      <div className="flex items-center gap-1 text-[11px] text-red-500 dark:text-red-400 font-medium">
                        <CalendarDays size={12} />
                        {formatTimeLeft(price.expiry)}
                      </div>
                    )}
                  </div>
                  
                  {/* Price Block */}
                  <div className="flex flex-col items-end min-w-[70px] md:min-w-[90px]">
                    <span className="md:hidden text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold mb-0.5">Current Price</span>
                    <div className="flex items-center gap-2">
                      {/* Show discount next to price on mobile only (it's in the badge stack on desktop) */}
                      {price.cutPercent > 0 && (
                        <div className="md:hidden bg-gray-100 dark:bg-white text-gray-900 dark:text-black font-bold text-[10px] px-1.5 py-0.5 rounded border border-black dark:border-transparent">
                          -{price.cutPercent}%
                        </div>
                      )}
                      {isHistoricalLow && (
                        <div className="md:hidden bg-[#0ea5e9] text-white font-bold text-[10px] px-1.5 py-0.5 rounded" title="Lowest store price">
                          S
                        </div>
                      )}
                      <div className="text-gray-900 dark:text-white font-bold text-lg md:text-xl">
                        {price.priceINR === 0 ? 'Free' : `₹${price.priceINR.toFixed(2)}`}
                      </div>
                    </div>
                    {/* Mobile: Timer + Regular Price Row */}
                    <div className="flex md:hidden items-center justify-end gap-4 mt-0.5">
                      {price.expiry && (
                        <div className="flex items-center gap-1 text-[10px] text-red-500 dark:text-red-400 font-medium">
                          <CalendarDays size={10} />
                          {formatTimeLeft(price.expiry)}
                        </div>
                      )}
                      {price.regularINR && price.regularINR > price.priceINR && (
                        <div className="text-gray-400 text-[11px] line-through">
                          ₹{price.regularINR.toFixed(2)}
                        </div>
                      )}
                    </div>
                    
                    {/* Desktop: Regular Price Row */}
                    {price.regularINR && price.regularINR > price.priceINR && (
                      <div className="hidden md:block text-gray-400 text-xs line-through mb-0.5">
                        ₹{price.regularINR.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-8">
        <div className="section-title-bar">Price History</div>
        <PriceHistoryChart gameId={game.id} gameTitle={game.title} />
      </div>
    </div>
  );
}
