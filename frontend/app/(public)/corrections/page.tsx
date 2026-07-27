import Link from 'next/link';
import { buildMeta } from '@/lib/seo';

export const metadata = buildMeta({
  title: 'Corrections Policy — TheCoreGamer',
  description: 'How TheCoreGamer handles factual errors, corrections, and article retractions.',
  url: '/corrections',
});

export default function CorrectionsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-text-primary mb-2">Corrections Policy</h1>
      <p className="text-sm text-text-muted mb-10">Last updated: June 2026</p>

      <p className="text-text-muted leading-relaxed mb-10">
        Accuracy is a core editorial value at TheCoreGamer. We are committed to correcting errors promptly and transparently. This page describes how we handle factual mistakes, editorial updates, and, in rare cases, full retractions.
      </p>

      {/* How to report */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-text-primary mb-3">How to Report an Error</h2>
        <p className="text-text-muted leading-relaxed mb-4">
          If you believe an article on TheCoreGamer contains a factual error, please report it using our <Link href="/contact" className="text-accent-light hover:underline">contact form</Link>. Include:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-text-muted text-sm leading-relaxed mb-4">
          <li>The URL of the article in question</li>
          <li>A description of the alleged error</li>
          <li>A source or evidence supporting the correction</li>
        </ul>
        <p className="text-text-muted leading-relaxed">
          You may also reach us by email at the address listed on our contact page. We review all correction requests regardless of their source — we do not require reporters to identify themselves, but a name and contact detail helps us follow up if needed.
        </p>
      </section>

      {/* Response time */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-text-primary mb-3">Response Time</h2>
        <p className="text-text-muted leading-relaxed">
          We aim to acknowledge all correction requests within <strong className="text-text-primary">48 hours</strong> on business days. For breaking news or time-sensitive errors, we prioritise review and correction within the same day when possible. Complex corrections — such as those requiring source verification or significant rewriting — may take up to five business days to resolve. We will keep you informed of the status if you provided contact details.
        </p>
      </section>

      {/* How corrections appear */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-text-primary mb-3">How Corrections Appear on Articles</h2>
        <p className="text-text-muted leading-relaxed mb-4">
          Minor factual corrections (wrong date, name, stat, or figure) are made directly in the article text. The corrected text is updated inline and a <strong className="text-text-primary">Correction Notice</strong> block is appended to the article noting what was changed and when.
        </p>
        <p className="text-text-muted leading-relaxed mb-4">
          Substantive corrections — those that change the meaning, conclusion, or key claims of the article — receive a prominently displayed notice at the top of the article in addition to the inline fix. This notice includes the original text, the corrected text, and the date of the revision.
        </p>
        <p className="text-text-muted leading-relaxed">
          We do not silently delete or alter published content without a correction notice. Original phrasing that required correction is preserved in the notice for transparency. Articles that have been corrected carry a &quot;Corrected&quot; label in their metadata.
        </p>
      </section>

      {/* Retraction policy */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-text-primary mb-3">Retraction Policy</h2>
        <p className="text-text-muted leading-relaxed mb-4">
          In rare cases where an article contains errors so severe that correction would be insufficient — such as fabricated information, plagiarism, or claims that are fundamentally and irreparably wrong — the article may be retracted entirely.
        </p>
        <p className="text-text-muted leading-relaxed mb-4">
          Retracted articles are not deleted. The URL is preserved and redirects to a retraction notice that explains why the article was retracted, what it originally claimed, and when the retraction was issued. This ensures the public record is maintained and prevents the retracted content from circulating without context.
        </p>
        <p className="text-text-muted leading-relaxed">
          Retraction decisions are made by the Editor-in-Chief. If a retraction involves a conflict of interest at the editorial level, an independent review will be conducted before the decision is finalised.
        </p>
      </section>

      {/* Editorial updates vs corrections */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-text-primary mb-3">Editorial Updates vs. Corrections</h2>
        <p className="text-text-muted leading-relaxed">
          Not all article updates are corrections. When an article is updated with new information — such as a game receiving a major patch, a release date change, or a follow-up statement from a developer — it is marked as &quot;Updated&quot; with the date of the update and a brief description of what was added. These updates are not triggered by error reports and do not carry a correction notice.
        </p>
      </section>

      <p className="text-sm text-text-muted border-t border-border pt-6">
        To report an error, visit our <Link href="/contact" className="text-accent-light hover:underline">contact page</Link>. For review-specific disputes, see our <Link href="/review-policy" className="text-accent-light hover:underline">Review Policy</Link>.
      </p>
    </div>
  );
}
