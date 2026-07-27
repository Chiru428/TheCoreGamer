import type { Metadata } from 'next';
import { Suspense } from 'react';
import SearchPageClient from './SearchPageClient';

// -- Constants -----------------------------------------------------------------

const SITE_NAME = 'TheCoreGamer';

// -- Types ---------------------------------------------------------------------

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

// -- Metadata ------------------------------------------------------------------

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  if (!q?.trim()) {
    return {
      title: `Search — ${SITE_NAME}`,
      robots: { index: false, follow: false },
    };
  }
  return {
    title: `Search results for "${q}" — ${SITE_NAME}`,
    description: `Browse search results for "${q}" on TheCoreGamer — gaming news, reviews, mod guides, and more.`,
    robots: { index: false, follow: true },
  };
}

// -- Page ----------------------------------------------------------------------

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <SearchPageClient initialParams={params} />
    </Suspense>
  );
}
