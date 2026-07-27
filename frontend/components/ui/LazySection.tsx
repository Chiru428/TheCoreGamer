'use client';

import { useRef, useState, useEffect, type ReactNode } from 'react';

interface LazySectionProps {
  children: ReactNode;
  /** Pixel offset before viewport at which rendering is triggered (default: 300px) */
  rootMargin?: string;
  /** Placeholder height to reserve space and avoid CLS while content is loading */
  minHeight?: string;
  className?: string;
}

/**
 * B6 — Defers rendering of children until they scroll near the viewport.
 * Prevents below-fold sections (RelatedPosts, comments) from blocking initial paint.
 */
export default function LazySection({
  children,
  rootMargin = '300px',
  minHeight,
  className,
}: LazySectionProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <div
      ref={sentinelRef}
      className={className}
      style={!shouldRender && minHeight ? { minHeight } : undefined}
    >
      {shouldRender ? children : null}
    </div>
  );
}
