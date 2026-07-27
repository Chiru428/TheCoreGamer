'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { Suspense } from 'react';

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  let errorMessage = 'An unknown authentication error occurred.';
  if (error === 'Configuration') {
    errorMessage = 'There is a problem with the server configuration. Check if all required environment variables are set.';
  } else if (error === 'AccessDenied') {
    errorMessage = 'You do not have permission to sign in.';
  } else if (error === 'Verification') {
    errorMessage = 'The verification token has expired or has already been used.';
  } else if (error) {
    errorMessage = `Authentication error: ${error}`;
  }

  return (
    <div className="rounded-2xl bg-white/90 dark:bg-[#333333] backdrop-blur-md shadow-[0_8px_40px_rgba(0,0,0,0.1)] dark:shadow-2xl p-8 lg:p-10 border border-gray-200 dark:border-white/[0.04]">
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-black dark:text-white mb-3">Authentication Error</h1>
        <p className="text-gray-500 dark:text-[#888] mb-8 max-w-sm">
          {errorMessage}
        </p>
        <Link 
          href="/auth/login"
          className="w-full bg-gray-100 dark:bg-[#222] hover:bg-gray-200 dark:hover:bg-[#333] text-black dark:text-white font-medium rounded-xl py-3 text-[13px] transition-all flex items-center justify-center"
        >
          Return to Login
        </Link>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
}


