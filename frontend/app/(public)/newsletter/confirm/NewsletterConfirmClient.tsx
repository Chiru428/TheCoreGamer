'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';
import Button from '@/components/ui/Button';

const API_BASE =
  typeof window === 'undefined'
    ? process.env.BACKEND_URL || 'http://localhost:3001'
    : process.env.NEXT_PUBLIC_API_URL || '';

type Status = 'loading' | 'success' | 'error' | 'no-token';

export default function NewsletterConfirmClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<Status>(token ? 'loading' : 'no-token');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) return;

    fetch(`${API_BASE}/api/newsletter/confirm?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setStatus('success');
          setMessage(json.message || 'Subscription confirmed!');
        } else {
          setStatus('error');
          setMessage(json.error || 'This confirmation link is invalid or has expired.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Something went wrong. Please try again later.');
      });
  }, [token]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full rounded-2xl bg-bg-surface border border-border p-10 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 text-accent mx-auto mb-4 animate-spin" />
            <h1 className="text-xl font-bold text-text-primary mb-2">Confirming your subscription…</h1>
            <p className="text-sm text-text-muted">Just a moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-text-primary mb-2">You're confirmed!</h1>
            <p className="text-sm text-text-muted mb-6">{message}</p>
            <Link href="/" className="inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 px-4 py-2 text-sm gap-2 border border-border text-text-primary hover:bg-bg-elevated">Back to TheCoreGamer</Link>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-danger mx-auto mb-4" />
            <h1 className="text-xl font-bold text-text-primary mb-2">Confirmation failed</h1>
            <p className="text-sm text-text-muted mb-6">{message}</p>
            <Link href="/" className="inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 px-4 py-2 text-sm gap-2 border border-border text-text-primary hover:bg-bg-elevated">Go to Homepage</Link>
          </>
        )}

        {status === 'no-token' && (
          <>
            <Mail className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <h1 className="text-xl font-bold text-text-primary mb-2">No confirmation token</h1>
            <p className="text-sm text-text-muted mb-6">
              This link is invalid. Please check your email for the correct confirmation link.
            </p>
            <Link href="/" className="inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 px-4 py-2 text-sm gap-2 border border-border text-text-primary hover:bg-bg-elevated">Go to Homepage</Link>
          </>
        )}
      </div>
    </div>
  );
}
