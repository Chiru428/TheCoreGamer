import React from 'react';
import Link from 'next/link';

interface PageHeaderProps {
  title: string;
  description?: string;
  titleFontFamily?: string;
}

export default function PageHeader({ title, description, titleFontFamily }: PageHeaderProps) {
  return (
    <div className="w-full max-w-[1280px] mx-auto px-0 md:px-6 xl:px-0 mt-0 md:mt-10 mb-6 md:mb-8 h-[120px] md:h-auto">
      <div className="w-full h-full bg-[var(--bg2)] px-6 md:px-8 py-0 md:py-10 flex flex-col justify-center">
        <Link href="/" className="w-fit text-[#f03a5f] text-[12px] font-black uppercase tracking-[0.15em] mb-1 md:mb-2 hover:underline hover:text-[var(--text)] transition-colors" style={{ fontFamily: "'Gibson', sans-serif" }}>
          HOME
        </Link>
        <h1 
          className="text-3xl md:text-4xl lg:text-[44px] text-[var(--text)]"
          style={{ fontFamily: titleFontFamily || "'Gibson', sans-serif", fontWeight: 900, lineHeight: 1.1 }}
        >
          {title}
        </h1>
        {description && (
          <p className="text-[var(--muted)] text-sm md:text-[15px] font-medium max-w-3xl mt-3" style={{ fontFamily: "'Gibson', sans-serif" }}>
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
