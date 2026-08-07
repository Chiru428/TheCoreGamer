'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Menu, X, User, LogOut, Bookmark, Shield, ChevronDown, Gamepad2, Star, Newspaper, BookOpen, Trophy, Tag, Play, Settings, Bell, Map, Sun, Moon, Home, UserCircle } from 'lucide-react';
import { NAV_LINKS, STAFF_ROLES } from '@/lib/constants';
import { contentTypePath } from '@/lib/seo';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { cn, getInitials } from '@/lib/utils';
import type { Article } from '@/types';
import NotificationBell from './NotificationBell';
import NavDropdown from './NavDropdown';

/** Small rounded-pill link used in the account row (My account / Notifications / Sign in). */
function HeaderPill({ href, icon: Icon, children, accent = false, onClick, underlineOnHover = false, className }: { href: string; icon: React.ElementType; children: React.ReactNode; accent?: boolean; onClick?: () => void; underlineOnHover?: boolean; className?: string }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'group flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-bold whitespace-nowrap transition-all hover:opacity-90 active:scale-95',
        accent ? 'border-2' : 'border',
        className
      )}
      style={{
        color: className?.includes('text-') ? undefined : 'var(--nav-link)',
        borderColor: accent ? 'var(--accent)' : 'rgba(255,255,255,0.18)',
        background: accent ? 'transparent' : 'rgba(255,255,255,0.06)',
      }}
    >
      <Icon className="w-3 h-3" />
      <span className={underlineOnHover ? 'group-hover:underline' : undefined}>{children}</span>
    </Link>
  );
}

