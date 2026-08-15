interface VerdictBlockProps {
  verdict: string;
}

export default function VerdictBlock({ verdict }: VerdictBlockProps) {
  return (
    <div className="my-8 px-7 py-5 bg-[var(--bg2)]">
      <h3 className="text-lg font-bold text-text-primary mb-4 pb-3 border-b-2 border-[#00e5a0]">The Verdict</h3>
      <p className="text-text-muted leading-relaxed">{verdict}</p>
    </div>
  );
}
