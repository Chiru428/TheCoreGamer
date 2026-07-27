import { buildMeta } from '@/lib/seo';
export const metadata = buildMeta({ title: 'Privacy Policy', description: 'TheCoreGamer privacy policy', url: '/privacy' });

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-text-primary mb-6">Privacy Policy</h1>
      <div className="space-y-4 text-text-muted text-sm leading-relaxed">
        <p>Last updated: 16 June 2026</p>

        <h2 className="text-lg font-bold text-text-primary mt-8">1. Data We Collect</h2>
        <p>We collect information you provide directly when you create an account or interact with the site:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li><strong className="text-text-primary">Account details</strong> — display name, username, email address, hashed password, avatar URL, and bio.</li>
          <li><strong className="text-text-primary">User-generated content</strong> — comments you post, game ratings and reviews you submit, and reading list entries.</li>
          <li><strong className="text-text-primary">Search queries</strong> — search terms entered in the site search (Algolia), used to power results and improve relevance.</li>
          <li><strong className="text-text-primary">Engagement data</strong> — which articles or games you view, bookmark, or follow.</li>
          <li><strong className="text-text-primary">Device and session data</strong> — IP address, browser type, operating system, referring URL, and pages visited, collected automatically via server logs and analytics cookies (subject to your consent).</li>
          <li><strong className="text-text-primary">Push notification tokens</strong> — device tokens stored to deliver browser push notifications, if you opt in.</li>
          <li><strong className="text-text-primary">Newsletter subscription</strong> — email address and subscription status, if you subscribe to our newsletter.</li>
          <li><strong className="text-text-primary">OAuth identifiers</strong> — Discord user ID, Steam ID, or Google account identifier when you use social sign-in (we never store OAuth access tokens beyond the session).</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8">2. How We Use Your Information</h2>
        <p>We use your information to provide and improve our services, personalise content recommendations, display relevant advertisements, send transactional emails (password reset, account deletion confirmation), and communicate with you via newsletter (if subscribed). We do not sell your personal data to third parties.</p>

        <h2 className="text-lg font-bold text-text-primary mt-8">3. Third-Party Services</h2>
        <p>We share data with the following processors under appropriate data-processing agreements or standard contractual clauses:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li><strong className="text-text-primary">Google Analytics 4</strong> — aggregated traffic analysis; analytics cookies set only after you consent. Data retained in GA4 for 14 months.</li>
          <li><strong className="text-text-primary">Microsoft Clarity</strong> — heatmap and session recording; loads only after analytics consent. Clarity's data retention is 13 months.</li>
          <li><strong className="text-text-primary">Google AdSense</strong> — advertising; personalised ads served only after advertising consent. Non-personalised ads are shown otherwise.</li>
          <li><strong className="text-text-primary">Algolia</strong> — search-as-a-service; your search queries are sent to Algolia servers to return results. Algolia retains query logs for 90 days.</li>
          <li><strong className="text-text-primary">Discord / Steam / Google OAuth</strong> — used only during sign-in; we receive a unique identifier and optionally your email address.</li>
          <li><strong className="text-text-primary">Resend</strong> — transactional email delivery (e.g. password reset, account deletion). Email metadata is retained per Resend's standard policy.</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8">4. Cookies &amp; Consent</h2>
        <p>We use a cookie consent banner to obtain your explicit permission before loading analytics or advertising cookies. You can change your preferences at any time via the "Cookie Settings" link in the site footer. Consent choices are stored locally for 12 months before we re-prompt you. Strictly necessary cookies (session management, CSRF protection, theme preference) are always active and do not require consent.</p>

        <h2 className="text-lg font-bold text-text-primary mt-8">5. Your Rights (GDPR)</h2>
        <p>If you are in the EEA, UK, or Switzerland you have the right to access, correct, export, and erase your personal data. You may also object to processing, withdraw consent at any time, and lodge a complaint with your local data protection authority.</p>
        <p className="mt-2">To exercise your data rights, visit your <a href="/settings/profile" className="underline text-accent">Account Settings</a> page where you can download or permanently delete your account. For requests we cannot fulfil automatically, email <a href="mailto:privacy@thecoregamer.com" className="underline text-accent">privacy@thecoregamer.com</a>.</p>

        <h2 className="text-lg font-bold text-text-primary mt-8">6. Data Retention</h2>
        <p>We retain your account data for as long as your account is active. If you delete your account, your profile information (name, username, avatar, bio, email, and password) is anonymised immediately and your personal activity data — bookmarks, reading lists, followed teams, badges, point history, and push subscriptions — is permanently deleted. Comments you have posted remain visible to preserve discussion threads but are no longer associated with your account. Server logs and aggregated analytics data may be retained for up to 90 days for security and abuse-prevention purposes. Backups containing your data are rotated out within 30 days. Newsletter subscription records are retained until you unsubscribe, after which only an anonymised unsubscribed-at timestamp is kept for compliance purposes.</p>

        <h2 className="text-lg font-bold text-text-primary mt-8">7. Contact</h2>
        <p>For privacy inquiries, email <a href="mailto:privacy@thecoregamer.com" className="underline text-accent">privacy@thecoregamer.com</a>.</p>
      </div>
    </div>
  );
}
