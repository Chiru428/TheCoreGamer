'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUIStore } from '@/store/uiStore';
import { Mail, MessageSquare, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import Link from 'next/link';

const schema = z.object({ 
  name: z.string().min(1, 'Name is required'), 
  email: z.string().email('Valid email required'), 
  subject: z.string().min(1, 'Subject is required'), 
  message: z.string().min(10, 'Message must be at least 10 characters') 
});

export default function ContactPage() {
  const { addToast } = useUIStore();
  const [buttonState, setButtonState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const { register, handleSubmit, reset, formState: { errors } } = useForm({ 
    resolver: zodResolver(schema),
    mode: 'onTouched'
  });

  const onSubmit = async () => {
    setButtonState('loading');
    // Simulate network delay
    await new Promise(r => setTimeout(r, 1000));
    setButtonState('success');
    addToast({ type: 'success', message: 'Message sent! We\'ll get back to you soon.' });
    reset();
    setTimeout(() => setButtonState('idle'), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 md:py-24">
      <div className="rounded-2xl bg-white/90 dark:bg-[#333333] backdrop-blur-md shadow-[0_8px_40px_rgba(0,0,0,0.1)] dark:shadow-2xl p-8 lg:p-12 border border-gray-200 dark:border-white/[0.04]">
        
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="relative z-10 flex items-center gap-3 logo-container">
            <div className="flex flex-col items-center justify-center leading-none text-center">
              <div className="relative w-[60px] h-[60px] mb-2">
                <img 
                  src="/logo_circle_black.svg?v=2" 
                  alt="TCG Logo" 
                  className="w-full h-full object-contain block dark:hidden"
                />
                <img 
                  src="/logo_circle_white.svg?v=2" 
                  alt="TCG Logo" 
                  className="w-full h-full object-contain hidden dark:block"
                />
              </div>
              <span className="logo-text text-gray-600 dark:text-[#ccc]" style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 600, fontSize: '18px', letterSpacing: '0.5px', marginTop: '4px', textTransform: 'uppercase' }}>
                Contact Support
              </span>
            </div>
          </div>
        </div>

        <p className="text-base text-gray-500 dark:text-[#777] text-center mb-10 mt-2">
          Have a question or feedback? We&apos;d love to hear from you.
        </p>

        <form onSubmit={handleSubmit(onSubmit as never)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name field */}
            <div className="relative">
              <input 
                {...register('name')} 
                type="text" 
                placeholder="Your Name" 
                className="w-full bg-white dark:bg-[#222222] border border-gray-300 shadow-sm dark:border-white/[0.06] focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 text-black dark:text-white rounded-xl px-4 py-3.5 text-[15px] outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-[#555]" 
              />
              {errors.name && <p className="text-red-500 text-xs mt-1 pl-1">{errors.name?.message as string}</p>}
            </div>

            {/* Email field */}
            <div className="relative">
              <input 
                {...register('email')} 
                type="email" 
                placeholder="Email Address" 
                className="w-full bg-white dark:bg-[#222222] border border-gray-300 shadow-sm dark:border-white/[0.06] focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 text-black dark:text-white rounded-xl px-4 py-3.5 text-[15px] outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-[#555]" 
              />
              {errors.email && <p className="text-red-500 text-xs mt-1 pl-1">{errors.email?.message as string}</p>}
            </div>
          </div>

          {/* Subject field */}
          <div className="relative">
            <input 
              {...register('subject')} 
              type="text" 
              placeholder="Subject" 
              className="w-full bg-white dark:bg-[#222222] border border-gray-300 shadow-sm dark:border-white/[0.06] focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 text-black dark:text-white rounded-xl px-4 py-3.5 text-[15px] outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-[#555]" 
            />
            {errors.subject && <p className="text-red-500 text-xs mt-1 pl-1">{errors.subject?.message as string}</p>}
          </div>

          {/* Message field */}
          <div className="relative">
            <textarea 
              {...register('message')} 
              rows={5} 
              placeholder="Your Message..."
              className="w-full bg-white dark:bg-[#222222] border border-gray-300 shadow-sm dark:border-white/[0.06] focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 text-black dark:text-white rounded-xl px-4 py-3.5 text-[15px] outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-[#555] resize-y" 
            />
            {errors.message && <p className="text-red-500 text-xs mt-1 pl-1">{errors.message?.message as string}</p>}
          </div>

          <button
            type="submit"
            disabled={buttonState === 'loading' || buttonState === 'success'}
            className="w-full bg-gradient-to-r from-[#1A74DB] to-[#1D84F5] hover:from-[#2580e8] hover:to-[#2e92fc] hover:shadow-[0_0_20px_rgba(29,132,245,0.4)] text-white font-medium rounded-xl py-3.5 text-[15px] transition-all mt-6 flex items-center justify-center gap-2 border border-blue-400/20"
          >
            {buttonState === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
            {buttonState === 'success' && <Check className="w-4 h-4" />}
            {(buttonState === 'idle' || buttonState === 'error') && (
              <>
                <MessageSquare className="w-4 h-4" />
                Send Message
              </>
            )}
          </button>
        </form>

        <div className="flex items-center my-8">
          <div className="flex-1 border-t border-gray-200 dark:border-white/[0.04]"></div>
          <span className="px-4 text-[13px] text-gray-400 dark:text-[#666] font-medium uppercase tracking-wider">or</span>
          <div className="flex-1 border-t border-gray-200 dark:border-white/[0.04]"></div>
        </div>

        <div className="flex flex-col items-center justify-center text-center">
           <Mail className="w-6 h-6 text-[#1A74DB] mb-3" />
           <p className="text-[15px] text-gray-500 dark:text-[#777]">
             You can also email us directly at
           </p>
           <a href="mailto:support@thecoregamer.com" className="text-base font-medium text-black dark:text-white hover:text-[#1A74DB] dark:hover:text-[#1A74DB] transition-colors mt-1">
             support@thecoregamer.com
           </a>
        </div>
      </div>
    </div>
  );
}