function MobileNavItem({ link, index, setMobileMenuOpen, pathname, isActive, getNavIcon }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const active = isActive(link);
  const titleCaseLabel = link.label.charAt(0).toUpperCase() + link.label.slice(1).toLowerCase();
  
  if (!link.children) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.04, duration: 0.2, ease: 'easeOut' }}
      >
        <Link
          href={link.href}
          onClick={() => setMobileMenuOpen(false)}
          className={`flex items-center gap-4 px-4 py-3 rounded-xl font-semibold text-[16px] transition-colors ${active ? 'bg-accent-dim text-accent' : 'text-[color:var(--text)] hover:bg-black/5 dark:hover:bg-white/5'}`}
        >
          <span className={active ? 'text-accent' : 'text-gray-500 dark:text-gray-400'}>
            {getNavIcon(titleCaseLabel)}
          </span>
          {titleCaseLabel}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.2, ease: 'easeOut' }}
      className="flex flex-col"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between px-4 py-3 rounded-xl font-semibold text-[16px] transition-colors ${active ? 'bg-accent-dim text-accent' : 'text-[color:var(--text)] hover:bg-black/5 dark:hover:bg-white/5'}`}
      >
        <div className="flex items-center gap-4">
          <span className={active ? 'text-accent' : 'text-gray-500 dark:text-gray-400'}>
            {getNavIcon(titleCaseLabel)}
          </span>
          {titleCaseLabel}
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} text-gray-400`} />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-1 pl-[52px] pr-4 py-2">
              {link.children.map((child: any) => {
                const childActive = pathname === child.href;
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block py-2.5 text-[14px] font-medium transition-colors ${childActive ? 'text-accent' : 'text-gray-500 dark:text-gray-400 hover:text-[color:var(--text)]'}`}
                  >
                    {child.label}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Header({ tickerArticles = [] }: { tickerArticles?: Article[] }) {
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading: authLoading, clearSession } = useAuthStore();
  const { mobileMenuOpen, setMobileMenuOpen, setSearchOverlayOpen, theme, setTheme } = useUIStore();
  const [themeMounted, setThemeMounted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isScrollingUp, setIsScrollingUp] = useState(true);
  const lastScrollY = useRef(0);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const searchBtnRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const tickerRef = useRef<HTMLDivElement>(null);
  // FIX: ref for focus trap — first focusable element in mobile drawer
  const drawerFirstFocusRef = useRef<HTMLAnchorElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setThemeMounted(true);
    const stored = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (stored && stored !== theme) setTheme(stored);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) setAccountMenuOpen(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsScrolled(currentScrollY > 20);
      
      if (currentScrollY < lastScrollY.current || currentScrollY <= 20) {
        setIsScrollingUp(true);
      } else if (currentScrollY > lastScrollY.current && currentScrollY > 20) {
        setIsScrollingUp(false);
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Measure the header's actual rendered height instead of hardcoding it — the main row alone
  // is 70px on mobile / 90px on desktop, plus the 36px ticker row when it's visible, so a fixed
  // px value drifts out of sync across breakpoints. Sidebars/ad slots/sticky tab bars elsewhere
  // read this var instead of a hardcoded offset, so they stay aligned in every state.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const updateOffset = () => {
      document.documentElement.style.setProperty('--sticky-offset', `${el.getBoundingClientRect().height}px`);
    };
    updateOffset();
    const ro = new ResizeObserver(updateOffset);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Translate vertical mouse wheel scrolling into horizontal scrolling for the ticker
  useEffect(() => {
    const el = tickerRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        // Prevent vertical page scroll
        e.preventDefault();
        // Scroll horizontally instead
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [tickerArticles.length]);

  useEffect(() => { setMobileMenuOpen(false); setAccountMenuOpen(false); }, [pathname, setMobileMenuOpen]);

  // FIX: Focus trap for mobile menu — keyboard users can't tab behind the overlay
  const handleDrawerKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setMobileMenuOpen(false);
      hamburgerRef.current?.focus();
      return;
    }
    if (e.key !== 'Tab') return;
    const drawer = e.currentTarget as HTMLElement;
    const focusable = drawer.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, [setMobileMenuOpen]);

  // FIX: Move focus into drawer when it opens
  useEffect(() => {
    if (mobileMenuOpen) {
      setTimeout(() => drawerFirstFocusRef.current?.focus(), 50);
    }
  }, [mobileMenuOpen]);

  // FIX: Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => { 
      document.body.style.overflow = ''; 
      document.documentElement.style.overflow = ''; 
    };
  }, [mobileMenuOpen]);

  // FIX: Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mobileMenuOpen, setMobileMenuOpen]);

  const isActive = (link: { href: string; exact?: boolean }) =>
    link.exact ? pathname === link.href : pathname.startsWith(link.href);

  // Parent items with children are "active" when the current path matches one of their children.
  const isParentActive = (link: { href: string; children?: readonly { href: string }[] }) =>
    link.children ? link.children.some((c) => pathname === c.href || pathname.startsWith(`${c.href}/`)) : false;

  const getNavIcon = (label: string) => {
    switch (label) {
      case 'Home': return <Home className="w-[18px] h-[18px]" />;
      case 'Games': return <Gamepad2 className="w-[18px] h-[18px]" />;
      case 'Articles': return <Newspaper className="w-[18px] h-[18px]" />;
      case 'Guides': return <BookOpen className="w-[18px] h-[18px]" />;
      case 'Reviews': return <Star className="w-[18px] h-[18px]" />;
      case 'News': return <Newspaper className="w-[18px] h-[18px]" />;
      case 'Opinions': return <BookOpen className="w-[18px] h-[18px]" />;
      case 'Features': return <Newspaper className="w-[18px] h-[18px]" />;
      case 'Lists': return <Tag className="w-[18px] h-[18px]" />;
      case 'Mod Guides': return <BookOpen className="w-[18px] h-[18px]" />;
      case 'Walkthroughs': return <Map className="w-[18px] h-[18px]" />;
      case 'Videos': return <Play className="w-[18px] h-[18px]" />;
      case 'Deals': return <Tag className="w-[18px] h-[18px]" />;
      default: return <Gamepad2 className="w-[18px] h-[18px]" />;
    }
  };

  return (
  <>
    <header
      ref={headerRef}
      className={cn("sticky top-0 z-50 transition-shadow duration-300", isScrolled ? "shadow-lg" : "")}
      style={{ background: 'var(--nav-bg)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', fontFamily: "'Gibson', sans-serif" }}
    >
      {/* Row 1 — trending ticker */}
      <AnimatePresence initial={false}>
        {tickerArticles.length > 0 && (
          <motion.div
            key="ticker"
            initial={{ height: 0, opacity: 0 }}
            // Open the row first, then fade the text in — otherwise the fixed-height
            // text is revealed while the row is only partly open and gets sliced
            // against the nav row below.
            animate={{
              height: 'auto',
              opacity: 1,
              transition: {
                height: { duration: 0.28, ease: 'easeInOut' },
                opacity: { duration: 0.18, delay: 0.1, ease: 'easeOut' },
              },
            }}
            // Reverse on the way out: fade the text out fast, *then* collapse the row.
            // If opacity and height animate together, the half-collapsed ticker stays
            // visible and overlaps the header for a moment — the clipping glitch.
            exit={{
              height: 0,
              opacity: 0,
              transition: {
                opacity: { duration: 0.12, ease: 'easeIn' },
                height: { duration: 0.28, delay: 0.06, ease: 'easeInOut' },
              },
            }}
            className="w-full overflow-hidden border-b border-white/10"
            style={{ background: 'rgba(0,0,0,0.25)' }}
          >
            <div ref={tickerRef} className="w-full max-w-[1280px] mx-auto px-4 lg:px-0 h-[24px] md:h-[26px] flex items-center gap-2.5 overflow-x-auto no-scrollbar text-[12px] md:text-[13px]">
              {tickerArticles.map((a, i) => (
                <span key={a.id} className="flex items-center gap-2.5 shrink-0">
                  {i > 0 && <span className="opacity-25" style={{ color: 'var(--nav-link)' }}>|</span>}
                  <Link
                    href={`/${contentTypePath(a.contentType)}/${a.slug}`}
                    className="whitespace-nowrap font-semibold opacity-75 hover:opacity-100 hover:underline transition-opacity"
                    style={{ color: 'var(--nav-link)' }}
                  >
                    {a.title}
                  </Link>
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Row 2 — logo + nav + search + theme + account, merged into a single row */}
      <div className="w-full max-w-[1280px] mx-auto px-4 lg:px-0 h-[46px] md:h-[64px] flex items-center gap-4 lg:gap-6">
        <Link href="/" className="flex shrink-0 items-center" aria-label="TheCoreGamer Home">
          <div className="flex items-center">
            <img src="/logo_white.svg?v=2" alt="TheCoreGamer Logo" className="h-5 md:h-[24px] w-auto object-contain" />
          </div>
        </Link>

        {/* Primary nav — desktop only, dropdowns for categories with children */}
        <nav aria-label="Main navigation" className="hidden md:flex flex-1 justify-center items-center gap-1 lg:gap-2">
          {NAV_LINKS.map((link) => {
            if (link.children) {
              return <NavDropdown key={link.label} link={link} active={isParentActive(link)} pathname={pathname} />;
            }

            const active = isActive(link);

            return (
              <Link
                key={link.label}
                href={link.href}
                className="relative px-3 py-2 text-[14px] font-bold tracking-wider uppercase whitespace-nowrap group"
              >
                <span className={`relative z-10 transition-colors duration-300 group-hover:text-white ${active ? 'text-white' : ''}`} style={{ color: active ? '#ffffff' : 'var(--nav-link)', opacity: active ? 1 : 0.8 }}>
                  {link.label}
                </span>
                {!active && (
                  <span className="absolute bottom-1 left-3 w-0 h-0.5 transition-all duration-700 ease-in-out rounded-full group-hover:w-[calc(100%-1.5rem)] opacity-0 group-hover:opacity-100 z-0" style={{ background: '#ffffff' }} />
                )}
                {active && (
                  <div
                    className="absolute bottom-1 left-3 right-3 h-0.5 rounded-full"
                    style={{ background: '#ffffff' }}
                  />
                )}
              </Link>
            );
          })}

        </nav>

        {/* Right side: search, theme toggle, account, mobile hamburger */}
        <div className="ml-auto md:ml-0 flex items-center gap-2 md:gap-3">
          <button
            ref={searchBtnRef}
            onClick={() => setSearchOverlayOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-full transition-all hover:bg-white/10 active:scale-95"
            aria-label="Open search"
            aria-haspopup="dialog"
          >
            <Search className="w-5 h-5" style={{ color: 'var(--nav-link)' }} />
          </button>

          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="hidden md:flex w-8 h-8 items-center justify-center rounded-full transition-all hover:bg-white/10 active:scale-95"
            aria-label="Toggle theme"
          >
            {themeMounted && (theme === 'dark' ? (
              <Sun className="w-5 h-5" style={{ color: 'var(--nav-link)' }} />
            ) : (
              <Moon className="w-5 h-5" style={{ color: 'var(--nav-link)' }} />
            ))}
          </button>

          {authLoading ? (
            // Skeleton placeholder while NextAuth session is hydrating —
            // prevents the Sign In button from flashing for authenticated users.
            <div className="hidden md:flex items-center gap-2 shrink-0 animate-pulse" aria-hidden="true">
              <div className="w-8 h-8 rounded-full bg-white/10" />
              <div className="flex flex-col gap-1.5">
                <div className="w-20 h-3 rounded bg-white/10" />
                <div className="w-12 h-2 rounded bg-white/10" />
              </div>
            </div>
          ) : isAuthenticated && user ? (
            <div ref={accountMenuRef} className="hidden md:flex items-center gap-2 relative shrink-0">
              <button
                type="button"
                onClick={() => setAccountMenuOpen((v) => !v)}
                aria-haspopup="true"
                aria-expanded={accountMenuOpen}
                className="shrink-0 peer/avatar"
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.displayName} className="w-8 h-8 shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-[14px] font-bold text-white shadow-lg shadow-accent/20" style={{ background: `linear-gradient(135deg, var(--accent), var(--accent2, #e040fb))` }}>
                    {getInitials(user.displayName)}
                  </div>
                )}
              </button>

              <div className="flex flex-col items-start justify-center gap-1">
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen((v) => !v)}
                  aria-haspopup="true"
                  aria-expanded={accountMenuOpen}
                  className="text-[17px] font-bold leading-none hover:underline peer-hover/avatar:underline transition-all"
                  style={{ color: 'var(--nav-link)' }}
                >
                  {user.displayName}
                </button>
              </div>

              {accountMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-max min-w-[200px] py-2 rounded-xl overflow-hidden z-50 bg-[#3a3f4a] border border-white/10 shadow-2xl"
                  style={{ boxShadow: '0 16px 32px rgba(0,0,0,0.5)' }}
                  role="menu"
                >
                  {isAuthenticated && user && STAFF_ROLES.includes(user.role) && (
                    <Link
                      href="/admin"
                      role="menuitem"
                      className="group flex items-center gap-3 px-4 py-2.5 text-[15px] font-semibold transition-all hover:bg-white/5 text-white/90 hover:text-white"
                    >
                      <Shield className="w-4 h-4 shrink-0 text-accent transition-transform group-hover:scale-110" /> 
                      <span className="text-accent transition-transform group-hover:translate-x-1">Admin Dashboard</span>
                    </Link>
                  )}
                  <Link
                    href="/settings"
                    role="menuitem"
                    onClick={() => setAccountMenuOpen(false)}
                    className="group flex items-center gap-3 px-4 py-2.5 text-[15px] font-semibold transition-all hover:bg-white/5 text-white/90 hover:text-white"
                  >
                    <UserCircle className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" /> 
                    <span className="transition-transform group-hover:translate-x-1">My Account</span>
                  </Link>
                  <Link
                    href="/settings/notifications"
                    role="menuitem"
                    onClick={() => setAccountMenuOpen(false)}
                    className="group flex items-center gap-3 px-4 py-2.5 text-[15px] font-semibold transition-all hover:bg-white/5 text-white/90 hover:text-white"
                  >
                    <Bell className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" /> 
                    <span className="transition-transform group-hover:translate-x-1">Notifications</span>
                  </Link>
                  <div className="h-px bg-white/10 my-1 mx-3" />
                  <button
                    type="button"
                    className="group flex w-full items-center gap-3 px-4 py-2.5 text-[15px] font-semibold transition-all hover:bg-red-500/10 text-white/90 hover:text-red-400 text-left"
                    role="menuitem"
                  >
                    <LogOut className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" /> 
                    <span className="transition-transform group-hover:translate-x-1">Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2 shrink-0">
              <HeaderPill href="/auth/login" icon={UserCircle} accent underlineOnHover>Sign in / Create account</HeaderPill>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            ref={hamburgerRef}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-white/5 shrink-0"
            style={{ color: 'var(--nav-link)' }}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-drawer"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>

    {/* Mobile menu — portal + focus trap + aria-modal */}
    {typeof document !== 'undefined' && createPortal(
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.88)' }}
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />
            {/* Drawer */}
            <motion.div
              id="mobile-nav-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onKeyDown={handleDrawerKeyDown}
              className="forza-drawer"
              style={{
                position: 'fixed', top: 0, left: 0, bottom: 0, right: 0, width: '100%',
                zIndex: 9999,
                overflowY: 'auto', display: 'flex', flexDirection: 'column',
                fontFamily: "'Gibson', sans-serif",
              }}
            >
              {/* Header row — Profile left, Close right */}
              <div className="flex items-center justify-between px-6 py-6 border-b border-[color:var(--border)] shrink-0">
                <div className="flex items-center gap-4">
                  {authLoading ? (
                    // Skeleton while session hydrates — prevents Sign In flash
                    <div className="flex items-center gap-4 animate-pulse" aria-hidden="true">
                      <div className="w-12 h-12 rounded-full bg-white/10 shrink-0" />
                      <div className="flex flex-col gap-2">
                        <div className="w-16 h-2.5 rounded bg-white/10" />
                        <div className="w-24 h-3 rounded bg-white/10" />
                      </div>
                    </div>
                  ) : isAuthenticated && user ? (
                    <>
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.displayName} className="w-12 h-12 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0 shadow-lg" style={{ background: `linear-gradient(135deg, var(--accent), var(--accent2, #e040fb))` }}>
                          {getInitials(user.displayName)}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 leading-tight">Hello,</p>
                        <p className="text-base font-bold text-[color:var(--text-strong)] leading-tight mt-0.5">{user.displayName}</p>
                      </div>
                    </>
                  ) : (
                    <div className="py-2">
                      <HeaderPill href="/auth/login" icon={UserCircle} accent underlineOnHover onClick={() => setMobileMenuOpen(false)} className="text-text-primary">
                        Sign in / Create account
                      </HeaderPill>
                    </div>
                  )}

                </div>

                <div className="flex items-center gap-2">
                  {isAuthenticated && user && (
                    <div className="md:hidden">
                      <NotificationBell color="var(--text)" />
                    </div>
                  )}
                  <button
                    onClick={() => { setMobileMenuOpen(false); hamburgerRef.current?.focus(); }}
                    aria-label="Close menu"
                    className="p-2 -mr-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    <X className="w-6 h-6" style={{ color: 'var(--text)' }} />
                  </button>
                </div>
              </div>

              {/* Theme Segmented Control */}
              <div className="px-6 py-5 shrink-0">
                <p className="text-[13px] font-semibold text-gray-400 dark:text-gray-500 mb-3">Theme</p>
                <div className="flex p-1 bg-gray-100 dark:bg-[#1a1a1a] rounded-lg border border-[color:var(--border)]">
                  <button
                    onClick={() => setTheme('light')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-[13px] font-semibold transition-all ${theme === 'light' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                  >
                    <Sun className="w-4 h-4" /> Light
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-[13px] font-semibold transition-all ${theme === 'dark' ? 'bg-[#2d2d2d] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                  >
                    <Moon className="w-4 h-4" /> Dark
                  </button>
                </div>
              </div>

              {/* Primary nav — Left aligned with icons */}
              <nav aria-label="Mobile navigation" className="flex flex-col py-4 px-3 gap-1">
                <MobileNavItem
                  link={{ label: 'Home', href: '/', exact: true }}
                  index={-1}
                  setMobileMenuOpen={setMobileMenuOpen}
                  pathname={pathname}
                  isActive={isActive}
                  getNavIcon={getNavIcon}
                />
                {NAV_LINKS.map((link, index) => {
                  return (
                    <MobileNavItem
                      key={link.label}
                      link={link}
                      index={index}
                      setMobileMenuOpen={setMobileMenuOpen}
                      pathname={pathname}
                      isActive={isActive}
                      getNavIcon={getNavIcon}
                    />
                  );
                })}
              </nav>

              {/* Footer */}
              <div className="px-6 py-4 mb-4 shrink-0">
                {!isAuthenticated || !user ? null : (
                  <div className="flex flex-col gap-4">
                    <Link
                      href="/settings"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-4 text-[16px] font-semibold text-[color:var(--text)] transition-colors hover:text-accent"
                    >
                      <UserCircle className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      My account
                    </Link>

                    {STAFF_ROLES.includes(user.role) && (
                      <Link
                        href="/admin"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-4 text-[16px] font-semibold text-[color:var(--text)] transition-colors hover:text-accent"
                      >
                        <Shield className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        {user.role.charAt(0) + user.role.slice(1).toLowerCase()} Panel
                      </Link>
                    )}
                    <button
                      onClick={async () => { setMobileMenuOpen(false); clearSession(); await signOut({ callbackUrl: '/' }); }}
                      className="w-full flex items-center gap-4 text-[16px] font-semibold text-[color:var(--text)] transition-colors hover:text-red-500 mt-2 pt-4 border-t border-[color:var(--border)]"
                    >
                      <LogOut className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>,
      document.body
    )}
  </>
  );
}
