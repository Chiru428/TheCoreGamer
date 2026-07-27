'use client';

import { useState, useEffect, useRef } from 'react';
import { trackClarityEvent } from '@/lib/clarity';

interface ReadingProgressProps {
  slug?: string;
}

export default function ReadingProgress({ slug }: ReadingProgressProps) {
  const [progress, setProgress] = useState(0);
  const [savedProgress, setSavedProgress] = useState<number | null>(null);
  const firedMilestones = useRef<Set<number>>(new Set());

  useEffect(() => {
    firedMilestones.current = new Set();
  }, [slug]);

  useEffect(() => {
    if (slug) {
      try {
        const stored = localStorage.getItem(`gh-reading-${slug}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.scrollPercent > 15 && parsed.scrollPercent < 95) {
            setSavedProgress(parsed.scrollPercent);
          }
        }
      } catch (e) {}
    }
  }, [slug]);

  useEffect(() => {
    const handleScroll = () => {
      const article = document.getElementById('article-content');
      if (!article) return;
      const rect = article.getBoundingClientRect();
      const totalHeight = article.scrollHeight;
      const scrolled = Math.max(0, -rect.top);
      const windowHeight = window.innerHeight;
      
      const pct = Math.min(100, (scrolled / (totalHeight - windowHeight)) * 100);
      setProgress(pct);
      
      const milestones = [25, 50, 75, 100];
      for (const m of milestones) {
        if (pct >= m && !firedMilestones.current.has(m)) {
          firedMilestones.current.add(m);
          if (typeof window !== 'undefined' && typeof (window as any).gtag === 'function') {
            (window as any).gtag('event', 'scroll_depth', {
              percent_scrolled: m,
              article_slug: slug ?? 'unknown',
            });
          }
          if (m === 75) {
            trackClarityEvent('article_read');
          }
        }
      }

      // Clear marker if we pass it
      if (savedProgress && pct > savedProgress) {
        setSavedProgress(null);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [savedProgress]);

  return (
    <div className="fixed top-0 left-0 right-0 z-[49] h-0.5 bg-white/5 pointer-events-none">
      <div
        className="h-full bg-accent transition-[width] duration-100 relative"
        style={{ width: `${progress}%` }}
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Reading progress"
      >
        {/* Glow effect at the end of progress */}
        <div className="absolute right-0 top-0 bottom-0 w-4 bg-accent blur-md opacity-50" />
      </div>

      {/* Saved position marker */}
      {savedProgress !== null && (
        <div 
          className="absolute top-0 h-full w-1.5 bg-cyan-400 blur-[2px] animate-pulse transition-all duration-500"
          style={{ left: `${savedProgress}%` }}
          title="Last saved position"
        />
      )}
    </div>
  );
}
