import { fetchReviews, fetchReviewFacets } from '@/lib/api';
import Pagination from '@/components/ui/Pagination';
import AdSlot from '@/components/monetization/AdSlot';

const adsEnabled = !!process.env.NEXT_PUBLIC_ADSENSE_ID;
import { buildMeta } from '@/lib/seo';
import SharedListCard from '@/components/blog/SharedListCard';
import HomeListCard from '@/components/blog/HomeListCard';
import PageHeader from '@/components/ui/PageHeader';
import CategorySearch from '@/components/search/CategorySearch';
import ReviewFilters from '@/components/search/ReviewFilters';
import ReviewActiveFilters from '@/components/search/ReviewActiveFilters';
import ContentTypeHeading from '@/components/ui/ContentTypeHeading';

export const dynamic = 'force-dynamic';
export const metadata = buildMeta({ title: 'Reviews', description: 'In-depth gaming reviews with scores and verdicts', url: '/reviews' });

interface Props { searchParams: Promise<Record<string, string | undefined>> }

export default async function ReviewsListingPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const sort = params.sort;
  const platform = params.platform;
  const genre = params.genre;
  const score = params.score;
  const year = params.year;
  const tag = params.tag;

  const [mainRes, popularRes, facetsRes] = await Promise.all([
    fetchReviews({ page, sort, platform, genre, score, year, tag, limit: 20, revalidate: 60 }),
    fetchReviews({ page: 1, limit: 8, sort: 'popular', revalidate: 60 }),
    fetchReviewFacets(300),
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
        <ContentTypeHeading title="REVIEWS" />
        <div className="mb-4 md:mb-8 flex flex-wrap items-center justify-between gap-4">
          <CategorySearch contentType="REVIEW" placeholder="Search game reviews..." />
        </div>



      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] xl:grid-cols-[900px_1fr] gap-8 items-start min-h-screen">

        {/* -- Main review list ----------------------------------- */}
        <div className="lg:border-r-2 lg:border-border lg:pr-8">
          <ReviewActiveFilters totalResults={mainRes.pagination?.total || 0} />
          
          {articles.length === 0 ? (
            <div className="text-center py-20 text-text-muted">No reviews yet. Check back soon!</div>
          ) : (
            articles.map((a, i) => (
              <div key={a.id}>
                <SharedListCard article={a} priority={i === 0} />
                {/* TODO: In-feed ad every 5 posts — add <AdSlot slot="ADS-01"> here once monetized */}
              </div>
            ))
          )}
          {mainRes.pagination && (
            <Pagination
              currentPage={page}
              totalPages={mainRes.pagination.totalPages}
              basePath="/reviews"
              className="mt-4"
            />
          )}


        </div>

        {/* -- Sidebar — reordered to the top on mobile (below the search bar), back to the right column at lg+ -- */}
        <aside className="order-first lg:order-none flex flex-col gap-4 pb-0 md:pb-8 md:gap-6 md:w-full self-stretch">
          <ReviewFilters facets={facetsRes?.data} />
          {/* Popular Reviews panel */}
          <div className="w-full flex flex-col gap-4 mt-6 md:mt-8">
            {/* "POPULAR" header with accent lines */}
            <div className="flex items-center gap-3 mb-1">
              <div className="flex-1 h-px bg-border" />
              <span
                className="text-xs font-extrabold tracking-widest uppercase px-2 py-0.5 rounded text-white dark:text-black"
                style={{ background: 'var(--accent)' }}
              >
                Popular
              </span>
              <div className="flex-1 h-px bg-border" />
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
