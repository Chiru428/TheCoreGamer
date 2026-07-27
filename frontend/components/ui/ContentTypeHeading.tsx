/**
 * ContentTypeHeading
 * Shared premium heading for all content-type listing pages (News, Reviews, etc.)
 * Gradient text + flanking accent lines for a rich, editorial look.
 */
export default function ContentTypeHeading({ title }: { title: string }) {
  return (
    <div className="content-type-heading flex items-center justify-center gap-4 mb-3 md:mb-6 w-full">
      {/* Left accent line — fades in from the left edge */}
      <div className="cth-line-left flex-1 h-0.5 hidden sm:block" />

      {/* Gradient title */}
      <h1
        className="cth-title text-[30px] md:text-[44px] tracking-widest text-center uppercase whitespace-nowrap shrink-0"
        style={{
          fontFamily: "'IBM Plex Serif', serif",
          fontWeight: 900,
        }}
      >
        {title}
      </h1>

      {/* Right accent line — fades out to the right edge */}
      <div className="cth-line-right flex-1 h-0.5 hidden sm:block" />
    </div>
  );
}

