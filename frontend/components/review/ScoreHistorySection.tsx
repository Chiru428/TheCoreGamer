'use client';

import { useState } from 'react';
import { ChevronDown, ArrowUp, ArrowDown } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { ReviewScoreHistory } from '@/types';

interface ScoreHistorySectionProps {
  history: ReviewScoreHistory[];
}

export default function ScoreHistorySection({ history }: ScoreHistorySectionProps) {
  const [expanded, setExpanded] = useState(false);

  if (!history || history.length === 0) return null;

  return (
    <div className="my-8">
      <div className="section-title-bar mb-4">Score History</div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 text-sm font-medium text-text-primary hover:text-accent transition-colors"
        aria-expanded={expanded}
      >
        <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        View score history ({history.length} {history.length === 1 ? 'change' : 'changes'})
      </button>

      {expanded && (
        <ul className="mt-4 space-y-4 border-l border-border pl-5">
          {history.map((entry) => {
            const wentUp = entry.newScore > entry.oldScore;
            const Arrow = wentUp ? ArrowUp : ArrowDown;
            const arrowColor = wentUp ? 'text-emerald-400' : 'text-red-400';
            return (
              <li key={entry.id} className="relative">
                <span className="absolute -left-[25px] top-1.5 w-2.5 h-2.5 rounded-full bg-accent border-2 border-bg-primary" />
                <p className="text-xs text-text-muted mb-1">{formatDate(entry.changedAt)}</p>
                <p className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
                  {entry.oldScore.toFixed(1)}
                  <Arrow className={`w-3.5 h-3.5 ${arrowColor}`} />
                  {entry.newScore.toFixed(1)}
                </p>
                {entry.reason && <p className="text-sm text-text-muted mt-1">{entry.reason}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
