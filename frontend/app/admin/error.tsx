'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
      <div className="w-16 h-16 bg-danger/10 rounded-full flex items-center justify-center mb-6">
        <AlertTriangle className="w-8 h-8 text-danger" />
      </div>
      <h2 className="text-2xl font-bold text-text-primary mb-2">Something went wrong!</h2>
      <p className="text-text-muted mb-8 max-w-md">
        An error occurred while rendering this admin page. 
        {error.message && <span className="block mt-2 font-mono text-xs bg-bg-elevated p-2 rounded">{error.message}</span>}
      </p>
      <Button onClick={() => reset()}>Try again</Button>
    </div>
  );
}
