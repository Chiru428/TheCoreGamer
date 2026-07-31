import { fetchReviews, fetchReviewFacets } from '@/lib/api';
import AdSlot from '@/components/monetization/AdSlot';

const adsEnabled = !!process.env.NEXT_PUBLIC_ADSENSE_ID;
import { buildMeta } from '@/lib/seo';
import HomeListCard from '@/components/blog/HomeListCard';
import CategorySearch from '@/components/search/CategorySearch';
import ContentTypeHeading from '@/components/ui/ContentTypeHeading';
import ReviewsListClient from '@/components/reviews/ReviewsListClient';

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



      <ReviewsListClient 
        initialReviews={articles} 
        totalPages={mainRes.pagination?.totalPages || 1}
        sidebarChildren={
          <>
            {/* Popular Reviews panel */}
            <div className="w-full flex flex-col gap-4 mt-0 md:mt-8">
              {/* "POPULAR" header with accent lines */}
              <div className="flex items-center gap-3 mb-1">
                <div className="flex-1 h-[2px] bg-border" />
                <span
                  className="text-xs font-extrabold tracking-widest uppercase px-2 py-0.5 rounded text-white"
                  style={{ background: 'var(--accent)' }}
                >
                  Popular Reviews
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
          </>
        }
      />
    </div>
    </>
  );
}
