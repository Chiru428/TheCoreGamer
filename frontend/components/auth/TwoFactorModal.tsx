'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Shield, ShieldCheck, ShieldOff, Copy, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const API_BASE =
  typeof window === 'undefined'
    ? process.env.BACKEND_URL || 'http://localhost:3001'
    : process.env.NEXT_PUBLIC_API_URL || '';

async function setup2FA(): Promise<{ qrCodeUri: string } | null> {
  const res = await fetch(`${API_BASE}/api/auth/2fa/setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({}),
  });
  const json = await res.json();
  return json?.data ?? null;
}

async function verify2FASetup(
  code: string
): Promise<{ success: boolean; error?: string; data?: { backupCodes: string[] } }> {
  const res = await fetch(`${API_BASE}/api/auth/2fa/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ code }),
  });
  return res.json();
}

async function disable2FA(code: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/api/auth/2fa/disable`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ code }),
  });
  return res.json();
}

type Step = 'idle' | 'loading' | 'qr' | 'verify' | 'codes' | 'done';

interface TwoFactorModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEnabled: boolean;
  onStatusChange: (enabled: boolean) => void;
}

export default function TwoFactorModal({ isOpen, onClose, isEnabled, onStatusChange }: TwoFactorModalProps) {
  const { user, setUser } = useAuthStore();
  const { addToast } = useUIStore();

  const [step, setStep] = useState<Step>('idle');
  const [uri, setUri] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [codesSaved, setCodesSaved] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('idle');
      setCode('');
      setBackupCodes([]);
      setCodesSaved(false);
    }
  }, [isOpen]);

  /* -- ENABLE FLOW -- */
  const handleStartEnable = async () => {
    setStep('loading');
    const data = await setup2FA();
    if (!data || !data.qrCodeUri) {
      addToast({ type: 'error', message: 'Failed to start 2FA setup. Try again.' });
      setStep('idle');
      return;
    }
    
    setUri(data.qrCodeUri);
    
    // Extract the secret from the otpauth URI for manual entry display
    try {
      const url = new URL(data.qrCodeUri);
      setSecret(url.searchParams.get('secret') || '');
    } catch {
      const match = data.qrCodeUri.match(/[?&]secret=([^&]+)/);
      setSecret(match ? match[1] : '');
    }
    
    setStep('qr');
  };

  const handleConfirmSetup = async () => {
    if (code.length < 6) return;
    setIsSubmitting(true);
    const res = await verify2FASetup(code);
    setIsSubmitting(false);
    if (res.success) {
      onStatusChange(true);
      if (user) setUser({ ...user, twoFactorEnabled: true });
      addToast({ type: 'success', message: '2FA enabled successfully!' });
      if (res.data?.backupCodes?.length) {
        setBackupCodes(res.data.backupCodes);
        setStep('codes');
      } else {
        setStep('done');
      }
    } else {
      addToast({ type: 'error', message: res.error || 'Invalid code. Please try again.' });
    }
  };

  /* -- DISABLE FLOW -- */
  const handleDisable = async () => {
    if (code.length < 6) return;
    setIsSubmitting(true);
    const res = await disable2FA(code);
    setIsSubmitting(false);
    if (res.success) {
      onStatusChange(false);
      if (user) setUser({ ...user, twoFactorEnabled: false });
      addToast({ type: 'success', message: '2FA disabled.' });
      onClose();
    } else {
      addToast({ type: 'error', message: res.error || 'Invalid code. Please try again.' });
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Two-Factor Authentication">
      <div className="space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-3">
          {isEnabled
            ? <ShieldCheck className="w-8 h-8 text-emerald-400" />
            : <ShieldOff className="w-8 h-8 text-text-muted" />}
          <div>
            <p className="text-sm text-text-muted">
              {isEnabled ? '2FA is currently enabled on your account.' : '2FA is not enabled.'}
            </p>
          </div>
        </div>

        {/* -- DISABLE MODE -- */}
        {isEnabled && step !== 'done' && (
          <div className="space-y-4">
            <p className="text-sm text-text-muted">
              Enter the 6-digit code from your authenticator app to disable two-factor authentication.
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full px-4 py-3 rounded-lg bg-bg-elevated border border-border text-text-primary text-center text-xl font-mono tracking-widest outline-none focus:border-accent"
            />
            <Button
              variant="danger"
              className="w-full"
              loading={isSubmitting}
              disabled={code.length < 6}
              onClick={handleDisable}
            >
              Disable 2FA
            </Button>
          </div>
        )}

        {/* -- ENABLE: Idle -- */}
        {!isEnabled && step === 'idle' && (
          <div className="space-y-4">
            <p className="text-sm text-text-muted">
              Two-factor authentication adds an extra layer of security. You'll need an authenticator
              app like Google Authenticator or Authy.
            </p>
            <Button variant="primary" className="w-full" onClick={handleStartEnable}>
              <Shield className="w-4 h-4" />
              Enable 2FA
            </Button>
          </div>
        )}

        {/* -- ENABLE: Loading -- */}
        {!isEnabled && step === 'loading' && (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* -- ENABLE: Show QR -- */}
        {!isEnabled && step === 'qr' && (
          <div className="space-y-6">
            <p className="text-sm text-text-muted">
              Scan this QR code with your authenticator app. If you can't scan it, enter the secret
              key manually.
            </p>
            <div className="flex justify-center bg-white p-4 rounded-lg w-fit mx-auto">
              <QRCodeSVG
                value={uri || ''}
                size={200}
                level="M"
              />
            </div>
            <div className="rounded-lg bg-bg-elevated border border-border px-4 py-3 flex items-center justify-between gap-3">
              <code className="text-xs text-text-primary font-mono break-all">{secret}</code>
              <button
                onClick={copySecret}
                className="shrink-0 text-text-muted hover:text-accent transition-colors"
                title="Copy secret"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <Button variant="primary" className="w-full" onClick={() => setStep('verify')}>
              I've scanned the code
            </Button>
          </div>
        )}

        {/* -- ENABLE: Verify code -- */}
        {!isEnabled && step === 'verify' && (
          <div className="space-y-4">
            <p className="text-sm text-text-muted">
              Enter the 6-digit code from your authenticator app to confirm setup.
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full px-4 py-3 rounded-lg bg-bg-elevated border border-border text-text-primary text-center text-xl font-mono tracking-widest outline-none focus:border-accent"
              autoFocus
            />
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setStep('qr')}>
                Back
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                loading={isSubmitting}
                disabled={code.length < 6}
                onClick={handleConfirmSetup}
              >
                Verify &amp; Enable
              </Button>
            </div>
          </div>
        )}

        {/* -- ENABLE: Recovery codes -- */}
        {step === 'codes' && (
          <div className="space-y-4">
            <p className="text-sm text-text-muted">
              Save these recovery codes somewhere safe. Each one can be used once to sign in if you
              lose access to your authenticator app — they won't be shown again.
            </p>
            <div className="rounded-lg bg-bg-elevated border border-border p-4 grid grid-cols-2 gap-2 font-mono text-sm text-text-primary">
              {backupCodes.map((c) => (
                <span key={c}>{c}</span>
              ))}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigator.clipboard.writeText(backupCodes.join('\n'))}
              >
                <Copy className="w-4 h-4" /> Copy
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  const blob = new Blob([backupCodes.join('\n')], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'thecoregamer-recovery-codes.txt';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Download
              </Button>
            </div>
            <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
              <input
                type="checkbox"
                checked={codesSaved}
                onChange={(e) => setCodesSaved(e.target.checked)}
                className="accent-current"
              />
              I've saved these codes
            </label>
            <Button variant="primary" className="w-full" disabled={!codesSaved} onClick={() => setStep('done')}>
              Continue
            </Button>
          </div>
        )}

        {/* -- ENABLE: Done -- */}
        {step === 'done' && (
          <div className="text-center space-y-4 py-4">
            <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto" />
            <p className="text-text-primary font-semibold">2FA is now active!</p>
            <p className="text-sm text-text-muted">
              Your account is protected with two-factor authentication.
            </p>
            <Button variant="outline" onClick={onClose} className="w-full">
              Done
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
