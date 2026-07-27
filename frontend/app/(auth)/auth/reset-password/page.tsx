'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { resetPassword } from '@/lib/api';
import { useUIStore } from '@/store/uiStore';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import { CheckCircle, Eye, EyeOff, Loader2 } from 'lucide-react';

const schema = z.object({
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, { message: 'Passwords must match', path: ['confirmPassword'] });

function ResetPasswordContent() {
  const sp = useSearchParams();
  const token = sp.get('token') || '';
  const { addToast } = useUIStore();
  const [success, setSuccess] = useState(false);
  const [show, setShow] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) });

  if (!token) {
    return (
      <div className="rounded-2xl bg-white/90 dark:bg-[#333333] backdrop-blur-md shadow-[0_8px_40px_rgba(0,0,0,0.1)] dark:shadow-2xl p-8 lg:p-10 border border-gray-200 dark:border-white/[0.04] text-center">
        <p className="text-[13px] text-gray-500 dark:text-[#777]">Invalid or missing reset token.</p>
      </div>
    );
  }

  const onSubmit = async (data: z.infer<typeof schema>) => {
    const res = await resetPassword(token, data.password);
    if (res.success) setSuccess(true);
    else addToast({ type: 'error', message: res.error || 'Failed to reset password' });
  };

  if (success) {
    return (
      <div className="rounded-2xl bg-white/90 dark:bg-[#333333] backdrop-blur-md shadow-[0_8px_40px_rgba(0,0,0,0.1)] dark:shadow-2xl p-8 lg:p-10 border border-gray-200 dark:border-white/[0.04] text-center">
        <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
        <h2 className="text-[22px] font-bold text-black dark:text-white mb-2">Password reset!</h2>
        <p className="text-[13px] text-gray-500 dark:text-[#777] mb-6">Your password has been successfully reset.</p>
        <Link href="/auth/login" className="inline-flex w-full bg-gradient-to-r from-[#1A74DB] to-[#1D84F5] hover:from-[#2580e8] hover:to-[#2e92fc] hover:shadow-[0_0_20px_rgba(29,132,245,0.4)] text-white font-medium rounded-xl py-3 text-[13px] transition-all items-center justify-center border border-blue-400/20">
          Return to Sign In
        </Link>
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

      <h1 className="text-[22px] font-bold text-black dark:text-white text-center mb-1.5">Reset Password</h1>
      <p className="text-[13px] text-gray-500 dark:text-[#777] text-center mb-8">Enter your new password below.</p>

      <form onSubmit={handleSubmit(onSubmit as never)} className="space-y-4">
        {/* New Password Field */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-gray-400 dark:text-[#555]" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <input
            {...register('password')}
            type={show ? 'text' : 'password'}
            placeholder="New password"
            aria-label="New password"
            className="w-full bg-white dark:bg-[#222222] border border-gray-300 shadow-sm dark:border-white/[0.06] focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 text-black dark:text-white rounded-xl pl-10 pr-10 py-3 text-[13px] outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-[#555]" 
          />
          <button type="button" onClick={() => setShow(!show)} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 dark:text-[#555] hover:text-gray-600 dark:hover:text-[#888] transition-colors">
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.password && <p className="text-red-500 text-xs mt-1 pl-1">{errors.password.message as string}</p>}

        {/* Confirm Password Field */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-gray-400 dark:text-[#555]" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <input
            {...register('confirmPassword')}
            type={showConfirm ? 'text' : 'password'}
            placeholder="Confirm password"
            aria-label="Confirm password"
            className="w-full bg-white dark:bg-[#222222] border border-gray-300 shadow-sm dark:border-white/[0.06] focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 text-black dark:text-white rounded-xl pl-10 pr-10 py-3 text-[13px] outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-[#555]" 
          />
          <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 dark:text-[#555] hover:text-gray-600 dark:hover:text-[#888] transition-colors">
            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.confirmPassword && <p className="text-red-500 text-xs mt-1 pl-1">{errors.confirmPassword.message as string}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-[#1A74DB] to-[#1D84F5] hover:from-[#2580e8] hover:to-[#2e92fc] hover:shadow-[0_0_20px_rgba(29,132,245,0.4)] text-white font-medium rounded-xl py-3 text-[13px] transition-all mt-4 flex items-center justify-center gap-2 border border-blue-400/20"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {isSubmitting ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<div className="rounded-2xl bg-bg-surface border border-border p-8 text-center"><Loader2 className="w-16 h-16 text-accent animate-spin mx-auto" /></div>}><ResetPasswordContent /></Suspense>;
}


