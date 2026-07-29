'use client';

import { useEffect, useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import {
  LayoutDashboard, FileText, Star, Wrench, Gamepad,
  FolderOpen, Tags, MessageSquare, Mail, Megaphone, BarChart3,
  Users, ChevronLeft, Menu, X, Sun, Moon, BookOpen, PieChart, Shield, Bell, Calendar, BookMarked,
  Newspaper, Sparkles, Tag, MessageCircle, List
} from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { STAFF_ROLES } from '@/lib/constants';

// Links with no `roles` are visible to every staff role (AUTHOR/EDITOR/ADMIN).
// Links scoped to EDITOR/ADMIN cover site-wide curation/config/moderation —
// not things an individual author needs to draft and submit their own posts.
const links = [
  // -- Content ------------------------------------------------------
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, group: 'Content', roles: ['EDITOR', 'ADMIN'] },
  { href: '/admin/calendar', label: 'Calendar', icon: Calendar, group: 'Content' },
  { href: '/admin/series', label: 'Series', icon: BookMarked, group: 'Content' },
  { href: '/admin/games', label: 'Games', icon: Gamepad, group: 'Content', roles: ['EDITOR', 'ADMIN'] },
  { href: '/admin/polls', label: 'Polls', icon: PieChart, group: 'Content', roles: ['EDITOR', 'ADMIN'] },
  // -- Posts --------------------------------------------------------
  { href: '/admin/news', label: 'News', icon: Newspaper, group: 'Posts' },
  { href: '/admin/features', label: 'Features', icon: Sparkles, group: 'Posts' },
  { href: '/admin/deals', label: 'Deals', icon: Tag, group: 'Posts' },
  { href: '/admin/opinions', label: 'Opinions', icon: MessageCircle, group: 'Posts' },
  { href: '/admin/listicles', label: 'Listicles', icon: List, group: 'Posts' },
  { href: '/admin/reviews', label: 'Reviews', icon: Star, group: 'Posts' },
  { href: '/admin/mod-guides', label: 'Mod Guides', icon: Wrench, group: 'Posts' },
  { href: '/admin/walkthroughs', label: 'Walkthroughs', icon: BookOpen, group: 'Posts' },
  // -- Management ---------------------------------------------------
  { href: '/admin/tags', label: 'Tags', icon: Tags, group: 'Management', roles: ['EDITOR', 'ADMIN'] },
  { href: '/admin/comments', label: 'Comments', icon: MessageSquare, group: 'Management', roles: ['EDITOR', 'ADMIN'] },
  { href: '/admin/moderation-log', label: 'Moderation Log', icon: Shield, group: 'Management', roles: ['EDITOR', 'ADMIN'] },
  { href: '/admin/newsletter', label: 'Newsletter', icon: Mail, group: 'Management', roles: ['EDITOR', 'ADMIN'] },
  { href: '/admin/push', label: 'Push Notifications', icon: Bell, group: 'Management', roles: ['EDITOR', 'ADMIN'] },
  { href: '/admin/ads', label: 'Ad Zones', icon: Megaphone, group: 'Management', roles: ['EDITOR', 'ADMIN'] },
  // -- System --------------------------------------------------------
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3, group: 'System', roles: ['EDITOR', 'ADMIN'] },
  { href: '/admin/users', label: 'Users', icon: Users, group: 'System', roles: ['EDITOR', 'ADMIN'] },
];

