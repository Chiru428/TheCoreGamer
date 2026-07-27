import Link from 'next/link';
import { buildMeta } from '@/lib/seo';

export const metadata = buildMeta({
  title: 'Review Policy — TheCoreGamer',
  description: 'How TheCoreGamer scores games, handles review copies, embargoes, score updates, and conflicts of interest.',
  url: '/review-policy',
});

const scoreLabels = [
  { range: '10.0',      label: 'Masterpiece',  desc: 'A landmark achievement. Essential playing for anyone interested in the genre or medium.', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  { range: '9.0 – 9.9', label: 'Excellent',    desc: 'An outstanding, polished experience with only minor blemishes keeping it from perfection.', color: 'bg-teal-500/15 text-teal-400 border-teal-500/30' },
  { range: '8.0 – 8.9', label: 'Great',        desc: 'A strongly recommended game with minor shortcomings that don\'t undermine the overall experience.', color: 'bg-green-500/15 text-green-400 border-green-500/30' },
  { range: '7.0 – 7.9', label: 'Good',         desc: 'A solid game worth playing, particularly for fans of the genre, despite notable flaws.', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  { range: '6.0 – 6.9', label: 'Fair',         desc: 'A middling experience with real positives, but rough edges and inconsistency keep it from being a clear recommendation.', color: 'bg-lime-500/15 text-lime-400 border-lime-500/30' },
  { range: '5.0 – 5.9', label: 'Average',      desc: 'Has some merit but significant problems limit its appeal. Approach with caution.', color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  { range: '4.0 – 4.9', label: 'Unimpressive', desc: 'Underwhelming and forgettable. Lacks polish or ambition, with flaws that outweigh what little it does well.', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  { range: '3.0 – 3.9', label: 'Bad',          desc: 'Serious, pervasive problems overshadow any positives. Difficult to recommend even to genre enthusiasts.', color: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  { range: '2.0 – 2.9', label: 'Terrible',     desc: 'Fundamentally flawed across nearly every category. Barely functions as intended and offers little to no redeeming value.', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
  { range: '0 – 1.9',   label: 'Unplayable',   desc: 'Broken beyond functioning. Game-breaking bugs, crashes, or missing core features make it impossible to complete or fairly assess.', color: 'bg-red-700/15 text-red-500 border-red-700/30' },
];

export default function ReviewPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-text-primary mb-2">Review Policy</h1>
      <p className="text-sm text-text-muted mb-10">Last updated: June 2026</p>

      {/* Scoring rubric */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-text-primary mb-4">Scoring Scale</h2>
        <p className="text-text-muted leading-relaxed mb-5">
          All games are scored on a <strong className="text-text-primary">0–10 scale</strong> in 0.1 increments. The score is a holistic editorial judgment that weighs gameplay, visuals, story, performance, and value — it is not a mathematical average of category scores. A score reflects the game at the time of review on the tested platform.
        </p>
        <div className="rounded-xl border border-border overflow-hidden">
          {scoreLabels.map((row, i) => (
            <div
              key={row.label}
              className={`flex flex-col sm:flex-row sm:items-start gap-3 px-5 py-4 ${i < scoreLabels.length - 1 ? 'border-b border-border' : ''}`}
            >
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-mono text-sm text-text-muted w-20">{row.range}</span>
                <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${row.color} w-32 text-center`}>{row.label}</span>
              </div>
              <p className="text-sm text-text-muted leading-relaxed">{row.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-text-muted mt-4 leading-relaxed">
          We do not award half-point scores or use letter grades. A score of 5.0 is not a &quot;pass&quot; — it indicates a game that is mediocre but not broken. A 10.0 is exceptionally rare and reserved for games that redefine their genre.
        </p>
      </section>

      {/* Platform note */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-text-primary mb-3">Platform-Specific Scores</h2>
        <p className="text-text-muted leading-relaxed">
          Scores apply to the platform tested. A game reviewed on PC may receive a different score than the same game reviewed on console if meaningful performance, control, or content differences exist between versions. The tested platform is always disclosed in the review header. If a patch or update significantly changes the experience on another platform, we may publish a separate platform-specific follow-up.
        </p>
      </section>

      {/* Review copy policy */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-text-primary mb-3">Review Copy Policy</h2>
        <p className="text-text-muted leading-relaxed mb-4">
          TheCoreGamer sometimes receives advance review copies from publishers, developers, or PR agencies at no cost. When this occurs, it is disclosed at the top of the review. The provision of a review copy does not influence our score, our coverage decisions, or the content of the review in any way.
        </p>
        <p className="text-text-muted leading-relaxed">
          When a game is purchased with personal or editorial funds, or accessed via a subscription service (Game Pass, PlayStation Plus, etc.), that is also disclosed. We do not participate in paid review programs, guaranteed-score arrangements, or any form of review-for-compensation agreement.
        </p>
      </section>

      {/* Embargo policy */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-text-primary mb-3">Embargo Policy</h2>
        <p className="text-text-muted leading-relaxed">
          We respect publisher review embargoes as a standard industry practice that allows reviewers adequate time with a game before publishing. We will not publish review scores or detailed impressions before an agreed embargo date. If we believe an embargo is unreasonably short — preventing a fair assessment — we will disclose this to readers in the review. We do not accept embargo terms that restrict the content or tone of our coverage.
        </p>
      </section>

      {/* Score update policy */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-text-primary mb-3">Score Update Policy</h2>
        <p className="text-text-muted leading-relaxed mb-4">
          Published scores may be updated when a major patch, expansion, or technical update significantly changes the experience — in either direction. Score updates are uncommon and reserved for substantial changes, not minor bug fixes.
        </p>
        <p className="text-text-muted leading-relaxed">
          When a score is updated, the review displays a visible &quot;Score Updated&quot; notice that includes the original score, the new score, the date of the change, and the reason for the revision. The original review text is preserved and an addendum is appended explaining what changed.
        </p>
      </section>

      {/* Conflict of interest */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-text-primary mb-3">Conflict of Interest Policy</h2>
        <p className="text-text-muted leading-relaxed mb-4">
          Reviewers who have a personal, financial, or professional relationship with a game&apos;s developer or publisher are required to disclose this and recuse themselves from reviewing that title. This includes prior employment, personal friendships, Kickstarter backing, or any financial stake in the product.
        </p>
        <p className="text-text-muted leading-relaxed">
          TheCoreGamer does not accept advertising from publishers whose games we are currently reviewing. Advertising relationships are handled by a separate business team with no editorial access. Ad placement decisions are never shared with reviewers prior to publication.
        </p>
      </section>

      <p className="text-sm text-text-muted border-t border-border pt-6">
        Questions about our review process? <Link href="/contact" className="text-accent-light hover:underline">Contact our editorial team.</Link> For correction requests, see our <Link href="/corrections" className="text-accent-light hover:underline">Corrections Policy</Link>.
      </p>
    </div>
  );
}
