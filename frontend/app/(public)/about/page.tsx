import Link from 'next/link';
import { buildMeta } from '@/lib/seo';

export const metadata = buildMeta({
  title: 'About TheCoreGamer',
  description: 'TheCoreGamer is an independent gaming editorial platform delivering honest game reviews, mod guides, and industry news.',
  url: '/about',
});

const scoreRubric = [
  { category: 'Gameplay', desc: 'Core mechanics, controls, feel, depth, and moment-to-moment engagement.' },
  { category: 'Visuals', desc: 'Art direction, graphical fidelity, performance, and technical polish.' },
  { category: 'Story', desc: 'Narrative depth, writing quality, characters, and worldbuilding (weighted lower for multiplayer titles).' },
  { category: 'Performance', desc: 'Frame-rate stability, load times, bugs, and platform-specific technical quality.' },
  { category: 'Value', desc: 'Content volume, replayability, and price-to-quality ratio at launch.' },
];

const policyLinks = [
  { label: 'Review Policy', href: '/review-policy' },
  { label: 'Corrections Policy', href: '/corrections' },
  { label: 'Affiliate Disclosure', href: '/affiliate-disclosure' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
  { label: 'DMCA', href: '/dmca' },
  { label: 'Contact Us', href: '/contact' },
];

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-text-primary mb-2">About TheCoreGamer</h1>
      <p className="text-sm text-text-muted mb-10">Independent gaming editorial — reviews, guides, and news you can trust.</p>

      {/* Mission */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-text-primary mb-3">Our Mission</h2>
        <div className="space-y-4 text-text-muted leading-relaxed">
          <p>
            TheCoreGamer is an independent gaming editorial platform built on one principle: gamers deserve honest, thoroughly researched content free from publisher pressure or advertiser influence. We cover game reviews, mod guides, breaking news, and game deals — all produced without pay-to-play coverage agreements or sponsored scores.
          </p>
          <p>
            We accept no payment for review coverage. Our editorial decisions — which games we cover, how we score them, and what we write — are made entirely by our editorial team based on merit and reader interest.
          </p>
        </div>
      </section>

      {/* Team */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-text-primary mb-3">Our Team</h2>
        <div className="space-y-4 text-text-muted leading-relaxed">
          <p>
            TheCoreGamer is written and maintained by a team of passionate gamers with backgrounds spanning game development, journalism, competitive play, and modding. Our contributors review games across PC, PlayStation, Xbox, and Nintendo platforms.
          </p>
          <p>
            Every reviewer discloses how they obtained the game they reviewed — whether purchased, provided as a review copy, or played via subscription. You can read our full disclosure standards on the <Link href="/review-policy" className="text-accent-light hover:underline">Review Policy</Link> page.
          </p>
        </div>
      </section>

      {/* How we score */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-text-primary mb-3">How We Score Games</h2>
        <p className="text-text-muted leading-relaxed mb-4">
          Reviews are scored on a <strong className="text-text-primary">0–10 scale</strong> in 0.1 increments. The final score reflects a holistic judgment — not a simple average — weighted across five categories:
        </p>
        <div className="rounded-xl border border-border overflow-hidden mb-4">
          {scoreRubric.map((row, i) => (
            <div
              key={row.category}
              className={`flex gap-4 px-5 py-4 ${i < scoreRubric.length - 1 ? 'border-b border-border' : ''}`}
            >
              <span className="text-sm font-bold text-text-primary w-28 shrink-0">{row.category}</span>
              <span className="text-sm text-text-muted leading-relaxed">{row.desc}</span>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-border overflow-hidden mb-4">
          {[
            { range: '9.0 – 10', label: 'Masterpiece', color: 'text-purple-400' },
            { range: '8.0 – 8.9', label: 'Great', color: 'text-green-400' },
            { range: '7.0 – 7.9', label: 'Good', color: 'text-blue-400' },
            { range: '5.0 – 6.9', label: 'Average', color: 'text-yellow-400' },
            { range: '0 – 4.9',   label: 'Poor', color: 'text-red-400' },
          ].map((row, i, arr) => (
            <div
              key={row.label}
              className={`flex items-center gap-4 px-5 py-3 ${i < arr.length - 1 ? 'border-b border-border' : ''}`}
            >
              <span className="text-sm font-mono text-text-muted w-20 shrink-0">{row.range}</span>
              <span className={`text-sm font-bold ${row.color}`}>{row.label}</span>
            </div>
          ))}
        </div>
        <p className="text-text-muted text-sm leading-relaxed">
          Scores may be updated post-publication when patches significantly change a game&apos;s quality. All updates are documented with a timestamp and explanation visible on the review itself.
        </p>
      </section>

      {/* Review copies */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-text-primary mb-3">Review Copy Disclosure</h2>
        <p className="text-text-muted leading-relaxed">
          When we receive a review copy from a publisher or developer, it is disclosed at the top of the relevant review. Receipt of a review copy has no influence on our score or editorial coverage decisions. If a game is purchased by our team with personal or editorial funds, that is also disclosed. We do not participate in paid review programs or score guarantees of any kind.
        </p>
      </section>

      {/* Policy links */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-text-primary mb-4">Editorial Policies</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {policyLinks.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className="flex items-center px-4 py-3 rounded-xl border border-border text-sm font-medium text-text-muted hover:text-accent hover:border-accent/40 transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
