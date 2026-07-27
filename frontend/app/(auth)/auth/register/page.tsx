'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signIn } from 'next-auth/react';
import { registerUser } from '@/lib/api';
import { useUIStore } from '@/store/uiStore';
import { Eye, EyeOff, AlertCircle, CheckCircle, Check, Loader2, Gamepad2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const schema = z.object({
  displayName: z.string().min(1, 'Name required'),
  email: z.string().email('Valid email required'),
  username: z.string().min(3, 'Min 3 characters').regex(/^[a-zA-Z0-9_-]+$/, 'Letters, numbers, hyphens only'),
  password: z.string().min(8, 'Min 8 characters').regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Must include uppercase, lowercase, and number'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, { message: 'Passwords must match', path: ['confirmPassword'] });

type FormData = z.infer<typeof schema>;
type ButtonState = 'idle' | 'loading' | 'success' | 'error';

function getStrength(pw: string): { level: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 1, label: 'Weak', color: '#ef4444' };
  if (score <= 2) return { level: 2, label: 'Fair', color: '#f97316' };
  if (score <= 3) return { level: 3, label: 'Good', color: '#3b82f6' };
  return { level: 4, label: 'Strong', color: '#22c55e' };
}

export default function RegisterPage() {
  const { addToast } = useUIStore();
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [steamLoading, setSteamLoading] = useState(false);
  const [buttonState, setButtonState] = useState<ButtonState>('idle');
  const [ripple, setRipple] = useState<{ x: number; y: number; key: number } | null>(null);
  const [shaking, setShaking] = useState<Record<string, boolean>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const prevErrorKeysRef = useRef<string[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, touchedFields },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
  });

  const pw = watch('password') || '';
  const strength = getStrength(pw);

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
      const res = await registerUser({
        displayName: data.displayName,
        email: data.email,
        username: data.username,
        password: data.password,
      });
      if (res.success) {
        setButtonState('success');
        setTimeout(() => setSuccess(true), 600);
      } else {
        setButtonState('error');
        setSubmitError(res.error || 'Registration failed');
        addToast({ type: 'error', message: res.error || 'Registration failed' });
        setTimeout(() => setButtonState('idle'), 1500);
      }
    } catch {
      setButtonState('error');
      setSubmitError('Registration failed');
      addToast({ type: 'error', message: 'Registration failed' });
      setTimeout(() => setButtonState('idle'), 1500);
    }
  };

  const isFieldValid = (field: keyof FormData) =>
    !!touchedFields[field] && !errors[field];
  const isFieldInvalid = (field: keyof FormData) =>
    !!touchedFields[field] && !!errors[field];

  // Stagger delay: card entrance finishes at ~600ms, first field at 1000ms, +80ms each
  const fieldDelay = (index: number) => `${1000 + index * 80}ms`;

  if (success) return (
    <div className="auth-card-anim rounded-2xl bg-bg-surface border border-border p-8 text-center">
      <CheckCircle className="w-16 h-16 text-accent-green mx-auto mb-4" />
      <h2 className="text-xl font-bold text-text-primary mb-2">Check your email</h2>
      <p className="text-sm text-text-muted mb-6">We&apos;ve sent a verification link. Please check your inbox to activate your account.</p>
      <Link href="/auth/login" className="text-sm text-accent-light hover:underline">Back to Sign In</Link>
    </div>
  );

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

      <h1 className="text-[22px] font-bold text-black dark:text-white text-center mb-1.5">Create Account</h1>
      <p className="text-[13px] text-gray-500 dark:text-[#aaa] text-center mb-6">
        Already have an account? <Link href="/auth/login" className="text-blue-600 dark:text-white hover:underline transition-colors font-medium">Sign in</Link>
      </p>


      <form onSubmit={handleSubmit(onSubmit as never)} className="space-y-4">
        {/* Name field */}
        <div className={cn(shaking.displayName && 'auth-shake-active')} style={{ animationDelay: fieldDelay(0) }}>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-gray-400 dark:text-[#555]" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <input
              {...register('displayName')}
              type="text"
              placeholder="Display Name"
              aria-label="Display name"
              className="w-full bg-white dark:bg-[#222222] border border-gray-300 shadow-sm dark:border-white/[0.06] focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 text-black dark:text-white rounded-xl pl-10 pr-4 py-3 text-[13px] outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-[#555]" 
            />
          </div>
          {errors.displayName && <p className="text-red-500 text-xs mt-1 pl-1">{errors.displayName.message}</p>}
        </div>

        {/* Email field */}
        <div className={cn(shaking.email && 'auth-shake-active')} style={{ animationDelay: fieldDelay(1) }}>
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
              placeholder="Email Address"
              aria-label="Email address"
              autoComplete="email"
              className="w-full bg-white dark:bg-[#222222] border border-gray-300 shadow-sm dark:border-white/[0.06] focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 text-black dark:text-white rounded-xl pl-10 pr-4 py-3 text-[13px] outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-[#555]" 
            />
          </div>
          {errors.email && <p className="text-red-500 text-xs mt-1 pl-1">{errors.email.message}</p>}
        </div>

        {/* Username field */}
        <div className={cn(shaking.username && 'auth-shake-active')} style={{ animationDelay: fieldDelay(2) }}>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 dark:text-[#555] font-medium text-sm">@</div>
            <input
              {...register('username')}
              type="text"
              placeholder="Username"
              aria-label="Username"
              className="w-full bg-white dark:bg-[#222222] border border-gray-300 shadow-sm dark:border-white/[0.06] focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 text-black dark:text-white rounded-xl pl-10 pr-4 py-3 text-[13px] outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-[#555]" 
            />
          </div>
          {errors.username && <p className="text-red-500 text-xs mt-1 pl-1">{errors.username.message}</p>}
        </div>

        {/* Password field */}
        <div className={cn(shaking.password && 'auth-shake-active')} style={{ animationDelay: fieldDelay(3) }}>
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
              autoComplete="new-password"
              className="w-full bg-white dark:bg-[#222222] border border-gray-300 shadow-sm dark:border-white/[0.06] focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 text-black dark:text-white rounded-xl pl-10 pr-10 py-3 text-[13px] outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-[#555]"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 dark:text-[#555] hover:text-gray-600 dark:hover:text-[#888] transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          
          {pw && (
            <div className="mt-2 flex items-center gap-2 pl-1">
              <div className="flex-1 h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                <div className="h-full transition-all duration-300" style={{ width: `${strength.level * 25}%`, backgroundColor: strength.color }} />
              </div>
              <span className="text-[10px] font-medium uppercase" style={{ color: strength.color }}>{strength.label}</span>
            </div>
          )}
          {errors.password && <p className="text-red-500 text-xs mt-1 pl-1">{errors.password.message}</p>}
        </div>

        {/* Confirm Password field */}
        <div className={cn(shaking.confirmPassword && 'auth-shake-active')} style={{ animationDelay: fieldDelay(4) }}>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-gray-400 dark:text-[#555]" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <input
              {...register('confirmPassword')}
              type="password"
              placeholder="Confirm Password"
              aria-label="Confirm password"
              className="w-full bg-white dark:bg-[#222222] border border-gray-300 shadow-sm dark:border-white/[0.06] focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 text-black dark:text-white rounded-xl pl-10 pr-4 py-3 text-[13px] outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-[#555]" 
            />
          </div>
          {errors.confirmPassword && <p className="text-red-500 text-xs mt-1 pl-1">{errors.confirmPassword.message}</p>}
        </div>

        {submitError && buttonState === 'error' && (
          <div className="text-red-500 text-xs text-center">{submitError}</div>
        )}

        <div className="pt-2" style={{ animationDelay: fieldDelay(5) }}>
          <button
            type="submit"
            disabled={buttonState === 'loading' || buttonState === 'success'}
            className="w-full bg-gradient-to-r from-[#1A74DB] to-[#1D84F5] hover:from-[#2580e8] hover:to-[#2e92fc] hover:shadow-[0_0_20px_rgba(29,132,245,0.4)] text-white font-medium rounded-xl py-3 text-[13px] transition-all flex items-center justify-center gap-2 border border-blue-400/20"
          >
            {buttonState === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
            {buttonState === 'success' && <Check className="w-4 h-4" />}
            {(buttonState === 'idle' || buttonState === 'error') && 'Create Account'}
          </button>
        </div>
      </form>
    </div>
  );
}


