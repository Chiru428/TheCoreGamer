'use client';

import React from 'react';
import { X, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResumeReadingBannerProps {
  headingText: string | null;
  onContinue: () => void;
  onDismiss: () => void;
}

export default function ResumeReadingBanner({
  headingText,
  onContinue,
  onDismiss,
}: ResumeReadingBannerProps) {
  return (
    <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="relative group bg-bg-elevated border border-accent/20 rounded-xl p-4 md:p-5 shadow-2xl overflow-hidden">
        {/* Decorative background */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-3xl -mr-16 -mt-16 rounded-full" />
        
        <div className="relative flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent shrink-0">
              <ArrowRight className="w-4 h-4" />
            </div>
            <div>
              <p className="text-text-primary font-bold m-0">Welcome back!</p>
              <p className="text-text-dim m-0 text-xs">
                Resume reading from <span className="text-accent font-medium">"{headingText || 'where you left off'}"</span>?
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={onContinue}
              className="flex-1 md:flex-none px-5 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-lg shadow-accent/20 active:scale-95"
            >
              Continue
            </button>
            <button
              onClick={onDismiss}
              className="px-3 py-2 bg-bg-surface hover:bg-bg-primary text-text-dim hover:text-text-primary text-xs font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 border border-border"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
