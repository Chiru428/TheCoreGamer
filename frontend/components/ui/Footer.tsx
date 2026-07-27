'use client';

import { useState, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Mail as MailIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';


import { FOOTER_LINKS, SITE_NAME } from '@/lib/constants';
import { useUIStore } from '@/store/uiStore';
import NewsletterSignup from '@/components/newsletter/NewsletterSignup';
import { subscribeNewsletter } from '@/lib/api';

export default function Footer() {
  const { toggleCookieBanner, addToast } = useUIStore();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const footerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const pathname = usePathname();
  const isHomePage = pathname === '/';

  useEffect(() => {
    const el = footerRef.current;
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
      { rootMargin: '0px 0px -40px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);


  return (
    <div className="relative w-full pb-0" style={{ background: 'var(--bg)', fontFamily: "'Rubik', sans-serif" }}>
      {/* -- WEEKLY DIGEST FLOATING BANNER -- */}
      {isHomePage && (
        <div className="w-full px-4 lg:px-8 relative z-20 -mb-20 md:-mb-28 mt-8 md:mt-12">
          <div className="max-w-[1140px] w-full mx-auto rounded-3xl shadow-2xl flex flex-col md:flex-row relative" style={{ background: '#1e40af' }}>
            
            {/* Left: Gaming Image */}
            <div className="w-full md:w-[45%] flex items-center justify-center p-4 md:p-6 overflow-hidden rounded-l-3xl">
              <img 
                src="/gaming-newsletter-transparent.png" 
                alt="Gaming Controller" 
                className="w-full h-full max-h-[180px] md:max-h-[240px] object-contain drop-shadow-2xl scale-[1.2] md:scale-[1.3] translate-y-4 md:translate-y-8" 
              />
            </div>

            {/* Right: Newsletter Form */}
            <div className="w-full md:w-[55%] px-8 py-8 md:py-12 md:pr-12 md:pl-0 flex flex-col justify-center z-10 relative">
              <h2 className="text-2xl md:text-[28px] font-bold text-white mb-3 leading-tight">
                Subscribe to our newsletter to get updates to our latest articles
              </h2>
              <p className="text-white/80 text-[14px] mb-6 font-medium">
                Join gamers by subscribing to our newsletter
              </p>
              
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!email) return;
                setIsLoading(true);
                try {
                  const res = await subscribeNewsletter(email);
                  if (res.success) {
                    if (res.message === "Already subscribed") {
                      addToast({ type: 'success', message: 'You are already subscribed!' });
                    } else {
                      addToast({ type: 'success', message: res.message || 'Subscribed! Check your email to confirm.' });
                    }
                    setEmail('');
                  } else {
                    addToast({ type: 'error', message: res.error || 'Failed to subscribe' });
                  }
                } catch (err) {
                  addToast({ type: 'error', message: 'An unexpected error occurred' });
                } finally {
                  setIsLoading(false);
                }
              }} className="relative w-full max-w-[440px]">
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                placeholder="Enter your email" 
                className="w-full bg-white/20 border border-white/30 text-white placeholder-white rounded-full py-3.5 px-6 pr-[130px] focus:outline-none focus:ring-2 focus:ring-white/50 transition-all text-sm disabled:opacity-50"
                style={{ '--text': '#ffffff' } as React.CSSProperties}
              />
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="absolute right-1.5 top-1.5 bottom-1.5 bg-white text-[#1e40af] text-sm font-bold rounded-full px-6 transition-transform hover:scale-105 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isLoading ? 'Subscribing' : 'Subscribe'}
                </button>
              </form>
              
              <p className="text-white/70 text-[11px] mt-4 leading-relaxed">
                You will be able to unsubscribe at any time.<br/>
                Read our privacy policy <Link href="/privacy" className="underline hover:text-white">here</Link>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* -- FOOTER MAIN -- */}
      <footer
        className={cn("transition-all duration-300", isHomePage ? "pt-32 md:pt-40" : "pt-8 md:pt-10")}
        style={{
          background: 'var(--footer-bg)',
          borderTop: '1px solid var(--border)',
          // Footer always uses the same dark slate as the header regardless of site theme,
          // so text/border vars are re-pinned to their dark-theme values here — otherwise
          // light theme would render black text (--text-strong) on this dark background.
          '--text': '#ffffff',
          '--text-strong': '#ffffff',
          '--muted': 'rgba(255,255,255,0.75)',
          '--text-muted': 'rgba(255,255,255,0.75)',
          '--border': 'rgba(255,255,255,0.14)',
        } as CSSProperties}
      >
        <div ref={footerRef} className="max-w-[1140px] mx-auto px-7 pb-6 flex flex-col lg:flex-row gap-6 lg:gap-20">

          {/* Col 1: Brand */}
          <div className={cn("footer-col-animate w-full lg:w-[35%] flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-6", isVisible && "is-visible")} style={isVisible ? { transitionDelay: '0ms' } : {}}>
            <Link href="/" className="flex items-center" aria-label="TheCoreGamer Home">
              <div className="flex items-center">
                <img src="/logo_white.svg?v=2" alt="TheCoreGamer Logo" className="h-[24px] w-auto object-contain" />
              </div>
            </Link>

            <div className="flex items-center gap-3">
              {[
                { href: 'https://instagram.com', iconSrc: '/icons/links/instagram.svg', label: 'Instagram' },
                { href: 'https://twitter.com', iconSrc: '/icons/links/twitter.svg', label: 'Twitter' },
                { href: 'https://facebook.com', iconSrc: '/icons/links/facebook.svg', label: 'Facebook' },
              ].map(({ href, iconSrc, label }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                  className="transition-transform hover:scale-110">
                  <img src={iconSrc} alt={label} className="w-7 h-7 object-contain rounded-md" />
                </a>
              ))}
            </div>
          </div>

          {/* 3 Columns Wrapper */}
          <div className="w-full lg:flex-1 flex justify-center lg:justify-end items-center">
            {/* Col 2: Company Links */}
            <div className={cn("footer-col-animate", isVisible && "is-visible")} style={isVisible ? { transitionDelay: '100ms' } : {}}>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '24px', justifyContent: 'center' }}>
              {[
                { label: 'About Us', href: '/about' },
                { label: 'Contact', href: '/contact' },
                { label: 'Advertise', href: '/advertise' },
              ].map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="transition-colors hover:text-[#4270ed] font-bold hover:underline" style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>


          </div>

        </div>

        {/* Bottom bar */}
        <div className="border-t py-6 px-4" style={{ borderColor: 'var(--border)' }}>
          <div className="max-w-[1140px] mx-auto flex flex-col-reverse md:flex-row items-center justify-between gap-6 md:gap-4">
            <p className="text-center md:text-left font-bold" style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              © Copyright by TheCoreGamer. All rights reserved.
            </p>
            <nav aria-label="Footer navigation" className="flex flex-wrap items-center justify-center md:justify-end gap-x-4 md:gap-x-6 gap-y-3">
              {FOOTER_LINKS.legal.map((link) => (
                <Link key={link.href} href={link.href} className="transition-colors hover:text-[#4270ed] font-bold hover:underline" style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{link.label}</Link>
              ))}
              <Link href="/sitemap.xml" className="transition-colors hover:text-[#4270ed] font-bold hover:underline" style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Site Map</Link>
            </nav>
          </div>
        </div>
      </footer>

      {/* -- BOTTOM NEWSLETTER BAR (NOT HOMEPAGE) -- */}
      {!isHomePage && (
        <div className="w-full py-5 flex items-center justify-center border-t border-white/5" style={{ background: '#181818' }}>
          <div className="max-w-[1140px] px-4 w-full flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6">
            <span className="text-white font-bold text-[15px] md:text-[16px] text-center">
              Level up your inbox with the latest gaming news, reviews, and guides.
            </span>
            <form onSubmit={async (e) => {
                e.preventDefault();
                if (!email) return;
                setIsLoading(true);
                try {
                  const res = await subscribeNewsletter(email);
                  if (res.success) {
                    if (res.message === "Already subscribed") {
                      addToast({ type: 'success', message: 'You are already subscribed!' });
                    } else {
                      addToast({ type: 'success', message: res.message || 'Subscribed! Check your email to confirm.' });
                    }
                    setEmail('');
                  } else {
                    addToast({ type: 'error', message: res.error || 'Failed to subscribe' });
                  }
                } catch (err) {
                  addToast({ type: 'error', message: 'An unexpected error occurred' });
                } finally {
                  setIsLoading(false);
                }
              }} className="flex items-stretch w-full md:w-auto max-w-[400px]">
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                placeholder="Email Address" 
                className="w-full md:w-[220px] bg-white text-black placeholder-gray-500 py-1.5 px-3 text-[14px] focus:outline-none"
                style={{ '--text': '#000000' } as React.CSSProperties}
              />
              <button 
                type="submit"
                disabled={isLoading}
                className="bg-transparent text-white border-2 border-white text-[13px] font-bold py-1.5 px-5 ml-2 transition-colors hover:bg-white hover:text-black active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Join'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}