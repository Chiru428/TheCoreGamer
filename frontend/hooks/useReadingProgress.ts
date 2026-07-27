'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';

interface ReadingState {
  headingId: string | null;
  headingText: string | null;
  scrollPercent: number;
  timestamp: number;
}

export function useReadingProgress(slug: string, contentSelector: string = '#article-content', wordCount: number = 0) {
  const [currentPercent, setCurrentPercent] = useState(0);
  const [savedState, setSavedState] = useState<ReadingState | null>(null);
  const lastSaveTime = useRef<number>(0);
  const { user } = useAuthStore();
  const isAdminOrWriter = user?.role === 'ADMIN' || user?.role === 'AUTHOR';

  const STORAGE_KEY = `gh-reading-${slug}`;

  const clearSaved = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setSavedState(null);
    } catch (e) {
      // Ignore localStorage errors
    }
  }, [STORAGE_KEY]);

  // Load saved state on mount
  useEffect(() => {
    if (wordCount > 0 && wordCount < 500) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ReadingState;
        // Only offer resume if between 15% and 95%
        if (parsed.scrollPercent > 15 && parsed.scrollPercent < 95) {
          setSavedState(parsed);
        }
      }
    } catch (e) {
      // Ignore errors
    }
  }, [STORAGE_KEY, wordCount]);

  useEffect(() => {
    const handleScroll = () => {
      const article = document.querySelector(contentSelector);
      if (!article) return;

      const rect = article.getBoundingClientRect();
      const totalHeight = article.scrollHeight;
      const scrolled = Math.max(0, -rect.top);
      const windowHeight = window.innerHeight;
      
      // Calculate percentage
      const pct = Math.min(100, (scrolled / (totalHeight - windowHeight)) * 100);
      setCurrentPercent(pct);

      // Don't save for admins or if article is too short
      if (isAdminOrWriter || (wordCount > 0 && wordCount < 500)) return;

      // Find last visible heading
      const headings = Array.from(article.querySelectorAll('h2, h3'));
      if (headings.length === 0) return;

      const now = Date.now();
      // Throttle saves to every 2 seconds
      if (now - lastSaveTime.current > 2000) {
        if (pct > 95) {
          clearSaved();
        } else if (pct > 15) {
          // Find the heading that is currently "active" (topmost in view or last passed)
          let currentHeading: Element | null = null;
          for (const h of headings) {
            if (h.getBoundingClientRect().top < 100) {
              currentHeading = h;
            } else {
              break;
            }
          }

          if (currentHeading) {
            const state: ReadingState = {
              headingId: currentHeading.id,
              headingText: (currentHeading as HTMLElement).innerText.replace(/ ▾$/, '').trim(),
              scrollPercent: Math.round(pct),
              timestamp: now,
            };
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
              lastSaveTime.current = now;
            } catch (e) {}
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Initial check
    handleScroll();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [STORAGE_KEY, contentSelector, isAdminOrWriter, clearSaved, wordCount]);

  return { savedState, clearSaved, currentPercent };
}
