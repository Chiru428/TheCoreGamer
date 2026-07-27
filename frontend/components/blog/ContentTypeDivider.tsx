import type { CSSProperties } from 'react';
import { CONTENT_TYPE_LABELS } from '@/lib/constants';

/** Centered category pill on a horizontal rule, shown above the title on article detail pages. */
export default function ContentTypeDivider({ contentType, style }: { contentType: string; style?: CSSProperties }) {
  const label = CONTENT_TYPE_LABELS[contentType] || contentType;

  return (
    <div className="relative flex items-center justify-center mb-5" style={style}>
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] md:h-[3px]" style={{ background: '#00e5a0' }} />
      <span
        className="relative z-10 px-4 inline-flex items-center justify-center h-[24px] md:h-[28px] text-sm md:text-base font-extrabold uppercase tracking-widest rounded-sm text-black"
        style={{ background: '#00e5a0' }}
      >
        {label}
      </span>
    </div>
  );
}
