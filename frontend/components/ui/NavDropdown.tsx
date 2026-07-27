'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { NavLink } from '@/lib/constants';

interface NavDropdownProps {
  link: NavLink;
  active: boolean;
  pathname: string;
}

/** Desktop nav item with a hover/keyboard-accessible submenu (Arrow keys, Escape, Tab to close). */
export default function NavDropdown({ link, active, pathname }: NavDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLAnchorElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const children = link.children ?? [];

  const openMenu = () => {
    clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };
  const closeMenu = (focusTrigger = false) => {
    clearTimeout(closeTimer.current);
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const focusItem = (index: number) => {
    itemRefs.current[index]?.focus();
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      openMenu();
      requestAnimationFrame(() => focusItem(0));
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      closeMenu();
    }
  };

  const handleItemKeyDown = (e: React.KeyboardEvent, index: number) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        focusItem((index + 1) % children.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        focusItem((index - 1 + children.length) % children.length);
        break;
      case 'Escape':
        e.preventDefault();
        closeMenu(true);
        break;
      case 'Tab':
        // Tab forward off the last item, or back off the first item, closes the menu
        if ((!e.shiftKey && index === children.length - 1) || (e.shiftKey && index === 0)) {
          setOpen(false);
        }
        break;
      default:
        break;
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative group"
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
    >
      {link.unclickable ? (
        <button
          ref={triggerRef as any}
          type="button"
          className="relative px-3 py-2 text-[14px] font-bold tracking-wider uppercase whitespace-nowrap transition-colors hover:text-white cursor-default"
          aria-haspopup="true"
          aria-expanded={open}
          onFocus={openMenu}
          onKeyDown={handleTriggerKeyDown}
          onClick={(e) => e.preventDefault()}
        >
          <span style={{ color: active ? '#ffffff' : 'var(--nav-link)', opacity: active ? 1 : 0.8 }}>
            {link.label}
          </span>
        </button>
      ) : (
        <Link
          ref={triggerRef}
          href={link.href}
          className="relative px-3 py-2 text-[14px] font-bold tracking-wider uppercase whitespace-nowrap transition-colors hover:text-white"
          aria-haspopup="true"
          aria-expanded={open}
          onFocus={openMenu}
          onKeyDown={handleTriggerKeyDown}
        >
          <span style={{ color: active ? '#ffffff' : 'var(--nav-link)', opacity: active ? 1 : 0.8 }}>
            {link.label}
          </span>
        </Link>
      )}

      <div
        className={`absolute left-1/2 -translate-x-1/2 top-full pt-2 z-50 invisible opacity-0 group-hover:visible group-hover:opacity-100 ${open ? 'visible opacity-100' : ''}`}
        onMouseEnter={openMenu}
        onMouseLeave={scheduleClose}
      >
        <div
          className="w-max min-w-[160px] py-2 rounded-xl backdrop-blur-md overflow-hidden"
          style={{ background: 'var(--nav-bg)', border: '1px solid var(--border)', boxShadow: '0 16px 32px rgba(0,0,0,0.35)' }}
          role="menu"
          aria-label={`${link.label} submenu`}
        >
          {children.map((child, i) => (
            <Link
              key={child.href}
              ref={(el) => { itemRefs.current[i] = el; }}
              href={child.href}
              role="menuitem"
              tabIndex={open ? 0 : -1}
              onKeyDown={(e) => handleItemKeyDown(e, i)}
              onClick={() => setOpen(false)}
              className="relative block px-4 py-2 text-[12px] font-bold tracking-wider uppercase whitespace-nowrap transition-colors group/link text-center"
              style={{ color: pathname === child.href ? 'var(--accent)' : 'var(--nav-link)', opacity: pathname === child.href ? 1 : 0.8 }}
            >
              <span className="relative inline-block z-10 transition-colors duration-300 group-hover/link:text-white">
                {child.label}
                {pathname !== child.href && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0.5 transition-all duration-700 ease-in-out rounded-full group-hover/link:w-full opacity-0 group-hover/link:opacity-100 z-0" style={{ background: '#ffffff' }} />
                )}
                {pathname === child.href && (
                  <motion.div
                    layoutId="dropdown-nav-underline"
                    className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full"
                    style={{ background: 'var(--accent)' }}
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
