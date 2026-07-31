import { fetchPosts } from '@/lib/api';
import Pagination from '@/components/ui/Pagination';
import AdSlot from '@/components/monetization/AdSlot';

const adsEnabled = !!process.env.NEXT_PUBLIC_ADSENSE_ID;
import { buildMeta } from '@/lib/seo';
import SharedListCard from '@/components/blog/SharedListCard';
import HomeListCard from '@/components/blog/HomeListCard';

import CategorySearch from '@/components/search/CategorySearch';
import ContentTypeHeading from '@/components/ui/ContentTypeHeading';

export const dynamic = 'force-dynamic';
export const metadata = buildMeta({ title: 'Deals', description: 'Best gaming deals and discounts', url: '/deals' });

interface Props { searchParams: Promise<Record<string, string | undefined>> }

export default async function DealsListingPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const sort = params.sort;

  const [mainRes, popularRes] = await Promise.all([
    fetchPosts({ page, sort, limit: 20, contentType: 'DEAL', revalidate: 60 }),
    fetchPosts({ page: 1, limit: 8, sort: 'popular', contentType: 'DEAL', revalidate: 60 }),
  ]);

  const articles = mainRes.data || [];
  const popularArticles = popularRes.data || [];

  return (
    <>
      {/* -- TOP AD SLOT -- */}
      {adsEnabled && (
      <div className="hidden sm:flex w-full bg-[#D0D0D0] dark:bg-[#0A0A10] py-5 justify-center border-b border-black/5 dark:border-white/5">
        <div className="w-full max-w-[970px] min-h-[250px] flex items-center justify-center">
          <AdSlot slot="ADS-01" className="w-full" />
        </div>
      </div>
      )}

      <div className="w-full max-w-[1280px] mx-auto px-4 lg:px-0 pt-6 md:pt-10 pb-8">
        <ContentTypeHeading title="DEALS" />
        <div className="mb-4 md:mb-8 flex flex-wrap items-center justify-between gap-4">
          <CategorySearch contentType="DEAL" placeholder="Search deals..." />
        </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] xl:grid-cols-[900px_1fr] gap-6 md:gap-8 items-start min-h-screen">

        {/* -- Main list ----------------------------------- */}
        <div className="lg:border-r-2 lg:border-border lg:pr-8">
          {articles.length === 0 ? (
            <div className="text-center py-20 text-text-muted">No deals yet. Check back soon!</div>
          ) : (
            articles.map((a, i) => (
              <div key={a.id}>
                <SharedListCard article={a} priority={i === 0} isLast={i === articles.length - 1} />
                {/* TODO: In-feed ad every 5 posts — add <AdSlot slot="ADS-01"> here once monetized */}
              </div>
            ))
          )}
          {mainRes.pagination && (
            <Pagination
              currentPage={page}
              totalPages={mainRes.pagination.totalPages}
              basePath="/deals"
              className="mt-4"
            />
          )}


        </div>

        {/* -- Sidebar — reordered to the top on mobile (below the search bar), back to the right column at lg+ -- */}
        <aside className="order-first lg:order-none flex flex-col gap-4 pb-0 md:pb-8 md:gap-6 md:w-full self-stretch">
          {/* Popular panel */}
          <div className="w-full flex flex-col gap-4">
            {/* "POPULAR" header with accent lines */}
            <div className="flex items-center gap-3 mb-1">
              <div className="flex-1 h-[2px] bg-border" />
              <span
                className="text-xs font-extrabold tracking-widest uppercase px-2 py-0.5 rounded text-white"
                style={{ background: 'var(--accent)' }}
              >
                Popular Deals
              </span>
              <div className="flex-1 h-[2px] bg-border" />
            </div>

            {/* Display full list with no scroll container on mobile */}
            <div className="flex flex-col divide-y-2 divide-border">
              {popularArticles.map((a) => (
                <HomeListCard key={a.id} article={a} />
              ))}
            </div>
          </div>

          {/* Sticky Bottom Ad in Sidebar */}
          {adsEnabled && (
          <div className="hidden md:flex justify-center md:sticky md:top-[var(--sticky-offset)] mt-4">
            <AdSlot slot="ADS-06" />
          </div>
          )}
        </aside>
      </div>
    </div>
    </>
  );
}
