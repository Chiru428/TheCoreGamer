import { Metadata } from 'next';
import { SITE_NAME } from '@/lib/constants';

export const metadata: Metadata = {
  title: `Advertise with Us - ${SITE_NAME}`,
  description: 'Reach our engaged gaming audience. Learn about advertising opportunities on TheCoreGamer.',
};

export default function AdvertisePage() {
  return (
    <main className="w-full max-w-[800px] mx-auto px-4 py-16 md:py-24">
      <h1 className="text-4xl md:text-5xl font-bold mb-6 text-text-strong font-rajdhani">
        Advertise with Us
      </h1>
      
      <div className="prose dark:prose-invert max-w-none text-text">
        <p className="text-lg text-text-muted mb-8 leading-relaxed">
          TheCoreGamer offers a variety of advertising solutions to reach our highly engaged audience of gamers, modders, and tech enthusiasts. 
        </p>

        <h2 className="text-2xl font-bold mb-4 mt-8 text-text-strong">Why Advertise With Us?</h2>
        <ul className="list-disc pl-6 mb-8 space-y-2 text-text-muted">
          <li>Reach a dedicated community of hardcore and casual gamers.</li>
          <li>High engagement rates on mod guides, reviews, and news.</li>
          <li>Custom sponsorship opportunities tailored to your brand.</li>
        </ul>

        <h2 className="text-2xl font-bold mb-4 mt-8 text-text-strong">Newsletter Sponsorship</h2>
        <p className="mb-6 text-text-muted leading-relaxed">
          Put your brand directly in front of thousands of engaged gamers with a sponsored section in our newsletter.
          Each sponsored placement includes a featured image, headline, short description, and a call-to-action
          button linking to your site.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 not-prose">
          <div className="bg-bg-surface border border-border p-6 rounded-xl flex flex-col">
            <p className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">Standard</p>
            <p className="text-3xl font-bold text-text-strong mb-1">$199</p>
            <p className="text-xs text-text-muted mb-4">per send</p>
            <ul className="text-sm text-text-muted space-y-1.5 list-disc pl-4 flex-1">
              <li>Sponsored section in one newsletter send</li>
              <li>Headline, body copy, and CTA button</li>
              <li>Sent to our full subscriber list</li>
            </ul>
          </div>
          <div className="bg-bg-surface border border-accent p-6 rounded-xl flex flex-col relative">
            <span className="absolute -top-3 left-6 bg-accent text-white text-xs font-bold px-2 py-0.5 rounded-full">Most Popular</span>
            <p className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">Featured</p>
            <p className="text-3xl font-bold text-text-strong mb-1">$499</p>
            <p className="text-xs text-text-muted mb-4">3 sends / month</p>
            <ul className="text-sm text-text-muted space-y-1.5 list-disc pl-4 flex-1">
              <li>Sponsored section across 3 newsletter sends</li>
              <li>Featured image + headline, body copy, and CTA</li>
              <li>Optional audience segmentation by genre/platform</li>
            </ul>
          </div>
          <div className="bg-bg-surface border border-border p-6 rounded-xl flex flex-col">
            <p className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">Premium</p>
            <p className="text-3xl font-bold text-text-strong mb-1">$1,499</p>
            <p className="text-xs text-text-muted mb-4">per month</p>
            <ul className="text-sm text-text-muted space-y-1.5 list-disc pl-4 flex-1">
              <li>Sponsored section in every weekly send</li>
              <li>Priority placement and creative support</li>
              <li>Performance report with open &amp; click rates</li>
            </ul>
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-4 mt-8 text-text-strong">Get in Touch</h2>
        <p className="mb-4 text-text-muted">
          For all advertising inquiries, please reach out to our partnerships team. We'll be happy to provide our media kit and discuss how we can work together.
        </p>

        <div className="bg-bg-surface border border-border p-6 rounded-xl mt-8">
          <p className="font-bold text-accent mb-2">Email our partnerships team:</p>
          <a href="mailto:partnerships@thecoregamer.com" className="text-lg hover:underline decoration-accent underline-offset-4">
            partnerships@thecoregamer.com
          </a>
        </div>
      </div>
    </main>
  );
}
