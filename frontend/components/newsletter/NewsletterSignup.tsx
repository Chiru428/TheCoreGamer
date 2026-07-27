'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail } from 'lucide-react';
import { subscribeNewsletter } from '@/lib/api';
import { useUIStore } from '@/store/uiStore';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const schema = z.object({ email: z.string().email('Enter a valid email') });

export default function NewsletterSignup({ compact = false }: { compact?: boolean }) {
  const { addToast } = useUIStore();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) });
  const containerRef = useRef<HTMLFormElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(el);
          }
        });
      },
      { rootMargin: '0px 0px -100px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const onSubmit = async (data: { email: string }) => {
    const res = await subscribeNewsletter(data.email);
    if (res.success) { addToast({ type: 'success', message: 'Subscribed! Check your email to confirm.' }); reset(); }
    else addToast({ type: 'error', message: res.error || 'Failed to subscribe' });
  };

  return (
    <form
      ref={containerRef}
      onSubmit={handleSubmit(onSubmit as never)}
      className={cn(
        'newsletter-animate',
        isVisible && 'is-visible',
        !compact && 'p-6 rounded-xl bg-bg-surface border border-border'
      )}
    >
      {!compact && (
        <div className="mb-4">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
            <Mail className="w-5 h-5 text-accent-light" />
          </div>
          <h3 className="text-base font-bold text-text-primary mb-1">Newsletter</h3>
          <p className="text-sm text-text-muted">Get the latest gaming news delivered weekly.</p>
        </div>
      )}
      <div className={cn("flex gap-2 w-full", compact ? "flex-col sm:flex-row" : "flex-col")}>
        <input
          {...register('email')}
          type="email"
          aria-label="Email address"
          placeholder="your@email.com"
          className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#222222] border border-accent text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <Button type="submit" loading={isSubmitting} className={cn("w-full", compact && "sm:w-auto shrink-0")}>
          Subscribe
        </Button>
      </div>
      {errors.email && <p className="text-xs text-danger mt-1">{errors.email.message}</p>}
    </form>
  );
}



