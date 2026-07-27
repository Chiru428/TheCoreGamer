import { Suspense } from 'react';
import NewsletterConfirmClient from './NewsletterConfirmClient';

export const metadata = {
  title: 'Confirm Subscription — TheCoreGamer',
  description: 'Confirm your newsletter subscription.',
};

export default function NewsletterConfirmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <NewsletterConfirmClient />
    </Suspense>
  );
}
