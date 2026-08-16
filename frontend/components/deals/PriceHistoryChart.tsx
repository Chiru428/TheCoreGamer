'use client';
import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { fetchPriceHistory } from '@/lib/api';

interface Props { gameId: string; gameTitle: string; }

const STORE_COLOURS: Record<string, string> = {
  Steam: '#38bdf8', // light blue
  Epic: '#6366f1', // indigo
  'Epic Game Store': '#6366f1',
  GOG: '#a855f7', // purple
  Humble: '#ef4444', // red
  GameBillet: '#fbbf24', // yellow
  GreenManGaming: '#4ade80', // green
  Fanatical: '#fb923c', // orange
  Microsoft: '#10b981', // emerald
  IndieGala: '#f43f5e', // rose
  GamersGate: '#60a5fa',
  Nuuvem: '#3b82f6',
  JoyBuggy: '#a3e635',
  AllYouPlay: '#d946ef',
  WinGameStore: '#818cf8',
};

const DEFAULT_COLORS = ['#38bdf8', '#fbbf24', '#f472b6', '#a855f7', '#4ade80', '#fb923c', '#ef4444', '#10b981', '#f43f5e'];

function getStoreColor(shop: string, index: number) {
  const shopLower = shop.toLowerCase();
  for (const key of Object.keys(STORE_COLOURS)) {
    if (shopLower.includes(key.toLowerCase())) {
      return STORE_COLOURS[key];
    }
  }
  return DEFAULT_COLORS[index % DEFAULT_COLORS.length];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const sorted = [...payload].sort((a, b) => b.value - a.value);
    
    // Attempt to parse label as date to format nicely like "Wednesday, 8 Apr 2026"
    let formattedDate = label;
    try {
      const d = new Date(label);
      if (!isNaN(d.getTime())) {
        const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
        const day = d.getDate();
        const month = d.toLocaleDateString('en-US', { month: 'short' });
        const year = d.getFullYear();
        formattedDate = `${weekday}, ${day} ${month} ${year}`;
      }
    } catch {}

    return (
      <div className="bg-white text-black p-2 rounded shadow-lg text-[11px] font-medium border border-gray-200 min-w-[220px]">
        <div className="text-gray-500 mb-1.5 border-b border-gray-200 pb-1">{formattedDate}</div>
        {sorted.map((p, i) => (
          <div key={i} className="flex items-center gap-1.5 leading-tight">
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
            <span className="font-bold">₹{Number(p.value).toFixed(2)}</span>
            <span className="text-gray-500 font-normal truncate">at {p.name}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function PriceHistoryChart({ gameId, gameTitle }: Props) {
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile(); // Check immediately on mount
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const { data, isLoading } = useSWR(
    `price-history-${gameId}`,
    () => fetchPriceHistory(gameId).then(r => r.data)
  );

  if (isLoading) return <div className="h-40 shimmer rounded" />;
  if (!data?.history || Object.keys(data.history).length === 0) {
    return <p className="text-sm text-gray-500 mt-4">No price history available yet.</p>;
  }

  // Only show last 5 days (today + 4 previous days = 5 days total, UTC based to prevent timezone bleed)
  const now = new Date();
  const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 4));
  const cutoffStr = cutoff.toISOString().substring(0, 10);

  // Force the chart to exactly span the 5 days (from cutoff to now)
  // This prevents lines from stopping early if the scraper hasn't run today.
  const allDates = [];
  for (let i = 0; i <= 4; i++) {
    const d = new Date(Date.UTC(cutoff.getUTCFullYear(), cutoff.getUTCMonth(), cutoff.getUTCDate() + i));
    allDates.push(d.toISOString().substring(0, 10));
  }

  const chartData = allDates.map(date => {
    const point: Record<string, any> = { date };
    for (const [shop, points] of Object.entries(data.history as Record<string, {price:number;date:string}[]>)) {
      // For a step chart, carry forward the last known price if there isn't one on this exact date
      const pastPoints = points.filter(p => p.date.substring(0, 10) <= date).sort((a,b) => a.date.localeCompare(b.date));
      if (pastPoints.length > 0) {
        point[shop] = pastPoints[pastPoints.length - 1].price;
      }
    }
    return point;
  });

  const shops = Object.keys(data.history);

  const maxVal = Math.max(0, ...chartData.flatMap(p => shops.map(shop => p[shop] || 0)));
  // Calculate max tick rounded up to nearest 1000
  const maxTick = Math.max(1000, Math.ceil(maxVal / 1000) * 1000);
  const yTicks = [];
  for (let i = 0; i <= maxTick; i += Math.max(1000, Math.ceil(maxTick / 5))) {
    yTicks.push(i);
  }
  if (!yTicks.includes(maxTick)) yTicks.push(maxTick);

  const lastDatePoint = chartData[chartData.length - 1] || {};
  const currentPrices = shops.map(shop => lastDatePoint[shop]).filter(p => p != null && p > 0);
  const currentLowestPrice = currentPrices.length > 0 ? Math.min(...currentPrices) : null;

  return (
    <div className="w-full bg-[var(--bg2)] rounded-none p-4 mt-2">
      <style>{`
        /* Define axis font sizes */
        :root {
          --axis-font-size: 12px;
        }
        @media (min-width: 640px) {
          :root {
            --axis-font-size: 16px;
          }
        }
        
        .recharts-cartesian-axis-tick-value,
        .recharts-cartesian-axis-tick-value tspan {
          fill: #6b7280 !important;
          font-size: var(--axis-font-size) !important;
        }
        .dark .recharts-cartesian-axis-tick-value,
        .dark .recharts-cartesian-axis-tick-value tspan {
          fill: #9ca3af !important;
        }
        
        .recharts-cartesian-axis-line {
          stroke: #e5e7eb !important;
        }
        .dark .recharts-cartesian-axis-line {
          stroke: #374151 !important;
        }
        .recharts-cartesian-axis-tick-line {
          stroke: #e5e7eb !important;
        }
        .dark .recharts-cartesian-axis-tick-line {
          stroke: #374151 !important;
        }
        .recharts-wrapper,
        .recharts-wrapper *,
        .recharts-surface {
          outline: none !important;
        }
        /* Define lowest price color variables globally for Recharts inline styles */
        :root {
          --lowest-price-color: #1f2937;
        }
        [data-theme="dark"] {
          --lowest-price-color: #eab308;
        }
      `}</style>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-1">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Price History (last 5 days, in INR)</h3>
        {currentLowestPrice != null && (
          <span className="text-xs text-gray-800 dark:text-[#eab308] font-bold">
            Current lowest: ₹{currentLowestPrice.toFixed(2)}
          </span>
        )}
      </div>

      <div className="w-full h-[250px] sm:h-[300px] cursor-pointer" onClick={() => {}}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart 
            data={chartData} 
            margin={{ top: 10, right: isMobile ? 0 : 10, left: isMobile ? 0 : 10, bottom: 0 }}
            onClick={() => {}}
            onTouchStart={() => {}}
          >
            {/* XAxis at the bottom */}
            <XAxis 
              dataKey="date" 
              className="custom-recharts-axis" 
              style={{ fontSize: 'var(--axis-font-size)' }}
              padding={{ left: isMobile ? 10 : 15, right: isMobile ? 10 : 15 }}
              tickFormatter={(d) => {
                try { 
                  const date = new Date(d);
                  return !isNaN(date.getTime()) ? date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) : d;
                }
                catch { return d; }
              }} 
              minTickGap={30}
              interval="preserveStartEnd"
              axisLine={{ stroke: '#374151' }}
              tickLine={{ stroke: '#374151' }}
            />
            
            {/* YAxis on the right */}
            <YAxis 
              orientation="right"
              ticks={yTicks}
              domain={[0, maxTick]} 
              className="custom-recharts-axis" 
              style={{ fontSize: 'var(--axis-font-size)' }}
              tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v} 
              width={40}
              axisLine={false}
              tickLine={false}
            />
            
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: '#4b5563', strokeWidth: 1, strokeDasharray: '3 3' }}
              isAnimationActive={false}
            />

            {/* Current Lowest Price Reference Line */}
            {currentLowestPrice != null && (
              <ReferenceLine 
                y={currentLowestPrice} 
                stroke="var(--lowest-price-color)"
                strokeDasharray="3 3" 
                strokeWidth={1}
                label={{ 
                  position: 'insideBottomLeft', 
                  value: 'Current Lowest Price', 
                  fill: 'var(--lowest-price-color)',
                  fontSize: 10,
                  fontWeight: 600,
                  offset: 5
                }} 
              />
            )}
            
            {/* Zero line */}
            <ReferenceLine y={0} stroke="#374151" />

            {shops.map((shop, i) => (
              <Line 
                key={shop} 
                type="stepAfter" 
                dataKey={shop}
                name={shop}
                stroke={getStoreColor(shop, i)} 
                dot={false} 
                activeDot={{ r: 4, strokeWidth: 0, stroke: 'none' }}
                strokeWidth={2}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
