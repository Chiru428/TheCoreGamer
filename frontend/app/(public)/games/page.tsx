import { fetchGames } from '@/lib/api';
import { buildMeta } from '@/lib/seo';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import CategorySearch from '@/components/search/CategorySearch';
import SortDropdown from '@/components/ui/SortDropdown';
import { slugify } from '@/lib/utils';
import GamesGridClient from '@/components/games/GamesGridClient';

export const revalidate = 120;
export const metadata = buildMeta({ title: 'Games', description: 'Browse all games on TheCoreGamer', url: '/games' });



export default async function GamesPage({ searchParams }: { searchParams: Promise<{ search?: string; page?: string; sort?: string; collection?: string }> }) {
  const unwrappedParams = await searchParams;
  const search = unwrappedParams.search;
  const collection = unwrappedParams.collection;
  const page = parseInt(unwrappedParams.page || '1', 10);
  const sort = unwrappedParams.sort || 'newest';
  const res = await fetchGames({ fields: 'card', limit: 100, search, collection, page, sort, revalidate: 120 });
  const games = res.data || [];

  // Determine the page header
  const pageTitle = search
    ? `Search: ${search}`
    : 'Games';

  return (
    <>
      <PageHeader title={pageTitle} description="Browse games for reviews, mod guides, and news" />
      <div className="w-full max-w-[1280px] mx-auto px-4 md:px-6 xl:px-0 pb-12">
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex justify-end pb-2">
          <CategorySearch indexName="games" placeholder="Search games..." />
        </div>
      </div>

      {/* Games grid with load more */}
      <GamesGridClient
        initialGames={games}
        totalPages={res.pagination?.totalPages ?? 1}
      />
      </div>
    </>
  );
}
