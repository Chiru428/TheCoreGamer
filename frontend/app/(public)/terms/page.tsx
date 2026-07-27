import { buildMeta } from '@/lib/seo';
export const metadata = buildMeta({ title: 'Terms of Service', description: 'TheCoreGamer terms of service', url: '/terms' });
export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-text-primary mb-6">Terms of Service</h1>
      <div className="space-y-4 text-text-muted text-sm leading-relaxed">
        <p>By using TheCoreGamer, you agree to these terms. Please read them carefully.</p>
        <h2 className="text-lg font-bold text-text-primary mt-6">1. Content</h2>
        <p>All content on TheCoreGamer is protected by copyright. You may not reproduce, distribute, or modify content without permission.</p>
        <h2 className="text-lg font-bold text-text-primary mt-6">2. User Conduct</h2>
        <p>Users must follow community guidelines. Harassment, spam, and toxic behavior will result in account suspension.</p>
        <h2 className="text-lg font-bold text-text-primary mt-6">3. Accounts</h2>
        <p>You are responsible for maintaining the security of your account. We reserve the right to terminate accounts that violate our terms.</p>
      </div>
    </div>
  );
}
