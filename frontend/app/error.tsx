'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    // Report to Sentry if available
    if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).Sentry) {
      (window as unknown as { Sentry: { captureException: (e: Error) => void } }).Sentry.captureException(error);
    }
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center bg-bg-primary">
      <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
        <AlertTriangle className="w-10 h-10 text-red-400" />
      </div>
      <h1 className="text-3xl font-bold text-text-primary mb-3">Something went wrong</h1>
      <p className="text-text-muted mb-8 max-w-md">An unexpected error occurred. Our team has been notified and is working on a fix.</p>
      <div className="flex gap-3">
        <Button onClick={reset} icon={<RefreshCw className="w-4 h-4" />}>Try Again</Button>
        <Link 
          href="/" 
          className="inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer border border-border text-text-primary hover:bg-bg-elevated hover:border-border-hover px-4 py-2 text-sm gap-2"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
