'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { verifyEmail } from '@/lib/api';
import Link from 'next/link';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

function VerifyEmailContent() {
  const sp = useSearchParams();
  const token = sp.get('token') || '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (!token) { setStatus('error'); return; }
    verifyEmail(token).then(res => setStatus(res.success ? 'success' : 'error')).catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="rounded-2xl bg-bg-surface border border-border p-8 text-center">
      {status === 'loading' && <><Loader2 className="w-16 h-16 text-accent animate-spin mx-auto mb-4" /><p className="text-text-muted">Verifying your email...</p></>}
      {status === 'success' && <><CheckCircle className="w-16 h-16 text-accent-green mx-auto mb-4" /><h2 className="text-xl font-bold text-text-primary mb-2">Email verified!</h2><p className="text-sm text-text-muted mb-6">Your account is now active.</p><Link href="/auth/login" className="text-accent-light hover:underline">Sign In</Link></>}
      {status === 'error' && <><XCircle className="w-16 h-16 text-danger mx-auto mb-4" /><h2 className="text-xl font-bold text-text-primary mb-2">Verification failed</h2><p className="text-sm text-text-muted mb-6">The link may be invalid or expired.</p><Link href="/auth/login" className="text-accent-light hover:underline">Back to Sign In</Link></>}
    </div>
  );
}

export default function VerifyEmailPage() {
  return <Suspense fallback={<div className="rounded-2xl bg-bg-surface border border-border p-8 text-center"><Loader2 className="w-16 h-16 text-accent animate-spin mx-auto mb-4" /><p className="text-text-muted">Loading...</p></div>}><VerifyEmailContent /></Suspense>;
}
