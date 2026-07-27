'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';

interface EmbargoCountdownProps {
  embargoUntil: string;
}

export default function EmbargoCountdown({ embargoUntil }: EmbargoCountdownProps) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!embargoUntil) return;
    const target = new Date(embargoUntil).getTime();

    const update = () => {
      const now = new Date().getTime();
      const diff = target - now;
      if (diff <= 0) {
        setTimeLeft('Embargo lifted!');
        return;
      }
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      let str = '';
      if (d > 0) str += `${d}d `;
      str += `${h}h ${m}m ${s}s`;
      setTimeLeft(str);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [embargoUntil]);

  if (!embargoUntil) return null;
  if (new Date(embargoUntil).getTime() <= new Date().getTime()) return null;

  return (
    <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 flex items-center justify-between text-sm font-medium rounded-lg">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-4 h-4" />
        <span>Embargoed Content</span>
      </div>
      <div className="font-mono bg-red-500/20 px-2 py-1 rounded text-xs">
        Lifts in: {timeLeft}
      </div>
    </div>
  );
}
