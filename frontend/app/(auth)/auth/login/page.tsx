'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUIStore } from '@/store/uiStore';
import { Eye, EyeOff, AlertCircle, Check, Loader2, Gamepad2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const schema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(1, 'Password required'),
});

type FormData = z.infer<typeof schema>;
type ButtonState = 'idle' | 'loading' | 'success' | 'error';

export default function LoginPage() {
  const router = useRouter();
  const { addToast } = useUIStore();
  const [showPassword, setShowPassword] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'discord' | 'steam' | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [buttonState, setButtonState] = useState<ButtonState>('idle');
  const [ripple, setRipple] = useState<{ x: number; y: number; key: number } | null>(null);
  const [shaking, setShaking] = useState<Record<string, boolean>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const prevErrorKeysRef = useRef<string[]>([]);

  // Two-factor challenge step — entered after a 2FA_REQUIRED response, holding
  // the already-validated credentials so they can be resubmitted with the code.
  const [pendingCredentials, setPendingCredentials] = useState<{ email: string; password: string } | null>(null);
  const [twoFactorMode, setTwoFactorMode] = useState<'totp' | 'recovery'>('totp');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorSubmitting, setTwoFactorSubmitting] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, touchedFields },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
  });

  // Detect new validation errors and trigger shake
  const errorKeyStr = useMemo(() => Object.keys(errors).sort().join(','), [errors]);

  useEffect(() => {
    const currentKeys = errorKeyStr ? errorKeyStr.split(',') : [];
    const newErrors = currentKeys.filter(key => !prevErrorKeysRef.current.includes(key));
    newErrors.forEach(key => {
      setShaking(prev => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setShaking(prev => ({ ...prev, [key]: false }));
      }, 400);
    });
    prevErrorKeysRef.current = currentKeys;
  }, [errorKeyStr]);

  const handleOAuth = async (provider: 'google' | 'discord' | 'steam') => {
    const label = provider === 'google' ? 'Google' : provider === 'discord' ? 'Discord' : 'Steam';
    try {
      setOauthLoading(provider);
      setOauthError(null);
      await signIn(provider, { callbackUrl: '/' });
    } catch {
      const msg = `Failed to sign in with ${label}. Please try again or use email/password.`;
      setOauthError(msg);
      addToast({ type: 'error', message: msg });
      setOauthLoading(null);
    }
  };

  const handleRipple = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setRipple({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      key: Date.now(),
    });
  }, []);

  const onSubmit = async (data: FormData) => {
    setButtonState('loading');
    setSubmitError(null);
    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        if (result.error === '2FA_REQUIRED') {
          setPendingCredentials({ email: data.email, password: data.password });
          setButtonState('idle');
          return;
        }
        const friendlyError = result.error === 'EMAIL_NOT_VERIFIED'
          ? 'Please verify your email before signing in. Check your inbox for the verification link.'
          : result.error || 'Invalid credentials';
        setButtonState('error');
        setSubmitError(friendlyError);
        addToast({ type: 'error', message: friendlyError });
        setTimeout(() => setButtonState('idle'), 1500);
      } else {
        setButtonState('success');
        addToast({ type: 'success', message: 'Welcome back!' });
        setTimeout(() => router.push('/'), 800);
      }
    } catch {
      setButtonState('error');
      setSubmitError('Login failed');
      addToast({ type: 'error', message: 'Login failed' });
      setTimeout(() => setButtonState('idle'), 1500);
    }
  };

  const handleTwoFactorSubmit = async () => {
    if (!pendingCredentials || !twoFactorCode) return;
    setTwoFactorSubmitting(true);
    setTwoFactorError(null);
    try {
      const result = await signIn('credentials', {
        email: pendingCredentials.email,
        password: pendingCredentials.password,
        totpCode: twoFactorMode === 'totp' ? twoFactorCode : undefined,
        recoveryCode: twoFactorMode === 'recovery' ? twoFactorCode : undefined,
        redirect: false,
      });

      if (result?.error) {
        const msg = result.error === '2FA_REQUIRED' ? 'Invalid code' : result.error || 'Invalid code';
        setTwoFactorError(msg);
        setTwoFactorCode('');
        return;
      }

      addToast({ type: 'success', message: 'Welcome back!' });
      router.push('/');
    } catch {
      setTwoFactorError('Verification failed. Try again.');
    } finally {
      setTwoFactorSubmitting(false);
    }
  };

  const isFieldValid = (field: keyof FormData) =>
    !!touchedFields[field] && !errors[field];
  const isFieldInvalid = (field: keyof FormData) =>
    !!touchedFields[field] && !!errors[field];

  if (pendingCredentials) {
    return (
      <div className="rounded-2xl bg-white/90 dark:bg-[#333333] backdrop-blur-md shadow-[0_8px_40px_rgba(0,0,0,0.1)] dark:shadow-2xl p-8 lg:p-10 border border-gray-200 dark:border-white/[0.04]">
        <h1 className="text-[22px] font-bold text-black dark:text-white text-center mb-1.5">Two-Factor Authentication</h1>
        <p className="text-[13px] text-gray-500 dark:text-[#aaa] text-center mb-8">
          {twoFactorMode === 'totp'
            ? 'Enter the 6-digit code from your authenticator app'
            : 'Enter one of your saved recovery codes'}
        </p>

        <div className="space-y-4">
          <input
            type="text"
            inputMode={twoFactorMode === 'totp' ? 'numeric' : 'text'}
            maxLength={twoFactorMode === 'totp' ? 6 : 11}
            placeholder={twoFactorMode === 'totp' ? '000000' : 'XXXXX-XXXXX'}
            value={twoFactorCode}
            onChange={(e) => {
              const raw = e.target.value;
              setTwoFactorCode(twoFactorMode === 'totp' ? raw.replace(/\D/g, '').slice(0, 6) : raw.toUpperCase().slice(0, 11));
            }}
            autoFocus
            className="w-full bg-white dark:bg-[#222222] border border-gray-300 shadow-sm dark:border-white/[0.06] focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 text-black dark:text-white rounded-xl px-4 py-3 text-center text-lg font-mono tracking-widest outline-none transition-all"
          />

          {twoFactorError && <p className="text-red-500 text-xs text-center">{twoFactorError}</p>}

          <button
            type="button"
            disabled={twoFactorSubmitting || !twoFactorCode}
            onClick={handleTwoFactorSubmit}
            className="w-full bg-gradient-to-r from-[#1A74DB] to-[#1D84F5] hover:from-[#2580e8] hover:to-[#2e92fc] text-white font-medium rounded-xl py-3 text-[13px] transition-all flex items-center justify-center gap-2 border border-blue-400/20 disabled:opacity-60"
          >
            {twoFactorSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Verify
          </button>

          <div className="flex items-center justify-between text-[11px] pt-2">
            <button
              type="button"
              onClick={() => {
                setPendingCredentials(null);
                setTwoFactorCode('');
                setTwoFactorError(null);
                setTwoFactorMode('totp');
              }}
              className="text-gray-500 dark:text-[#aaa] hover:text-gray-800 dark:hover:text-white transition-colors"
            >
              Back to login
            </button>
            <button
              type="button"
              onClick={() => {
                setTwoFactorMode((m) => (m === 'totp' ? 'recovery' : 'totp'));
                setTwoFactorCode('');
                setTwoFactorError(null);
              }}
              className="text-blue-600 dark:text-white hover:underline transition-colors font-medium"
            >
              {twoFactorMode === 'totp' ? 'Use a recovery code instead' : 'Use authenticator app instead'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white/90 dark:bg-[#333333] backdrop-blur-md shadow-[0_8px_40px_rgba(0,0,0,0.1)] dark:shadow-2xl p-8 lg:p-10 border border-gray-200 dark:border-white/[0.04]">
      {/* Centered logo with dotted horizontal lines */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <div className="flex gap-1.5 opacity-30">
          <div className="w-1 h-1 rounded-full bg-gray-400 dark:bg-[#888]" />
          <div className="w-1 h-1 rounded-full bg-gray-400 dark:bg-[#888]" />
          <div className="w-1 h-1 rounded-full bg-gray-400 dark:bg-[#888]" />
          <div className="w-1 h-1 rounded-full bg-gray-400 dark:bg-[#888]" />
        </div>
        
        <div className="relative z-10 flex items-center">
          <img src="/logo_black.svg?v=2" alt="TheCoreGamer" className="h-[20px] w-auto block dark:hidden" />
          <img src="/logo_white.svg?v=2" alt="TheCoreGamer" className="h-[20px] w-auto hidden dark:block" />
        </div>

        <div className="flex gap-1.5 opacity-30">
          <div className="w-1 h-1 rounded-full bg-gray-400 dark:bg-[#888]" />
          <div className="w-1 h-1 rounded-full bg-gray-400 dark:bg-[#888]" />
          <div className="w-1 h-1 rounded-full bg-gray-400 dark:bg-[#888]" />
          <div className="w-1 h-1 rounded-full bg-gray-400 dark:bg-[#888]" />
        </div>
      </div>

      <h1 className="text-[22px] font-bold text-black dark:text-white text-center mb-1.5">Welcome Back</h1>
      <p className="text-[13px] text-gray-500 dark:text-[#aaa] text-center mb-8">
        Don&apos;t have an account yet?{' '}
        <Link href="/auth/register" className="text-blue-600 dark:text-white hover:underline transition-colors font-medium">Sign up</Link>
      </p>

      <form onSubmit={handleSubmit(onSubmit as never)} className="space-y-4">
        {/* Email field */}
        <div className={cn(shaking.email && 'auth-shake-active')}>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-gray-400 dark:text-[#555]" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>
            <input
              {...register('email')}
              type="email"
              placeholder="email address"
              aria-label="Email address"
              autoComplete="email"
              className="w-full bg-white dark:bg-[#222222] border border-gray-300 shadow-sm dark:border-white/[0.06] focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 text-black dark:text-white rounded-xl pl-10 pr-4 py-3 text-[13px] outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-[#555]" 
            />
          </div>
          {errors.email && <p className="text-red-500 text-xs mt-1 pl-1">{errors.email.message}</p>}
        </div>

        {/* Password field */}
        <div className={cn(shaking.password && 'auth-shake-active')}>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-gray-400 dark:text-[#555]" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              aria-label="Password"
              autoComplete="current-password"
              className="w-full bg-white dark:bg-[#222222] border border-gray-300 shadow-sm dark:border-white/[0.06] focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 text-black dark:text-white rounded-xl pl-10 pr-10 py-3 text-[13px] outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-[#555]" 
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 dark:text-[#555] hover:text-gray-600 dark:hover:text-[#888] transition-colors">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="text-red-500 text-xs mt-1 pl-1">{errors.password.message}</p>}
        </div>

        {submitError && buttonState === 'error' && (
          <div className="text-red-500 text-xs text-center">{submitError}</div>
        )}

        <button
          type="submit"
          disabled={buttonState === 'loading' || buttonState === 'success'}
          className="w-full bg-gradient-to-r from-[#1A74DB] to-[#1D84F5] hover:from-[#2580e8] hover:to-[#2e92fc] hover:shadow-[0_0_20px_rgba(29,132,245,0.4)] text-white font-medium rounded-xl py-3 text-[13px] transition-all mt-2 flex items-center justify-center gap-2 border border-blue-400/20"
        >
          {buttonState === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
          {buttonState === 'success' && <Check className="w-4 h-4" />}
          {(buttonState === 'idle' || buttonState === 'error') && 'Login'}
        </button>
      </form>

      <div className="mt-5 mb-5 text-center">
        <Link href="/auth/forgot-password" className="text-[11px] text-gray-500 dark:text-[#aaa] hover:text-gray-800 dark:hover:text-white transition-colors">Forgot password?</Link>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-[1px] bg-gray-200 dark:bg-[#1a1a1a]" />
        <span className="text-[10px] text-gray-400 dark:text-[#aaa] tracking-[2px]">OR</span>
        <div className="flex-1 h-[1px] bg-gray-200 dark:bg-[#1a1a1a]" />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => handleOAuth('google')}
          disabled={oauthLoading !== null}
          aria-label="Continue with Google"
          className="flex-1 h-11 flex items-center justify-center bg-white dark:bg-[#222222] hover:bg-gray-50 border-gray-300 shadow-sm dark:hover:bg-[#1a1a1a] hover:-translate-y-0.5 border border-gray-200 dark:border-white/[0.04] rounded-xl transition-all"
        >
          {oauthLoading === 'google' ? <Loader2 className="w-4 h-4 animate-spin text-gray-500 dark:text-[#666]" /> : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleOAuth('discord')}
          disabled={oauthLoading !== null}
          aria-label="Continue with Discord"
          className="flex-1 h-11 flex items-center justify-center bg-white dark:bg-[#222222] hover:bg-gray-50 border-gray-300 shadow-sm dark:hover:bg-[#1a1a1a] hover:-translate-y-0.5 border border-gray-200 dark:border-white/[0.04] rounded-xl transition-all"
        >
          {oauthLoading === 'discord' ? <Loader2 className="w-4 h-4 animate-spin text-gray-500 dark:text-[#666]" /> : (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="#5865F2">
              <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/>
            </svg>
          )}
        </button>

        {process.env.NEXT_PUBLIC_STEAM_ENABLED === 'true' && (
          <button
            type="button"
            onClick={() => handleOAuth('steam')}
            disabled={oauthLoading !== null}
            aria-label="Continue with Steam"
            className="flex-1 h-11 flex items-center justify-center bg-white dark:bg-[#222222] hover:bg-gray-50 border-gray-300 shadow-sm dark:hover:bg-[#1a1a1a] hover:-translate-y-0.5 border border-gray-200 dark:border-white/[0.04] rounded-xl transition-all"
          >
            {oauthLoading === 'steam' ? <Loader2 className="w-4 h-4 animate-spin text-gray-500 dark:text-[#666]" /> : (
              <svg width="15" height="15" viewBox="0 0 24 24" className="fill-black dark:fill-white">
                <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.497 1.009 2.455-.397.957-1.497 1.41-2.454 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.252 0-2.265-1.014-2.265-2.265z"/>
              </svg>
            )}
          </button>
        )}
      </div>

      {oauthError && (
        <div className="mt-4 text-center text-red-500 text-xs">
          {oauthError}
        </div>
      )}
    </div>
  );
}


