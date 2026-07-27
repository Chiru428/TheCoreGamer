'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getScoreColor, getScoreLabel } from '@/lib/utils';

interface ScoreBadgeProps {
  score: number;
  size?: 'sm' | 'lg' | 'xl' | number;
  className?: string;
  hideLabel?: boolean;
}

export default function ScoreBadge({ score, size = 'sm', className, hideLabel }: ScoreBadgeProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const color = getScoreColor(score);

  if (size === 'sm') {
    return (
      <div
        className={cn('flex items-center justify-center font-black rounded text-[16px] px-2 py-0.5', className)}
        style={{ backgroundColor: color, color: '#000', boxShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
      >
        {score.toFixed(1)}
      </div>
    );
  }

  const customDim = typeof size === 'number' ? size : undefined;
  const dim = customDim ?? (size === 'xl' ? 120 : 80);
  const stroke = customDim ? Math.max(3, Math.round(dim / 15)) : size === 'xl' ? 6 : 4;
  const radius = (dim - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const fillPercent = score / 10;
  const dashOffset = circumference * (1 - (mounted ? fillPercent : 0));

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: dim, height: dim }}>
      <svg width={dim} height={dim} className="-rotate-90">
        <circle cx={dim / 2} cy={dim / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-border" />
        <motion.circle
          cx={dim / 2} cy={dim / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circumference} strokeDashoffset={dashOffset} strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn('font-bold', !customDim && (size === 'xl' ? 'text-3xl' : 'text-xl'))}
          style={{ color, ...(customDim ? { fontSize: dim * 0.28 } : {}) }}
        >
          {score.toFixed(1)}
        </span>
        {!hideLabel && (
          <span
            className={cn('text-text-muted', !customDim && (size === 'xl' ? 'text-xs' : 'text-[10px]'))}
            style={customDim ? { fontSize: Math.max(8, dim * 0.13) } : undefined}
          >
            {getScoreLabel(score)}
          </span>
        )}
      </div>
    </div>
  );
}
