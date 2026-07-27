interface VerdictBlockProps {
  verdict: string;
}

export default function VerdictBlock({ verdict }: VerdictBlockProps) {
  return (
    <div className="my-8 rounded-xl bg-gradient-to-br from-accent/10 to-accent-green/10 border border-accent/20 p-6">
      <h3 className="text-lg font-bold text-text-primary mb-4">The Verdict</h3>
      <p className="text-text-muted leading-relaxed">{verdict}</p>
    </div>
  );
}
