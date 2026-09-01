import Link from 'next/link';
import { buildMeta } from '@/lib/seo';

export const metadata = buildMeta({
  title: 'DMCA Policy — TheCoreGamer',
  description: 'TheCoreGamer DMCA takedown policy, counter-notice procedure, repeat infringer policy, and designated agent details.',
  url: '/dmca',
});

export default function DMCAPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-text-primary mb-2">DMCA Policy</h1>
      <p className="text-sm text-text-muted mb-10">Last updated: 1 September 2026</p>

      <div className="space-y-3 text-text-muted text-sm leading-relaxed mb-10">
        <p>
          TheCoreGamer (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) respects the intellectual property rights
          of others and expects users of our platform to do the same. In accordance with the Digital Millennium
          Copyright Act of 1998 (17 U.S.C. § 512) (&quot;DMCA&quot;), we have designated an agent to receive
          notifications of claimed copyright infringement and have established the procedures outlined on this page.
        </p>
        <p>
          We qualify for safe harbour protection under 17 U.S.C. § 512(c) as a service provider that stores
          user-generated content at the direction of our users. We will respond expeditiously to valid takedown notices
          and will, in appropriate circumstances, disable or terminate accounts of repeat infringers.
        </p>
      </div>

      {/* Section 1 — Designated Agent */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-text-primary mb-3">1. Designated Copyright Agent</h2>
        <p className="text-text-muted text-sm leading-relaxed mb-4">
          All DMCA notices — both takedown notices and counter-notices — must be sent to our designated copyright agent.
          Notices sent to any other address may not receive a timely response.
        </p>
        <div className="rounded-xl border border-border bg-bg-elevated p-5 text-sm text-text-muted space-y-1">
          <p><strong className="text-text-primary">DMCA Agent:</strong> TheCoreGamer Legal</p>
          <p><strong className="text-text-primary">Email:</strong>{' '}
            <a href="mailto:dmca@thecoregamer.com" className="underline text-accent">dmca@thecoregamer.com</a>
          </p>
          <p className="text-xs text-text-muted mt-2 leading-relaxed">
            Email is the preferred and fastest method of contact. Please include &quot;DMCA Notice&quot; or &quot;DMCA
            Counter-Notice&quot; in the subject line. We aim to acknowledge all notices within 2 business days.
          </p>
        </div>
      </section>

      {/* Section 2 — Takedown Notice */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-text-primary mb-3">2. Submitting a Copyright Takedown Notice</h2>
        <p className="text-text-muted text-sm leading-relaxed mb-4">
          If you believe that content appearing on TheCoreGamer infringes a copyright you own or control, you may
          submit a written takedown notice to our designated agent. To be valid under 17 U.S.C. § 512(c)(3), your
          notice <strong className="text-text-primary">must</strong> include all of the following:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-text-muted text-sm leading-relaxed mb-4">
          <li>
            <strong className="text-text-primary">Identification of the copyrighted work</strong> — A description of
            the copyrighted work you claim has been infringed. If you are claiming multiple works, you may provide a
            representative list.
          </li>
          <li>
            <strong className="text-text-primary">Identification of the infringing material</strong> — The URL(s) or
            a sufficiently specific description of the content on our platform that you claim is infringing, so that
            we can locate it.
          </li>
          <li>
            <strong className="text-text-primary">Your contact information</strong> — Your full legal name, mailing
            address, telephone number, and email address.
          </li>
          <li>
            <strong className="text-text-primary">Good faith belief statement</strong> — A statement that you have a
            good faith belief that use of the material in the manner complained of is not authorised by the copyright
            owner, its agent, or the law.
          </li>
          <li>
            <strong className="text-text-primary">Accuracy statement</strong> — A statement that the information in
            your notice is accurate and, under penalty of perjury, that you are the copyright owner or are authorised
            to act on behalf of the copyright owner.
          </li>
          <li>
            <strong className="text-text-primary">Signature</strong> — Your physical or electronic signature (typing
            your full legal name is sufficient for an electronic signature).
          </li>
        </ul>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-text-muted leading-relaxed">
          <strong className="text-amber-400">Important:</strong> Under 17 U.S.C. § 512(f), any person who knowingly
          materially misrepresents that material is infringing may be subject to liability for damages, including
          costs and attorneys&apos; fees. Please ensure your claim is made in good faith.
        </div>
      </section>

      {/* Section 3 — Our Response */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-text-primary mb-3">3. How We Handle Takedown Notices</h2>
        <div className="space-y-3 text-text-muted text-sm leading-relaxed">
          <p>
            Upon receipt of a complete and valid takedown notice, we will:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Acknowledge receipt of the notice within 2 business days;</li>
            <li>Remove or disable access to the allegedly infringing material promptly;</li>
            <li>Notify the user who submitted or posted the material that it has been removed and why;</li>
            <li>
              Provide that user with a copy of the takedown notice (with your personal contact details redacted where
              possible) and inform them of their right to submit a counter-notice.
            </li>
          </ul>
          <p>
            If your notice is incomplete, we will notify you of what is missing. We may not be able to act on
            incomplete notices until all required elements are provided.
          </p>
        </div>
      </section>

      {/* Section 4 — Counter-Notice */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-text-primary mb-3">4. Submitting a Counter-Notice</h2>
        <p className="text-text-muted text-sm leading-relaxed mb-4">
          If you believe that material you submitted was removed or disabled as a result of a mistake or
          misidentification of the material as infringing, you may submit a written counter-notice to our designated
          agent. Your counter-notice must include all of the following (as required by 17 U.S.C. § 512(g)(3)):
        </p>
        <ul className="list-disc pl-6 space-y-2 text-text-muted text-sm leading-relaxed mb-4">
          <li>
            <strong className="text-text-primary">Identification of the removed material</strong> — A description of
            the material that was removed and its location on our platform before it was removed (include the URL if
            you have it).
          </li>
          <li>
            <strong className="text-text-primary">Good faith belief statement</strong> — A statement under penalty of
            perjury that you have a good faith belief the material was removed or disabled as a result of a mistake
            or misidentification.
          </li>
          <li>
            <strong className="text-text-primary">Your contact information</strong> — Your full legal name, mailing
            address, telephone number, and email address.
          </li>
          <li>
            <strong className="text-text-primary">Consent to jurisdiction</strong> — A statement that you consent to
            the jurisdiction of the Federal District Court for the district in which your address is located (or, if
            outside the United States, any judicial district in which TheCoreGamer may be found), and that you will
            accept service of process from the person who filed the original takedown notice.
          </li>
          <li>
            <strong className="text-text-primary">Signature</strong> — Your physical or electronic signature.
          </li>
        </ul>
        <p className="text-text-muted text-sm leading-relaxed mb-4">
          Upon receipt of a valid counter-notice, we will forward it to the original complainant and inform them that
          we intend to restore the removed material in <strong className="text-text-primary">10 to 14 business days</strong>,
          unless the complainant notifies us that they have filed an action seeking a court order to restrain you from
          engaging in the infringing activity. We will restore the material within 10 to 14 business days after sending
          the counter-notice to the complainant, provided we do not receive notice of such court action.
        </p>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-text-muted leading-relaxed">
          <strong className="text-amber-400">Important:</strong> Under 17 U.S.C. § 512(f), any person who knowingly
          materially misrepresents that material was removed or disabled by mistake or misidentification may be subject
          to liability for damages. Please ensure your counter-notice is made in good faith.
        </div>
      </section>

      {/* Section 5 — Repeat Infringers */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-text-primary mb-3">5. Repeat Infringer Policy</h2>
        <div className="space-y-3 text-text-muted text-sm leading-relaxed">
          <p>
            In accordance with the DMCA and other applicable law, TheCoreGamer has adopted a policy of terminating, in
            appropriate circumstances, the accounts of users who are deemed to be repeat infringers.
          </p>
          <p>
            A user may be considered a repeat infringer if they have had content removed in response to two or more
            valid DMCA takedown notices within a 12-month period. Repeat infringers may have their account permanently
            suspended without prior warning. We also reserve the right to terminate accounts of users who, in our sole
            judgment, submit or post infringing content even in the absence of multiple formal takedown notices.
          </p>
          <p>
            Account termination decisions are logged internally and may be reviewed upon written request to{' '}
            <a href="mailto:dmca@thecoregamer.com" className="underline text-accent">dmca@thecoregamer.com</a>.
          </p>
        </div>
      </section>

      {/* Section 6 — Scope */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-text-primary mb-3">6. Scope of This Policy</h2>
        <div className="space-y-3 text-text-muted text-sm leading-relaxed">
          <p>
            This policy applies to content posted or uploaded by users on the TheCoreGamer platform, including
            comments, profile images, and any other user-generated material. It does not apply to editorial content
            produced by TheCoreGamer&apos;s own staff or contributors — disputes about editorial content should be
            directed to{' '}
            <a href="mailto:legal@thecoregamer.com" className="underline text-accent">legal@thecoregamer.com</a>.
          </p>
          <p>
            This policy is intended to comply with the requirements of the DMCA safe harbour provisions (17 U.S.C.
            § 512). Nothing in this policy limits any other rights or remedies that a copyright owner may have under
            applicable law.
          </p>
        </div>
      </section>

      {/* Section 7 — Contact */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-text-primary mb-3">7. Contact &amp; Questions</h2>
        <div className="space-y-3 text-text-muted text-sm leading-relaxed">
          <p>
            For DMCA takedown notices, counter-notices, or questions about this policy, contact our designated agent:
          </p>
          <div className="rounded-xl border border-border bg-bg-elevated p-5 text-sm text-text-muted space-y-1">
            <p><strong className="text-text-primary">Email:</strong>{' '}
              <a href="mailto:dmca@thecoregamer.com" className="underline text-accent">dmca@thecoregamer.com</a>
            </p>
            <p className="text-xs text-text-muted mt-1">
              Please include &quot;DMCA Notice&quot; or &quot;DMCA Counter-Notice&quot; in your subject line.
            </p>
          </div>
          <p>
            For general legal enquiries unrelated to copyright, email{' '}
            <a href="mailto:legal@thecoregamer.com" className="underline text-accent">legal@thecoregamer.com</a>.
          </p>
        </div>
      </section>

      <p className="text-sm text-text-muted border-t border-border pt-6">
        Related policies:{' '}
        <Link href="/terms" className="text-accent-light hover:underline">Terms of Service</Link>
        {' · '}
        <Link href="/privacy" className="text-accent-light hover:underline">Privacy Policy</Link>
        {' · '}
        <Link href="/corrections" className="text-accent-light hover:underline">Corrections Policy</Link>
      </p>
    </div>
  );
}