function NavLinks({ pathname, onNavigate, collapsed = false, items: navItems }: { pathname: string; onNavigate?: () => void; collapsed?: boolean; items: typeof links }) {
  // Group links by their group label and insert dividers between groups
  const groups = navItems.reduce<{ group: string; items: typeof links }[]>((acc, link) => {
    const last = acc[acc.length - 1];
    if (last && last.group === link.group) { last.items.push(link); }
    else { acc.push({ group: link.group, items: [link] }); }
    return acc;
  }, []);

  return (
    <nav className="p-2">
      {groups.map(({ group, items }, gi) => (
        <div key={group}>
          {gi > 0 && (
            <div className="mx-3 my-2 flex items-center gap-2">
              <div className="flex-1 h-px bg-border" />
              {!collapsed && (
                <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted2)' }}>{group}</span>
              )}
              <div className="flex-1 h-px bg-border" />
            </div>
          )}
          <div className="space-y-0.5">
            {items.map(link => {
              const active = pathname === link.href || (link.href !== '/admin' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onNavigate}
                  title={collapsed ? link.label : undefined}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    collapsed && 'justify-center',
                    active ? 'bg-accent/10 text-accent-light' : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated'
                  )}
                >
                  <link.icon className="w-4 h-4 shrink-0" />
                  {!collapsed && link.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const { theme, toggleTheme } = useUIStore();
  const isStaff = !!user && STAFF_ROLES.includes(user.role);
  const visibleLinks = links.filter(l => !l.roles || (user && l.roles.includes(user.role)));
  const [mobileOpen, setMobileOpen] = useState(false);

  // Sidebar strictly follows the route — collapsed while the post editor
  // (new/edit) is open, expanded everywhere else. No manual toggle, no
  // persisted preference.
  const isEditorRoute = pathname.endsWith('/edit') || pathname.endsWith('/new');
  const sidebarCollapsed = isEditorRoute;

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/auth/login?callbackUrl=/admin');
      return;
    }
    if (!STAFF_ROLES.includes(user?.role ?? '')) {
      router.replace('/');
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Defence-in-depth: dedicated role guard that fires whenever the resolved
  // user object changes (e.g. after a role downgrade mid-session).
  useEffect(() => {
    if (isLoading) return;
    if (!user) return;
    if (!STAFF_ROLES.includes(user.role)) {
      router.replace('/');
    }
  }, [user, isLoading, router]);

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  if (isLoading || !isAuthenticated || !isStaff) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary">
        <Spinner className="w-8 h-8 animate-spin text-accent-light" />
      </div>
    );
  }

  const renderSidebarContent = ({ onNavigate, collapsed = false }: { onNavigate?: () => void; collapsed?: boolean } = {}) => (
    <>
      <div className={cn('p-4 border-b border-border flex items-center', collapsed ? 'justify-center' : 'justify-between gap-2')}>
        <Link href="/" className="flex items-center overflow-hidden" aria-label="TheCoreGamer Home">
          {collapsed ? (
            <>
              <img src="/logo_circle_white.svg?v=2" alt="TheCoreGamer" className="h-9 w-9 hidden dark:block" />
              <img src="/logo_circle_black.svg?v=2" alt="TheCoreGamer" className="h-9 w-9 block dark:hidden" />
            </>
          ) : (
            <>
              <img src="/logo_white.svg?v=2" alt="TheCoreGamer" className="h-7 w-auto hidden dark:block" />
              <img src="/logo_black.svg?v=2" alt="TheCoreGamer" className="h-7 w-auto block dark:hidden" />
            </>
          )}
        </Link>
      </div>
      <NavLinks pathname={pathname} onNavigate={onNavigate} collapsed={collapsed} items={visibleLinks} />
      <div className="p-4 border-t border-border mt-auto flex flex-col gap-2">
        <button
          onClick={toggleTheme}
          title={collapsed ? 'Toggle Theme' : undefined}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium border border-border bg-bg-surface hover:bg-bg-elevated hover:text-accent-light hover:border-accent/50 transition-all text-text-primary text-left',
            collapsed && 'justify-center'
          )}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {!collapsed && 'Toggle Theme'}
        </button>
        <Link
          href="/"
          title={collapsed ? 'Back to Site' : undefined}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium border border-border bg-bg-surface hover:bg-bg-elevated hover:text-accent-light hover:border-accent/50 transition-all text-text-primary',
            collapsed && 'justify-center'
          )}
        >
          <ChevronLeft className="w-4 h-4" /> {!collapsed && 'Back to Site'}
        </Link>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-bg-primary">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 bottom-0 bg-bg-surface border-r border-border overflow-y-auto z-40 hidden lg:flex lg:flex-col transition-[width] duration-200',
          sidebarCollapsed ? 'w-[68px]' : 'w-60'
        )}
      >
        {renderSidebarContent({ collapsed: sidebarCollapsed })}
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-bg-surface border-b border-border flex items-center px-4 gap-3 z-40">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg hover:bg-bg-elevated text-text-muted"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-64 bg-bg-surface border-r border-border z-50 flex flex-col lg:hidden overflow-y-auto"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <Link href="/" className="flex items-center" aria-label="TheCoreGamer Home">
                  <img src="/logo_white.svg?v=2" alt="TheCoreGamer" className="h-6 w-auto hidden dark:block" />
                  <img src="/logo_black.svg?v=2" alt="TheCoreGamer" className="h-6 w-auto block dark:hidden" />
                </Link>
                <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="p-1 rounded-lg hover:bg-bg-elevated text-text-muted">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <NavLinks pathname={pathname} onNavigate={() => setMobileOpen(false)} items={visibleLinks} />
              <div className="p-4 border-t border-border mt-auto flex flex-col gap-2">
                <button 
                  onClick={toggleTheme}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium border border-border bg-bg-surface hover:bg-bg-elevated hover:text-accent-light hover:border-accent/50 transition-all text-text-primary text-left"
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  Toggle Theme
                </button>
                <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium border border-border bg-bg-surface hover:bg-bg-elevated hover:text-accent-light hover:border-accent/50 transition-all text-text-primary" onClick={() => setMobileOpen(false)}>
                  <ChevronLeft className="w-4 h-4" /> Back to Site
                </Link>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main
        id="main-content"
        className={cn(
          'flex-1 overflow-y-auto h-screen pt-14 lg:pt-0 transition-[margin] duration-200',
          sidebarCollapsed ? 'lg:ml-[68px]' : 'lg:ml-60'
        )}
      >
        <div className={cn("h-full flex flex-col min-h-0", (pathname.endsWith('/new') || pathname.endsWith('/edit')) ? "p-0" : "p-4 sm:p-6 lg:p-8")}>{children}</div>
      </main>
    </div>
  );
}
