'use client';

import { Flame, ArrowRight } from 'lucide-react';
import ExpandableSection from './ExpandableSection';

const RECOMMENDED_FUNNELS = [
  { name: 'Funnel 1', steps: ['Homepage', 'Article', 'Comment'] },
  { name: 'Funnel 2', steps: ['Article', 'Game Page', 'Buy Click'] },
  { name: 'Funnel 3', steps: ['Homepage', 'Search', 'Article'] },
];

export default function HeatmapsPanel() {
  return (
    <ExpandableSection title="Heatmaps" icon={<Flame className="w-4 h-4 text-accent" />}>
      <div className="rounded-xl border border-border bg-bg-elevated p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <p className="text-sm text-text-muted">
          Heatmap data is available in the Microsoft Clarity dashboard.
        </p>
        <a
          href="https://clarity.microsoft.com"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-accent/10 text-accent-light hover:bg-accent/20 transition-colors"
        >
          Open Clarity Dashboard
          <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>

      <div className="rounded-xl border border-border bg-bg-elevated p-5">
        <p className="text-sm font-semibold text-text-primary mb-3">Recommended funnels to set up in Clarity</p>
        <div className="space-y-2">
          {RECOMMENDED_FUNNELS.map(funnel => (
            <div key={funnel.name} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-text-muted font-medium shrink-0">{funnel.name}:</span>
              {funnel.steps.map((step, i) => (
                <span key={step} className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-bg-surface border border-border text-text-primary">{step}</span>
                  {i < funnel.steps.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-text-dim" />}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </ExpandableSection>
  );
}
