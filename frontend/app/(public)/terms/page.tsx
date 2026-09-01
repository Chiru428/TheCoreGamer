import Link from 'next/link';
import { buildMeta } from '@/lib/seo';

export const metadata = buildMeta({
  title: 'Terms of Service — TheCoreGamer',
  description: 'Read the Terms of Service for TheCoreGamer — your rights, responsibilities, and the rules that govern your use of our platform.',
  url: '/terms',
});

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-text-primary mb-2">Terms of Service</h1>
      <p className="text-sm text-text-muted mb-10">Last updated: 1 September 2026</p>

      <div className="space-y-2 text-text-muted text-sm leading-relaxed">
        <p>
          Please read these Terms of Service (&quot;Terms&quot;) carefully before using TheCoreGamer (the &quot;Site&quot;,
          &quot;Service&quot;, or &quot;Platform&quot;), operated by TheCoreGamer (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;).
          By accessing or using the Site you confirm that you have read, understood, and agree to be bound by these Terms
          and our <Link href="/privacy" className="underline text-accent">Privacy Policy</Link>. If you do not agree,
          please stop using the Site immediately.
        </p>
      </div>

      {/* 1. Eligibility */}
      <section className="mt-10 mb-8">
        <h2 className="text-lg font-bold text-text-primary mb-3">1. Eligibility</h2>
        <div className="space-y-3 text-text-muted text-sm leading-relaxed">
          <p>
            You must be at least <strong className="text-text-primary">13 years of age</strong> to use TheCoreGamer. If
            you are under 18, you must have your parent or legal guardian&apos;s permission to use the Site. By using the
            Site you represent and warrant that you meet these requirements.
          </p>
          <p>
            If you are using the Site on behalf of a company or other legal entity, you represent that you have the
            authority to bind that entity to these Terms, in which case &quot;you&quot; refers to that entity.
          </p>
        </div>
      </section>

      {/* 2. Accounts */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-text-primary mb-3">2. Accounts</h2>
        <div className="space-y-3 text-text-muted text-sm leading-relaxed">
          <p>
            You are not required to create an account to browse the Site. However, certain features — such as posting
            comments, rating games, maintaining a reading list, and earning badges — require registration.
          </p>
          <p>
            When you register you agree to provide accurate, current, and complete information and to keep it up to date.
            You are solely responsible for maintaining the confidentiality of your password and for all activity that
            occurs under your account. You must notify us immediately at{' '}
            <a href="mailto:support@thecoregamer.com" className="underline text-accent">support@thecoregamer.com</a> if
            you suspect any unauthorised use of your account.
          </p>
          <p>
            You may not create an account using a false identity, impersonate another person, or create an account on
            behalf of someone else without their permission. You may not transfer your account to any other person.
          </p>
          <p>
            We reserve the right to suspend or permanently terminate any account that violates these Terms, at our sole
            discretion and without prior notice where urgent action is required.
          </p>
        </div>
      </section>

      {/* 3. User-Generated Content */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-text-primary mb-3">3. User-Generated Content</h2>
        <div className="space-y-3 text-text-muted text-sm leading-relaxed">
          <p>
            The Site may allow you to submit, post, or display content such as comments, game ratings, reviews, and
            other material (&quot;User Content&quot;). By submitting User Content you grant TheCoreGamer a worldwide,
            non-exclusive, royalty-free, sublicensable, and transferable licence to use, reproduce, distribute, prepare
            derivative works of, display, and perform your User Content in connection with the Service.
          </p>
          <p>You represent and warrant that:</p>
          <ul className="list-disc list-inside ml-2 space-y-1">
            <li>You own or have the necessary rights to submit your User Content;</li>
            <li>Your User Content does not infringe any third-party intellectual property, privacy, or publicity rights;</li>
            <li>Your User Content is accurate and not misleading.</li>
          </ul>
          <p>
            We reserve the right (but have no obligation) to monitor, edit, or remove User Content at our discretion.
            You remain solely responsible for all content you submit.
          </p>
        </div>
      </section>

      {/* 4. Community Standards & Prohibited Conduct */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-text-primary mb-3">4. Community Standards &amp; Prohibited Conduct</h2>
        <div className="space-y-3 text-text-muted text-sm leading-relaxed">
          <p>You agree not to use the Site to:</p>
          <ul className="list-disc list-inside ml-2 space-y-1">
            <li>Harass, bully, threaten, or intimidate other users;</li>
            <li>Post hate speech, discriminatory content, or content that promotes violence;</li>
            <li>Spam, flood, or repeatedly post the same or similar content;</li>
            <li>Impersonate any person or entity, or misrepresent your affiliation with any person or entity;</li>
            <li>Upload or transmit viruses, malware, or any other malicious code;</li>
            <li>Attempt to gain unauthorised access to any part of the Site, its servers, or connected systems;</li>
            <li>Scrape, crawl, or use automated tools to collect data from the Site without our prior written consent;</li>
            <li>Post or link to content that is pornographic, obscene, or otherwise illegal;</li>
            <li>Promote or facilitate illegal activity of any kind.</li>
          </ul>
          <p>
            Violation of these standards may result in content removal, account suspension, or permanent ban, at our
            sole discretion. Serious violations may be reported to law enforcement.
          </p>
        </div>
      </section>

      {/* 5. Intellectual Property */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-text-primary mb-3">5. Intellectual Property</h2>
        <div className="space-y-3 text-text-muted text-sm leading-relaxed">
          <p>
            All content on TheCoreGamer — including but not limited to articles, reviews, guides, graphics, logos,
            icons, images, audio clips, and software — is the property of TheCoreGamer or its content suppliers and is
            protected by applicable copyright, trademark, and other intellectual property laws.
          </p>
          <p>
            You may share links to our content and quote brief excerpts for commentary, criticism, or news reporting,
            provided you attribute TheCoreGamer and link back to the original article. You may not reproduce, distribute,
            republish, or create derivative works from our editorial content without our prior written permission.
          </p>
          <p>
            If you believe content on our platform infringes your copyright, please review our{' '}
            <Link href="/dmca" className="underline text-accent">DMCA Policy</Link> and follow the takedown procedure
            described there.
          </p>
        </div>
      </section>

      {/* 6. Third-Party Links & Services */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-text-primary mb-3">6. Third-Party Links &amp; Services</h2>
        <div className="space-y-3 text-text-muted text-sm leading-relaxed">
          <p>
            The Site contains links to third-party websites, stores, and services (including affiliate links). These
            links are provided for your convenience; we do not endorse and are not responsible for the content, privacy
            practices, or terms of those third-party sites. Visiting them is at your own risk.
          </p>
          <p>
            Some links on our platform are affiliate links — we may earn a commission if you make a purchase after
            clicking them. This never affects our editorial content or review scores. For full details, read our{' '}
            <Link href="/affiliate-disclosure" className="underline text-accent">Affiliate Disclosure</Link>.
          </p>
        </div>
      </section>

      {/* 7. Advertising */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-text-primary mb-3">7. Advertising</h2>
        <div className="space-y-3 text-text-muted text-sm leading-relaxed">
          <p>
            TheCoreGamer displays advertisements served by Google AdSense and other ad networks. By using the Site you
            agree to the display of such advertisements. Personalised advertising is only served after you provide
            consent via our cookie banner. You can manage your ad preferences at any time through the &quot;Cookie
            Settings&quot; link in the site footer.
          </p>
        </div>
      </section>

      {/* 8. Account Deletion */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-text-primary mb-3">8. Account Deletion</h2>
        <div className="space-y-3 text-text-muted text-sm leading-relaxed">
          <p>
            You may delete your account at any time from your{' '}
            <Link href="/settings/profile" className="underline text-accent">Account Settings</Link> page. Upon
            deletion, your profile information (display name, username, email, avatar, and bio) is anonymised
            immediately. Your personal activity data — bookmarks, reading lists, followed teams, badges, point history,
            and push subscriptions — is permanently deleted. Comments you have posted are retained to preserve
            discussion continuity but are disassociated from your account.
          </p>
          <p>
            We may also terminate or suspend your account without notice if we determine you have violated these Terms.
            Upon termination for cause, your right to use the Site ceases immediately and we may, at our discretion,
            delete your account data.
          </p>
        </div>
      </section>

      {/* 9. Disclaimers */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-text-primary mb-3">9. Disclaimers</h2>
        <div className="space-y-3 text-text-muted text-sm leading-relaxed">
          <p>
            THE SITE AND ITS CONTENT ARE PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS WITHOUT
            WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF
            MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SITE
            WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS.
          </p>
          <p>
            Editorial content — including game reviews and scores — represents the honest opinion of the reviewer at the
            time of publication. Scores and assessments may change as games are updated; see our{' '}
            <Link href="/review-policy" className="underline text-accent">Review Policy</Link> for details on how score
            updates are handled.
          </p>
        </div>
      </section>

      {/* 10. Limitation of Liability */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-text-primary mb-3">10. Limitation of Liability</h2>
        <div className="space-y-3 text-text-muted text-sm leading-relaxed">
          <p>
            TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, THECOREGAMER, ITS OFFICERS, DIRECTORS, EMPLOYEES,
            CONTRIBUTORS, AND PARTNERS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
            PUNITIVE DAMAGES — INCLUDING LOSS OF PROFITS, DATA, GOODWILL, OR BUSINESS INTERRUPTION — ARISING OUT OF OR
            RELATED TO YOUR USE OF OR INABILITY TO USE THE SITE OR ITS CONTENT, EVEN IF WE HAVE BEEN ADVISED OF THE
            POSSIBILITY OF SUCH DAMAGES.
          </p>
          <p>
            In no event shall our total aggregate liability to you for all claims arising out of or relating to these
            Terms or your use of the Site exceed the greater of (a) the amount you paid us, if any, in the twelve
            months preceding the claim, or (b) USD $100. Some jurisdictions do not allow limitation of certain damages;
            in such jurisdictions our liability is limited to the maximum extent permitted by law.
          </p>
        </div>
      </section>

      {/* 11. Indemnification */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-text-primary mb-3">11. Indemnification</h2>
        <div className="space-y-3 text-text-muted text-sm leading-relaxed">
          <p>
            You agree to indemnify, defend, and hold harmless TheCoreGamer and its officers, directors, employees,
            contributors, and partners from and against any claims, liabilities, damages, losses, and expenses
            (including reasonable legal fees) arising out of or in any way connected with your access to or use of the
            Site, your User Content, or your violation of these Terms.
          </p>
        </div>
      </section>

      {/* 12. Governing Law & Disputes */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-text-primary mb-3">12. Governing Law &amp; Dispute Resolution</h2>
        <div className="space-y-3 text-text-muted text-sm leading-relaxed">
          <p>
            These Terms are governed by and construed in accordance with the laws of the United States, without regard
            to its conflict-of-law provisions. Any dispute arising under or relating to these Terms shall first be
            attempted to be resolved through good-faith negotiation. If we cannot resolve a dispute informally, both
            parties agree to submit to binding arbitration in accordance with the rules of the American Arbitration
            Association (AAA), conducted in English.
          </p>
          <p>
            Notwithstanding the foregoing, either party may seek injunctive or other equitable relief in any court of
            competent jurisdiction to prevent irreparable harm. You agree that any claim must be brought in your
            individual capacity, not as a plaintiff or class member in any purported class action.
          </p>
        </div>
      </section>

      {/* 13. Changes to Terms */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-text-primary mb-3">13. Changes to These Terms</h2>
        <div className="space-y-3 text-text-muted text-sm leading-relaxed">
          <p>
            We may update these Terms from time to time. When we make material changes, we will update the &quot;Last
            updated&quot; date at the top of this page and, where required by law, notify you by email or by displaying
            a prominent notice on the Site. Your continued use of the Site after the effective date of any changes
            constitutes your acceptance of the revised Terms. If you do not agree to the revised Terms, you must stop
            using the Site.
          </p>
        </div>
      </section>

      {/* 14. Contact */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-text-primary mb-3">14. Contact</h2>
        <div className="space-y-3 text-text-muted text-sm leading-relaxed">
          <p>
            If you have any questions about these Terms, please contact us via our{' '}
            <Link href="/contact" className="underline text-accent">contact page</Link> or by email at{' '}
            <a href="mailto:legal@thecoregamer.com" className="underline text-accent">legal@thecoregamer.com</a>.
          </p>
        </div>
      </section>

      <p className="text-sm text-text-muted border-t border-border pt-6 mt-4">
        Related policies:{' '}
        <Link href="/privacy" className="text-accent-light hover:underline">Privacy Policy</Link>
        {' · '}
        <Link href="/dmca" className="text-accent-light hover:underline">DMCA Policy</Link>
        {' · '}
        <Link href="/affiliate-disclosure" className="text-accent-light hover:underline">Affiliate Disclosure</Link>
      </p>
    </div>
  );
}
