'use client';

import { useEffect, useState } from 'react';
import { PriceSnapshot } from '@/types';
import PriceHistoryChart from '@/components/deals/PriceHistoryChart';
import '@/styles/gaming-content.css';

interface PriceDealRow extends PriceSnapshot {
  historicalLow: number;
  dealScore: number;
}

interface PriceCompareTableRendererProps {
  gameId: string;
  gameTitle: string;
  itadId?: string;
}

async function handleBuyClick(row: PriceDealRow) {
  try {
    const res = await fetch('/api/analytics/deal-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: row.url, store: row.shop, gameSlug: row.Game?.slug }),
    });
    const json = await res.json();
    window.open(json.redirectUrl || row.url, '_blank', 'noopener,noreferrer');
  } catch {
    window.open(row.url, '_blank', 'noopener,noreferrer');
  }
}

export default function PriceCompareTableRenderer({ gameId, gameTitle }: PriceCompareTableRendererProps) {
  const [rows, setRows] = useState<PriceDealRow[] | null>(null);
  const [error, setError] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!gameId) return;
    let cancelled = false;
    setRows(null);
    setError(false);

    fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/deals/prices?gameId=${encodeURIComponent(gameId)}`)
      .then(r => r.json())
      .then(json => {
        if (cancelled) return;
        setRows(Array.isArray(json.data) ? json.data : []);
      })
      .catch(() => { if (!cancelled) setError(true); });

    return () => { cancelled = true; };
  }, [gameId]);

  if (!gameId) return null;

  const titleSuffix = gameTitle ? ` — ${gameTitle}` : '';

  if (error) {
    return (
      <div className="gc-price-compare" data-type="price-compare-table">
        <div className="gc-pct-header"><span className="gc-pct-title">Price Comparison{titleSuffix}</span></div>
        <div className="gc-pct-error">Unable to load prices right now.</div>
      </div>
    );
  }

  if (rows === null) {
    return (
      <div className="gc-price-compare" data-type="price-compare-table">
        <div className="gc-pct-header"><span className="gc-pct-title">Price Comparison{titleSuffix}</span></div>
        <div style={{ padding: '14px 18px' }}>
          <div className="gc-pct-shimmer-row" />
          <div className="gc-pct-shimmer-row" />
          <div className="gc-pct-shimmer-row" />
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="gc-price-compare" data-type="price-compare-table">
        <div className="gc-pct-header"><span className="gc-pct-title">Price Comparison{titleSuffix}</span></div>
        <div className="gc-pct-empty">No price data available yet.</div>
      </div>
    );
  }

  const sorted = [...rows].sort((a, b) => a.priceINR - b.priceINR);

  return (
    <div className="gc-price-compare" data-type="price-compare-table">
      <div className="gc-pct-header">
        <span className="gc-pct-title">Price Comparison{titleSuffix}</span>
        <button type="button" className="gc-pct-history-link" onClick={() => setShowHistory(true)}>
          View Price History
        </button>
      </div>
      <div className="gc-pct-scroll">
        <table className="gc-pct-table">
          <thead>
            <tr>
              <th>Store</th>
              <th>Current Price</th>
              <th>Original</th>
              <th>Discount</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, idx) => {
              const original = row.cutPercent > 0 ? row.priceINR / (1 - row.cutPercent / 100) : row.priceINR;
              const isBest = idx === 0;
              return (
                <tr key={`${row.shop}-${idx}`} className={isBest ? 'gc-pct-row-best' : undefined}>
                  <td>
                    {row.shop}
                    {isBest && <span className="gc-pct-best-badge">Best Price</span>}
                  </td>
                  <td>₹{row.priceINR.toLocaleString('en-IN')}</td>
                  <td className="gc-pct-original">{row.cutPercent > 0 ? `₹${Math.round(original).toLocaleString('en-IN')}` : '—'}</td>
                  <td className="gc-pct-discount">{row.cutPercent > 0 ? `-${row.cutPercent}%` : '—'}</td>
                  <td>
                    <a
                      className="gc-pct-buy-btn"
                      href={row.url}
                      target="_blank"
                      rel="nofollow noopener"
                      onClick={e => { e.preventDefault(); handleBuyClick(row); }}
                    >
                      Buy
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showHistory && (
        <div className="gc-pct-modal-overlay" onClick={() => setShowHistory(false)}>
          <div className="gc-pct-modal" onClick={e => e.stopPropagation()}>
            <div className="gc-pct-modal-header">
              <span className="gc-pct-title">Price History{titleSuffix}</span>
              <button type="button" className="gc-pct-modal-close" onClick={() => setShowHistory(false)}>✕</button>
            </div>
            <PriceHistoryChart gameId={gameId} gameTitle={gameTitle} />
          </div>
        </div>
      )}
    </div>
  );
}
