/**
 * ContentTypeHeading
 * Shared premium heading for all content-type listing pages (News, Reviews, etc.)
 * Gradient text + flanking accent lines for a rich, editorial look.
 */
import Link from 'next/link';

export default function ContentTypeHeading({ title }: { title: string }) {
  const displayTitle = title.charAt(0).toUpperCase() + title.slice(1).toLowerCase();

  return (
    <div className="w-[calc(100%+2rem)] -mx-4 lg:mx-0 -mt-6 md:-mt-10 lg:mt-0 lg:w-full mb-6 md:mb-8 h-[100px] md:h-auto">
      <div className="w-full h-full bg-[var(--bg2)] px-6 md:px-8 py-0 md:py-10 flex flex-col justify-center">
        <Link href="/" className="w-fit text-[#f03a5f] text-[12px] font-black uppercase tracking-[0.15em] mb-1 md:mb-2 hover:underline hover:text-[var(--text)] transition-colors" style={{ fontFamily: "'Gibson', sans-serif" }}>
          HOME
        </Link>
        <h1 
          className="text-3xl md:text-4xl lg:text-[44px] text-[var(--text)]"
          style={{ fontFamily: "'Gibson', sans-serif", fontWeight: 900, lineHeight: 1.1 }}
        >
          {displayTitle}
        </h1>
      </div>
    </div>
  );
}

