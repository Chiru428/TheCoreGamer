'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

type GameCard = {
  id: string;
  slug: string;
  title: string;
  publisher?: string | null;
  coverImageUrl?: string | null;
  releaseDate?: string | null;
  releaseStatus?: string | null;
};

type Tab = {
  key: string;
  label: string;
  games: GameCard[];
};

interface GameTabsSectionProps {
  newReleaseGames: GameCard[];
  topRatedGames: GameCard[];
  comingSoonGames: GameCard[];
}

function formatReleaseDate(dateString?: string | null) {
  if (!dateString) return 'TBA';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return 'TBA';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
}

export default function GameTabsSection({ newReleaseGames, topRatedGames, comingSoonGames }: GameTabsSectionProps) {
  const tabs: Tab[] = [
    { key: 'new', label: 'New Releases', games: newReleaseGames },
    { key: 'top', label: 'Top Rated', games: topRatedGames },
    { key: 'soon', label: 'Coming Soon', games: comingSoonGames },
  ].filter(t => t.games.length > 0);

  const [activeTab, setActiveTab] = useState(tabs[0]?.key ?? 'new');
  const currentGames = (tabs.find(t => t.key === activeTab)?.games ?? []).slice(0, 6);

  if (tabs.length === 0) return null;

  return (
    <div>
      {/* Tab bar */}
      <div className="game-tabs-bar">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`game-tab-btn${activeTab === tab.key ? ' active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Game grid */}
      <div className="game-tabs-grid">
        {currentGames.map((g) => {
          const releaseDate = formatReleaseDate(g.releaseDate);
          const isComingSoon = g.releaseStatus === 'Coming Soon';

          return (
            <Link key={g.id} href={`/games/${g.slug}`} className="game-tab-card group">
              <div className="game-tab-cover">
                {g.coverImageUrl ? (
                  <Image
                    src={g.coverImageUrl}
                    alt={g.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, 225px"
                    unoptimized={true}
                  />
                ) : (
                  <div className="game-tab-cover-placeholder">
                    <span>🎮</span>
                  </div>
                )}
                {releaseDate && (
                  <div className="game-tab-coming-badge">
                    {releaseDate}
                  </div>
                )}
              </div>
              <div className="game-tab-info">
                <p className="game-tab-title"><span className="hover-underline-animation">{g.title}</span></p>
                {g.publisher && (
                  <p className="game-tab-publisher">{g.publisher}</p>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      <style>{`
        .game-tabs-bar {
          display: flex;
          align-items: flex-end;
          gap: 0;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          margin-bottom: 20px;
        }
        .game-tab-btn {
          position: relative;
          padding: 0 0 10px 0;
          margin-right: 28px;
          background: none;
          border: none;
          cursor: pointer;
          font-family: 'Gibson', sans-serif;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--muted2, #6b7280);
          transition: color 0.2s;
          outline: none;
          white-space: nowrap;
        }
        @media (min-width: 768px) {
          .game-tab-btn {
            font-size: 14px;
          }
        }
        .game-tab-btn:hover {
          color: var(--text-strong, #fff);
        }
        .game-tab-btn.active {
          color: var(--text-strong, #fff);
        }
        .game-tab-btn.active::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 2px;
          background: #00e5a0;
          border-radius: 2px 2px 0 0;
        }
        .game-tabs-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        @media (min-width: 768px) {
          .game-tabs-grid {
            grid-template-columns: repeat(5, 1fr);
            gap: 20px;
          }
        }
        .game-tab-card {
          display: block;
          overflow: hidden;
          text-decoration: none;
        }
        @media (min-width: 768px) {
          .game-tab-card:nth-child(6) {
            display: none;
          }
        }
        .game-tab-cover {
          position: relative;
          aspect-ratio: 2/3;
          width: 100%;
          border-radius: 4px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.08);
          background: linear-gradient(135deg, #1e1228 0%, #0a1628 100%);
        }
        .game-tab-cover-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .game-tab-cover-placeholder span {
          font-size: 2rem;
          opacity: 0.2;
        }
        .game-tab-coming-badge {
          position: absolute;
          bottom: 8px;
          left: 0;
          right: 0;
          text-align: center;
          background: rgba(0,0,0,0.72);
          backdrop-filter: blur(4px);
          color: #00e5a0;
          font-family: 'Gibson', sans-serif;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          padding: 5px 6px;
        }
        .game-tab-info {
          padding-top: 10px;
        }
        .game-tab-title {
          font-family: 'Gibson', sans-serif;
          font-weight: 700;
          font-size: 15px;
          color: var(--text-strong, #fff);
          line-height: 1.3;
          margin-bottom: 3px;
        }
        @media (min-width: 768px) {
          .game-tab-title {
            font-size: 17px;
          }
        }
        .game-tab-publisher {
          font-size: 13px;
          color: var(--muted, #6b7280);
          font-weight: 400;
          display: none;
        }
        @media (min-width: 768px) {
          .game-tab-publisher {
            display: block;
          }
        }
      `}</style>
    </div>
  );
}
