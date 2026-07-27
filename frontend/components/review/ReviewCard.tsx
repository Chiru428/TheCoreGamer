'use client';

import { useState } from 'react';
import PostCard from '@/components/blog/PostCard';
import ScoreBadge from './ScoreBadge';
import { formatDate, cn } from '@/lib/utils';
import type { Article } from '@/types';

export default function ReviewCard({ article }: { article: Article }) {
  const review = article.gameReview;
  const platformScores = review?.ReviewScorePlatforms || [];
  const scoreHistory = review?.ScoreHistory || [];
  const [activePlatform, setActivePlatform] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const activeScore = activePlatform
    ? platformScores.find((p) => p.platform === activePlatform) || null
    : null;

  return (
    <div className="relative">
      <PostCard article={article} aspectVideo={true} />
      {review && (
        <div className="absolute top-3 right-3">
          <ScoreBadge score={Number(review.reviewScore)} size="sm" />
        </div>
      )}

      {platformScores.length > 0 && (
        <div className="mt-2">
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setActivePlatform(null)}
              className={cn(
                'px-2 py-0.5 text-[11px] font-semibold rounded border border-border',
                activePlatform === null ? 'bg-accent text-white border-accent' : 'bg-bg-elevated text-text-muted',
              )}
            >
              Overall
            </button>
            {platformScores.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setActivePlatform(p.platform)}
                className={cn(
                  'px-2 py-0.5 text-[11px] font-semibold rounded border border-border',
                  activePlatform === p.platform ? 'bg-accent text-white border-accent' : 'bg-bg-elevated text-text-muted',
                )}
              >
                {p.platform}
              </button>
            ))}
          </div>

          {activeScore && (
            <div className="mt-2 text-xs text-text-muted space-y-0.5">
              <div className="font-semibold text-text-primary">{activeScore.platform}: {activeScore.overall.toFixed(1)} / 10</div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                {activeScore.gameplay != null && <span>Gameplay: {activeScore.gameplay.toFixed(1)}</span>}
                {activeScore.visuals != null && <span>Visuals: {activeScore.visuals.toFixed(1)}</span>}
                {activeScore.story != null && <span>Story: {activeScore.story.toFixed(1)}</span>}
                {activeScore.performance != null && <span>Performance: {activeScore.performance.toFixed(1)}</span>}
                {activeScore.value != null && <span>Value: {activeScore.value.toFixed(1)}</span>}
              </div>
              {activeScore.notes && <div className="italic">{activeScore.notes}</div>}
            </div>
          )}
        </div>
      )}

      {scoreHistory.length > 0 && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setHistoryOpen((prev) => !prev)}
            className="text-[11px] font-semibold text-text-muted hover:text-text-primary transition-colors"
          >
            {historyOpen ? 'Hide score history' : 'Show score history'}
          </button>
          {historyOpen && (
            <ul className="mt-1.5 space-y-1 text-[11px] text-text-muted">
              {scoreHistory.map((h) => (
                <li key={h.id}>
                  Updated {formatDate(h.changedAt)}: {h.oldScore.toFixed(1)} → {h.newScore.toFixed(1)} — {h.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
