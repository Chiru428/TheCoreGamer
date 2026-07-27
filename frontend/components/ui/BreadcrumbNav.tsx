import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { HiHome } from 'react-icons/hi';
import React, { ReactNode } from 'react';

interface Crumb {
  label: string;
  href?: string;
  icon?: ReactNode;
}

interface BreadcrumbNavProps {
  crumbs: Crumb[];
  baseHref?: string;
  baseLabel?: string;
  baseIcon?: ReactNode;
}

export default function BreadcrumbNav({ 
  crumbs, 
  baseHref = "/", 
  baseLabel = "Home",
  baseIcon = <HiHome className="w-4 h-4" /> 
}: BreadcrumbNavProps) {
  return (
    <nav aria-label="Breadcrumb" className="inline-flex items-center gap-2 py-2 text-[13px] md:text-[14px] font-bold text-text-muted overflow-x-auto">
      <Link href={baseHref} className="flex items-center gap-1.5 shrink-0 hover:text-[var(--brand-green)] transition-colors" aria-label="Base">
        {baseIcon}
        <span>{baseLabel}</span>
      </Link>
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-2 shrink-0">
          <ChevronRight className="w-4 h-4 opacity-40" strokeWidth={3} />
          {crumb.href ? (
             <Link href={crumb.href} className="flex items-center gap-1.5 text-text-primary hover:text-[var(--brand-green)] transition-colors">
              {crumb.icon && crumb.icon}
              <span>{crumb.label}</span>
            </Link>
          ) : (
            <span className="flex items-center gap-1.5 text-text-primary truncate max-w-[200px]">
              {crumb.icon && crumb.icon}
              <span>{crumb.label}</span>
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
