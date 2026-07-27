import { buildMeta } from '@/lib/seo';
export const metadata = buildMeta({ title: 'DMCA Policy', description: 'TheCoreGamer DMCA policy', url: '/dmca' });
export default function DMCAPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-text-primary mb-6">DMCA Policy</h1>
      <div className="space-y-4 text-text-muted text-sm leading-relaxed">
        <p>TheCoreGamer respects the intellectual property rights of others. If you believe content on our platform infringes your copyright, please submit a DMCA takedown notice to dmca@thecoregamer.com.</p>
        <h2 className="text-lg font-bold text-text-primary mt-6">Required Information</h2>
        <ul className="list-disc pl-6 space-y-1"><li>Identification of the copyrighted work</li><li>URL of the infringing content</li><li>Your contact information</li><li>A statement of good faith</li><li>Your physical or electronic signature</li></ul>
      </div>
    </div>
  );
}
