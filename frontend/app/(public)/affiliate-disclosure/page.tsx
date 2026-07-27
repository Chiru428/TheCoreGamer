import Link from 'next/link';
import { buildMeta } from '@/lib/seo';

export const metadata = buildMeta({
  title: 'Affiliate Disclosure — TheCoreGamer',
  description: 'TheCoreGamer FTC affiliate disclosure: how we earn commissions, which networks we use, and how affiliate relationships are kept separate from editorial decisions.',
  url: '/affiliate-disclosure',
});

export default function AffiliateDisclosurePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-text-primary mb-2">Affiliate Disclosure</h1>
      <p className="text-sm text-text-muted mb-10">Last updated: June 2026</p>

      {/* FTC compliance */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-text-primary mb-3">FTC Compliance Statement</h2>
        <div className="p-4 rounded-xl border border-accent/20 bg-accent/5 mb-4">
          <p className="text-sm text-text-muted leading-relaxed">
            <strong className="text-text-primary">In plain English:</strong> Some links on TheCoreGamer earn us a small commission if you buy something. This never affects our review scores or what we write about.
          </p>
        </div>
        <p className="text-text-muted leading-relaxed mb-4">
          In accordance with the United States Federal Trade Commission (FTC) guidelines on endorsements and testimonials (16 CFR Part 255), TheCoreGamer discloses that some links published on this site are affiliate links. When a reader clicks an affiliate link and subsequently makes a qualifying purchase, TheCoreGamer may receive a commission from the retailer or affiliate network at no additional cost to the reader.
        </p>
        <p className="text-text-muted leading-relaxed">
          This disclosure applies to all pages on TheCoreGamer, including game reviews, deals pages, and articles that contain store links. Affiliate links are present regardless of whether an explicit disclosure notice appears on every individual page.
        </p>
      </section>

      {/* Networks used */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-text-primary mb-3">Affiliate Networks and Partners</h2>
        <p className="text-text-muted leading-relaxed mb-4">
          TheCoreGamer participates in affiliate programs operated by the following networks and retailers. This list is not exhaustive and may be updated as partnerships change:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-text-muted text-sm leading-relaxed">
          <li><strong className="text-text-primary">Amazon Associates</strong> — retail products, accessories, and game listings</li>
          <li><strong className="text-text-primary">Steam (Valve)</strong> — PC game store links using Valve&apos;s affiliate programme</li>
          <li><strong className="text-text-primary">Humble Bundle</strong> — game bundles and store affiliate links</li>
          <li><strong className="text-text-primary">Fanatical</strong> — PC game key store affiliate links</li>
          <li><strong className="text-text-primary">Green Man Gaming</strong> — PC game store affiliate links</li>
          <li><strong className="text-text-primary">Impact Radius and ShareASale</strong> — network-level affiliates covering various gaming hardware and peripheral retailers</li>
        </ul>
      </section>

      {/* How links are identified */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-text-primary mb-3">How Affiliate Links Are Identified</h2>
        <p className="text-text-muted leading-relaxed mb-4">
          All affiliate links on TheCoreGamer carry the HTML attribute <code className="px-1.5 py-0.5 rounded bg-bg-elevated text-accent-light text-xs font-mono">rel=&quot;sponsored&quot;</code> as required by Google Webmaster Guidelines and consistent with FTC disclosure best practices. This attribute signals to search engines and browsers that the link is a commercial relationship.
        </p>
        <p className="text-text-muted leading-relaxed mb-4">
          In addition, affiliate links on deals pages and game review pages are presented inside clearly labelled purchase buttons or deal cards (e.g., &quot;Buy on Steam&quot;, &quot;Check Deal&quot;). UTM tracking parameters (<code className="px-1.5 py-0.5 rounded bg-bg-elevated text-accent-light text-xs font-mono">utm_source=thecoregamer&amp;utm_medium=affiliate</code>) may be appended to affiliate URLs to allow us to track click performance.
        </p>
        <p className="text-text-muted leading-relaxed">
          Affiliate links are never disguised as non-commercial links. If you are unsure whether a link is an affiliate link, you can check for the <code className="px-1.5 py-0.5 rounded bg-bg-elevated text-accent-light text-xs font-mono">rel=&quot;sponsored&quot;</code> attribute using your browser&apos;s developer tools.
        </p>
      </section>

      {/* Editorial independence */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-text-primary mb-3">Affiliate Relationships and Editorial Independence</h2>
        <p className="text-text-muted leading-relaxed mb-4">
          Affiliate commission potential has <strong className="text-text-primary">no influence</strong> on our review scores, editorial coverage decisions, or the games and products we choose to feature. A game is not reviewed, recommended, or scored differently because it generates affiliate revenue. Our editorial and business operations are separated by design.
        </p>
        <p className="text-text-muted leading-relaxed mb-4">
          Games covered on TheCoreGamer are selected based on reader interest, editorial merit, and available review resources — not on whether a store link is available or profitable. We cover many games for which no affiliate programme exists.
        </p>
        <p className="text-text-muted leading-relaxed">
          If you have concerns about a specific piece of content and its relationship to affiliate activity, please contact us via our <Link href="/contact" className="text-accent-light hover:underline">contact page</Link>. We take editorial integrity concerns seriously and will respond to all enquiries.
        </p>
      </section>

      <p className="text-sm text-text-muted border-t border-border pt-6">
        For more on how we score games and handle review copies, see our <Link href="/review-policy" className="text-accent-light hover:underline">Review Policy</Link>.
      </p>
    </div>
  );
}
