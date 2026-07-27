'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
  className?: string;
}

export default function Pagination({ currentPage, totalPages, basePath, className }: PaginationProps) {
  const searchParams = useSearchParams();
  if (totalPages <= 1) return null;

  function buildUrl(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    return `${basePath}?${params.toString()}`;
  }

  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('...');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <nav className={cn('flex items-center justify-center gap-1', className)} aria-label="Pagination">
      <Link
        href={currentPage > 1 ? buildUrl(currentPage - 1) : '#'}
        className={cn(
          'p-2 rounded-lg transition-colors',
          currentPage > 1 ? 'hover:bg-bg-elevated text-text-muted hover:text-text-primary' : 'opacity-40 pointer-events-none'
        )}
        aria-label="Previous page"
      >
        <ChevronLeft className="w-5 h-5" />
      </Link>
      {pages.map((page, i) =>
        page === '...' ? (
          <span key={`dots-${i}`} className="px-2 text-text-dim">…</span>
        ) : (
          <Link
            key={page}
            href={buildUrl(page)}
            className={cn(
              'w-10 h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-colors',
              page === currentPage
                ? 'bg-accent text-white shadow-lg shadow-accent/20'
                : 'text-text-muted hover:bg-bg-elevated hover:text-text-primary'
            )}
          >
            {page}
          </Link>
        )
      )}
      <Link
        href={currentPage < totalPages ? buildUrl(currentPage + 1) : '#'}
        className={cn(
          'p-2 rounded-lg transition-colors',
          currentPage < totalPages ? 'hover:bg-bg-elevated text-text-muted hover:text-text-primary' : 'opacity-40 pointer-events-none'
        )}
        aria-label="Next page"
      >
        <ChevronRight className="w-5 h-5" />
      </Link>
    </nav>
  );
}
