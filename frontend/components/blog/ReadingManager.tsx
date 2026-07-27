'use client';

import React, { useState, useEffect } from 'react';
import { useReadingProgress } from '@/hooks/useReadingProgress';
import ResumeReadingBanner from './ResumeReadingBanner';

interface ReadingManagerProps {
  slug: string;
  wordCount?: number;
}

export default function ReadingManager({ slug, wordCount = 0 }: ReadingManagerProps) {
  const { savedState, clearSaved } = useReadingProgress(slug, '#article-content', wordCount);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Show banner only if saved state is valid
    if (savedState) {
      setShowBanner(true);
    }
  }, [savedState]);

  const handleContinue = () => {
    if (savedState?.headingId) {
      const el = document.getElementById(savedState.headingId);
      if (el) {
        const offset = 90; // account for sticky header
        const absoluteTop = el.getBoundingClientRect().top + window.scrollY;
        const offsetPosition = absoluteTop - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    }
    setShowBanner(false);
  };

  const handleDismiss = () => {
    clearSaved();
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <ResumeReadingBanner
      headingText={savedState?.headingText || null}
      onContinue={handleContinue}
      onDismiss={handleDismiss}
    />
  );
}
