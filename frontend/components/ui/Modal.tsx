'use client';

import { useEffect, useCallback, useRef, useId } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  full: 'max-w-[96vw]',
};

export default function Modal({ isOpen, onClose, title, size = 'md', children, className, bodyClassName }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const shouldReduceMotion = useReducedMotion();

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onCloseRef.current();
  }, []);

  // Focus trap
  const handlePanelKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusable = panel.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, []);

  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Remember the element that had focus before the modal opened, so it
      // can be restored on close (WCAG 2.1 AA — focus order/visibility).
      triggerRef.current = document.activeElement as HTMLElement | null;

      document.addEventListener('keydown', handleEscape);
      // Body alone isn't always the page's scrolling element (depends on
      // whether it has a set height) — lock the <html> root too so the
      // background can't be scrolled out from under the modal.
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      // Auto-focus first focusable element inside panel
      const timer = setTimeout(() => {
        const panel = panelRef.current;
        if (!panel) return;
        const first = panel.querySelector<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        first?.focus();
      }, 50);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('keydown', handleEscape);
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        triggerRef.current?.focus();
      };
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscape]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            ref={overlayRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 20 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className={cn(
              'relative w-full rounded-xl bg-bg-surface border border-border shadow-2xl flex flex-col max-h-[90vh]',
              sizeClasses[size],
              className
            )}
            onKeyDown={handlePanelKeyDown}
          >
            {title && (
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 id={titleId} className="text-lg font-semibold text-text-primary">{title}</h3>
                <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-bg-elevated transition-colors" aria-label="Close modal">
                  <X className="w-5 h-5 text-text-muted" />
                </button>
              </div>
            )}
            <div className={cn('p-4 overflow-y-auto min-h-0', bodyClassName)}>{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
