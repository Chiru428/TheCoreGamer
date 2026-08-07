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
  if (totalPages <= 11) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 5) pages.push('...');
    const start = Math.max(2, currentPage - 4);
    const end = Math.min(totalPages - 1, currentPage + 4);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 4) pages.push('...');
    pages.push(totalPages);
  }

  const jumpLinks: number[] = [];
  for (let i = 10; i <= totalPages; i += 10) {
    jumpLinks.push(i);
  }

  const btnClass = "w-9 h-9 flex items-center justify-center rounded-lg text-sm transition-all border border-border dark:border-white/[0.08] text-text-muted bg-transparent hover:border-[var(--brand-green)] hover:text-[var(--brand-green)] hover:bg-[var(--brand-green)]/10 font-medium";
  const activeClass = "bg-[var(--brand-green)] text-black border-[var(--brand-green)] shadow-md shadow-[var(--brand-green)]/20 font-bold pointer-events-none";
  const disabledClass = "opacity-40 pointer-events-none";

  return (
    <div className={cn('flex flex-col items-center gap-6', className)}>
      <nav className="flex flex-wrap items-center justify-center gap-1.5" aria-label="Pagination">
        <Link
          href={currentPage > 1 ? buildUrl(currentPage - 1) : '#'}
          className={cn(btnClass, currentPage <= 1 && disabledClass)}
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </Link>
        
        {pages.map((page, i) =>
          page === '...' ? (
            <span key={`dots-${i}`} className={cn(btnClass, 'pointer-events-none opacity-70')}>…</span>
          ) : (
            <Link
              key={page}
              href={buildUrl(page)}
              className={cn(btnClass, page === currentPage && activeClass)}
            >
              {page}
            </Link>
          )
        )}
        
        <Link
          href={currentPage < totalPages ? buildUrl(currentPage + 1) : '#'}
          className={cn(btnClass, currentPage >= totalPages && disabledClass)}
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </Link>
      </nav>

      {jumpLinks.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 max-w-[500px]">
          {jumpLinks.map((link) => (
            <Link
              key={`jump-${link}`}
              href={buildUrl(link)}
              className={cn(
                "text-[15px] font-bold transition-colors hover:underline",
                currentPage === link ? "text-white underline" : "text-[#FF2A6D] hover:text-[#ff4d85]"
              )}
            >
              {link}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
