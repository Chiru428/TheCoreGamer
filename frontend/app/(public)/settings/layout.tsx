'use client';

import { useEffect } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { User, Bookmark, MessageSquare, Bell, ShieldCheck, ListChecks, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
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
  const user = useAuthStore((s) => s.user);
  const hasRole = useAuthStore((s) => s.hasRole);

  const nav = hasRole([Role.AUTHOR, Role.EDITOR, Role.ADMIN])
    ? [...NAV, { href: '/settings/stats', label: 'My Performance', icon: BarChart3 }]
    : NAV;

  useEffect(() => {
    // We add a small timeout to ensure the DOM has updated and layout is calculated
    const timer = setTimeout(() => {
      const activeEl = document.getElementById('settings-nav-active');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [pathname, nav.length]);

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
        <aside className="md:w-56 shrink-0 md:sticky md:top-32 md:self-start">

          <nav className="flex md:flex-col gap-1 overflow-x-auto">
            {nav.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname?.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  id={active ? 'settings-nav-active' : undefined}
                  className={cn(
                    'flex px-3 py-2.5 font-medium transition-colors shrink-0 group',
                    active
                      ? 'text-text-primary dark:text-white font-semibold'
                      : 'text-text-muted hover:text-text-primary dark:hover:text-white'
                  )}
                  style={{ fontFamily: "'Gibson', sans-serif", fontSize: '18px' }}
                >
                  <span className="relative flex items-center gap-3 w-max">
                    <Icon className="w-4 h-4 relative z-10" />
                    <span className="relative z-10">{label}</span>
                    {!active && (
                      <span className="absolute -bottom-1 left-0 w-0 h-0.5 transition-all duration-700 ease-in-out rounded-full group-hover:w-full opacity-0 group-hover:opacity-100 z-0 bg-black dark:bg-white" />
                    )}
                    {active && (
                      <motion.div
                        layoutId="settings-nav-underline"
                        className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full bg-black dark:bg-white"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </span>
                </Link>
              );
            })}
          </nav>
        </aside>
        <div className="hidden md:block w-px bg-border shrink-0 sticky top-0 h-screen -ml-4" />

        <div className="w-full md:w-[900px] min-w-0 md:ml-auto">

          {children}
        </div>
      </div>
    </div>
  );
}
