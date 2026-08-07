'use client';

import { useEffect } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { User, Bookmark, MessageSquare, Bell, ShieldCheck, ListChecks, BarChart3, ChevronRight, ChevronLeft } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Role } from '@/types';

const NAV = [
  { href: '/settings/profile', label: 'Profile', icon: User },
  { href: '/settings/security', label: 'Security', icon: ShieldCheck },
  { href: '/settings/bookmarks', label: 'Bookmarks', icon: Bookmark },
  { href: '/settings/lists', label: 'Reading Lists', icon: ListChecks },
  { href: '/settings/comments', label: 'Comments', icon: MessageSquare },
  { href: '/settings/notifications', label: 'Notifications', icon: Bell },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hasRole = useAuthStore((s) => s.hasRole);
  const user = useAuthStore((s) => s.user);

  const nav = hasRole([Role.AUTHOR, Role.EDITOR, Role.ADMIN])
    ? [...NAV, { href: '/settings/stats', label: 'My Performance', icon: BarChart3 }]
    : NAV;

  useEffect(() => {
    const timer = setTimeout(() => {
      const activeEl = document.getElementById('settings-nav-active');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [pathname, nav.length]);

  const isSettingsIndex = pathname === '/settings';
  const activeTab = nav.find(item => pathname === item.href || pathname?.startsWith(`${item.href}/`));
  const activeLabel = activeTab ? activeTab.label : 'My Account';

  return (
    <div
      className="w-full max-w-[1280px] mx-auto px-4 lg:px-0 py-8"
      style={{
        '--color-accent': '#1D84F5',
        '--accent': '#1D84F5',
        '--color-accent-light': '#3b9cfb',
        '--accent-light': '#3b9cfb',
        '--color-accent-hover': '#1565C0',
        '--accent-dim': 'rgba(29, 132, 245, 0.1)',
      } as React.CSSProperties}
    >
      <div className="flex flex-col md:flex-row gap-8 min-h-[calc(100vh-200px)]">

        {/* ── Sidebar ── */}
        <aside className={cn(
          "md:w-56 shrink-0 md:sticky md:top-32 md:self-start",
          !isSettingsIndex && "hidden md:block"
        )}>

          {/* Desktop Nav */}
          <nav className="hidden md:flex flex-col gap-1">
            {nav.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname?.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  id={active ? 'settings-nav-active' : undefined}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all duration-200 shrink-0 relative group',
                    active
                      ? 'text-[#1D84F5] dark:text-[#3b9cfb] bg-[rgba(29,132,245,0.10)] dark:bg-[rgba(29,132,245,0.12)] border-l-[3px] border-[#1D84F5]'
                      : 'text-text-muted hover:text-text-primary hover:bg-white/5 dark:hover:bg-white/[0.05] border-l-[3px] border-transparent'
                  )}
                  style={{ fontFamily: "'Gibson', sans-serif", fontSize: '15px' }}
                >
                  <Icon
                    className={cn(
                      'w-4 h-4 shrink-0 transition-colors',
                      active ? 'text-[#1D84F5] dark:text-[#3b9cfb]' : 'text-text-muted group-hover:text-text-primary'
                    )}
                  />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Mobile Nav */}
          <div className="md:hidden">
            <h1 className="text-2xl font-bold mb-6 text-text-primary" style={{ fontFamily: "'Gibson', sans-serif" }}>My Account</h1>
            <nav className="flex flex-col rounded-2xl border border-border dark:border-white/[0.08] overflow-hidden bg-bg-surface">
              {nav.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-4 px-5 py-4 border-b border-border dark:border-white/[0.08] last:border-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <Icon className="w-[18px] h-[18px] text-text-muted" />
                  <span className="flex-1 text-text-primary font-medium" style={{ fontFamily: "'Gibson', sans-serif", fontSize: '15px' }}>{label}</span>
                  <ChevronRight className="w-5 h-5 text-text-muted opacity-50" />
                </Link>
              ))}
            </nav>
          </div>
        </aside>

        {/* Divider — desktop only */}
        <div className="hidden md:block w-px bg-white/[0.07] dark:bg-white/[0.06] shrink-0 sticky top-0 h-screen -ml-4" />

        {/* Content */}
        <div className={cn(
          "w-full md:w-[900px] min-w-0 md:ml-auto",
          isSettingsIndex && "hidden md:block"
        )}>
          {!isSettingsIndex && (
            <div className="md:hidden flex items-center gap-2 pb-4 mb-6 border-b border-border dark:border-white/[0.08]">
              <Link href="/settings" className="text-text-muted hover:text-text-primary transition-colors p-1 -ml-1">
                <ChevronLeft className="w-[22px] h-[22px]" />
              </Link>
              <h2 className="text-[20px] font-bold text-text-primary tracking-wide" style={{ fontFamily: "'Gibson', sans-serif" }}>
                {activeLabel}
              </h2>
            </div>
          )}
          {children}
        </div>

      </div>
    </div>
  );
}
