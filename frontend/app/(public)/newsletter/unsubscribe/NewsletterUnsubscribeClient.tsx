'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle, Loader2, MailX } from 'lucide-react';
import Button from '@/components/ui/Button';

const API_BASE =
  typeof window === 'undefined'
    ? process.env.BACKEND_URL || 'http://localhost:3001'
    : process.env.NEXT_PUBLIC_API_URL || '';

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function NewsletterUnsubscribeClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  // If token is in the URL, auto-unsubscribe on mount
  useEffect(() => {
    if (!token) return;
    setStatus('loading');
    const url = `${API_BASE}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setStatus('success');
          setMessage(json.message || 'You have been unsubscribed.');
        } else {
          setStatus('error');
          setMessage(json.error || 'This unsubscribe link is invalid or has expired.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Something went wrong. Please try again later.');
      });
  }, [token]);

  const handleManualUnsubscribe = async () => {
    if (!email) return;
    setStatus('loading');
    fetch(`${API_BASE}/api/newsletter/unsubscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email }),
    })
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setStatus('success');
          setMessage(`${email} has been unsubscribed.`);
        } else {
          setStatus('error');
          setMessage(json.error || 'Failed to unsubscribe. Please try again.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Something went wrong. Please try again later.');
      });
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full rounded-2xl bg-bg-surface border border-border p-10 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 text-accent mx-auto mb-4 animate-spin" />
            <h1 className="text-xl font-bold text-text-primary mb-2">Processing…</h1>
            <p className="text-sm text-text-muted">Unsubscribing your email address.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-text-primary mb-2">Unsubscribed</h1>
            <p className="text-sm text-text-muted mb-6">{message}</p>
            <Link href="/" className="inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 px-4 py-2 text-sm gap-2 border border-border text-text-primary hover:bg-bg-elevated">Back to TheCoreGamer</Link>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-danger mx-auto mb-4" />
            <h1 className="text-xl font-bold text-text-primary mb-2">Unsubscribe failed</h1>
            <p className="text-sm text-text-muted mb-6">{message}</p>
            <Link href="/" className="inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 px-4 py-2 text-sm gap-2 border border-border text-text-primary hover:bg-bg-elevated">Go to Homepage</Link>
          </>
        )}

        {status === 'idle' && (
          <>
            <MailX className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <h1 className="text-xl font-bold text-text-primary mb-2">Unsubscribe from Newsletter</h1>
            {email ? (
              <>
                <p className="text-sm text-text-muted mb-6">
                  Click below to unsubscribe <strong className="text-text-primary">{email}</strong> from the TheCoreGamer newsletter.
                </p>
                <Button variant="danger" className="w-full mb-3" onClick={handleManualUnsubscribe}>
                  Unsubscribe
                </Button>
                <Link href="/" className="w-full inline-flex items-center justify-center font-medium rounded-lg transition-all px-4 py-2 text-sm text-text-muted hover:text-text-primary hover:bg-bg-elevated">Cancel</Link>
              </>
            ) : (
              <>
                <p className="text-sm text-text-muted mb-6">
                  This link is invalid. Please use the unsubscribe link from your email.
                </p>
                <Link href="/" className="inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 px-4 py-2 text-sm gap-2 border border-border text-text-primary hover:bg-bg-elevated">Go to Homepage</Link>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
