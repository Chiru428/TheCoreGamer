'use client';

import Link from 'next/link';
import { Gamepad2 } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center bg-bg-primary">
      <div className="relative mb-8">
        <span className="text-[10rem] font-black text-border leading-none select-none">404</span>
        <div className="absolute inset-0 flex items-center justify-center">
          <Gamepad2 className="w-20 h-20 text-accent animate-pulse" />
        </div>
      </div>
      <h1 className="text-3xl font-bold text-text-primary mb-3">Page Not Found</h1>
      <p className="text-text-muted mb-8 max-w-md">The page you&apos;re looking for doesn&apos;t exist or has been moved. Maybe try exploring our latest content?</p>
      <div className="flex gap-3">
        <Link 
          href="/"
          className="inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer bg-accent text-white dark:text-black hover:bg-accent-hover shadow-lg shadow-accent/20 uppercase font-extrabold tracking-wider font-['Rajdhani',sans-serif] [clip-path:polygon(0_0,calc(100%-12px)_0,100%_12px,100%_100%,12px_100%,0_calc(100%-12px))] px-4 py-2 text-sm gap-2"
        >
          Go Home
        </Link>
        <Link 
          href="/articles"
          className="inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer border border-border text-text-primary hover:bg-bg-elevated hover:border-border-hover px-4 py-2 text-sm gap-2"
        >
          Browse Articles
        </Link>
      </div>
    </div>
  );
}
