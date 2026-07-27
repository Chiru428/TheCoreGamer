'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { forgotPassword } from '@/lib/api';
import { Check, Mail, Loader2 } from 'lucide-react';

const schema = z.object({ email: z.string().email('Valid email required') });

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data: z.infer<typeof schema>) => {
    await forgotPassword(data.email);
    setSent(true);
  };

  if (sent) return (
    <div className="rounded-2xl bg-white/90 dark:bg-[#333333] backdrop-blur-md shadow-[0_8px_40px_rgba(0,0,0,0.1)] dark:shadow-2xl p-8 lg:p-10 border border-gray-200 dark:border-white/[0.04]">
      <div className="flex items-center justify-center gap-4 mb-6">
        <div className="relative z-10 flex items-center justify-center w-16 h-16 rounded-[16px] bg-gray-100 dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
           <Check className="w-8 h-8 text-blue-500" />
        </div>
      </div>
      <h2 className="text-[22px] font-bold text-black dark:text-white text-center mb-1.5">Check your email</h2>
      <p className="text-[13px] text-gray-500 dark:text-[#777] text-center mb-8">If an account exists with that email, we&apos;ve sent a password reset link.</p>
      <div className="text-center">
        <Link href="/auth/login" className="text-blue-600 dark:text-white hover:underline transition-colors font-medium text-[13px]">Back to Sign In</Link>
      </div>
    </div>
  );

  return (
    <div className="rounded-2xl bg-white/90 dark:bg-[#333333] backdrop-blur-md shadow-[0_8px_40px_rgba(0,0,0,0.1)] dark:shadow-2xl p-8 lg:p-10 border border-gray-200 dark:border-white/[0.04]">
      {/* Centered icon with dotted horizontal lines */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <div className="flex gap-1.5 opacity-30">
          <div className="w-1 h-1 rounded-full bg-gray-400 dark:bg-[#888]" />
          <div className="w-1 h-1 rounded-full bg-gray-400 dark:bg-[#888]" />
          <div className="w-1 h-1 rounded-full bg-gray-400 dark:bg-[#888]" />
          <div className="w-1 h-1 rounded-full bg-gray-400 dark:bg-[#888]" />
        </div>
        
        <div className="relative z-10 flex items-center justify-center w-12 h-12 rounded-[14px] bg-gray-100 dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
           <Mail className="w-6 h-6 text-blue-500" />
        </div>

        <div className="flex gap-1.5 opacity-30">
          <div className="w-1 h-1 rounded-full bg-gray-400 dark:bg-[#888]" />
          <div className="w-1 h-1 rounded-full bg-gray-400 dark:bg-[#888]" />
          <div className="w-1 h-1 rounded-full bg-gray-400 dark:bg-[#888]" />
          <div className="w-1 h-1 rounded-full bg-gray-400 dark:bg-[#888]" />
        </div>
      </div>

      <h1 className="text-[22px] font-bold text-black dark:text-white text-center mb-1.5">Forgot password?</h1>
      <p className="text-[13px] text-gray-500 dark:text-[#777] text-center mb-8">Enter your email and we&apos;ll send you a reset link.</p>
      
      <form onSubmit={handleSubmit(onSubmit as never)} className="space-y-4">
        <div>
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
              placeholder="you@example.com"
              aria-label="Email address"
              autoComplete="email"
              className="w-full bg-white dark:bg-[#222222] border border-gray-300 shadow-sm dark:border-white/[0.06] focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 text-black dark:text-white rounded-xl pl-10 pr-4 py-3 text-[13px] outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-[#555]" 
            />
          </div>
          {errors.email && <p className="text-red-500 text-xs mt-1 pl-1">{errors.email.message}</p>}
        </div>
        
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-[#1A74DB] to-[#1D84F5] hover:from-[#2580e8] hover:to-[#2e92fc] hover:shadow-[0_0_20px_rgba(29,132,245,0.4)] text-white font-medium rounded-xl py-3 text-[13px] transition-all mt-2 flex items-center justify-center gap-2 border border-blue-400/20"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reset Link'}
        </button>
      </form>
      
      <p className="text-[13px] text-center mt-6">
        <Link href="/auth/login" className="text-gray-500 dark:text-[#777] hover:text-black dark:hover:text-white transition-colors font-medium">Back to Sign In</Link>
      </p>
    </div>
  );
}


