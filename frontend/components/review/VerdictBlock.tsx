interface VerdictBlockProps {
  verdict: string;
}

export default function VerdictBlock({ verdict }: VerdictBlockProps) {
  return (
    <div className="mt-2 mb-8 md:my-8 px-6 py-6 md:px-10 md:py-8 bg-[var(--bg2)]">
      <h3 className="text-[20px] md:text-[22px] font-bold text-text-primary mb-4 pb-3 border-b-2 border-[#00e5a0]">The Verdict</h3>
      <p className="text-text-muted leading-relaxed text-[17px] md:text-[18px] font-bold">{verdict}</p>
    </div>
  );
}

