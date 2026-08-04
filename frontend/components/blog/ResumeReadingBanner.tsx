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
      <div className="relative group bg-bg-elevated border border-border border-l-4 border-l-[#00e5a0] rounded-xl p-4 md:p-5 shadow-2xl overflow-hidden">
        
        <div className="relative flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 rounded-full bg-[#00e5a0]/10 flex items-center justify-center text-[#00e5a0] shrink-0">
              <ArrowRight className="w-4 h-4" />
            </div>
            <div>
              <p className="text-text-primary font-bold m-0 text-[15px]">Welcome back!</p>
              <p className="text-text-dim m-0 text-[13px] mt-0.5">
                Resume reading from <span className="text-[#00e5a0] font-medium">"{headingText || 'where you left off'}"</span>?
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={onContinue}
              className="flex-1 md:flex-none px-5 py-2 bg-[#00e5a0] hover:bg-[#00c98c] text-black text-xs font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95"
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
