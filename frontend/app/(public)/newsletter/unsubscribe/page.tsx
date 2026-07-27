import { Suspense } from 'react';
import NewsletterUnsubscribeClient from './NewsletterUnsubscribeClient';

export const metadata = {
  title: 'Unsubscribe — TheCoreGamer',
  description: 'Unsubscribe from the TheCoreGamer newsletter.',
};

export default function NewsletterUnsubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <NewsletterUnsubscribeClient />
    </Suspense>
  );
}
