import { fetchPosts, fetchGuideFacets } from '@/lib/api';
import Pagination from '@/components/ui/Pagination';
import AdSlot from '@/components/monetization/AdSlot';
import { buildMeta } from '@/lib/seo';
import SharedListCard from '@/components/blog/SharedListCard';
import HomeListCard from '@/components/blog/HomeListCard';
import TrendingSidebarBox from '@/components/ui/TrendingSidebarBox';
import CategorySearch from '@/components/search/CategorySearch';
import ContentTypeHeading from '@/components/ui/ContentTypeHeading';
import GuideFilters from '@/components/search/GuideFilters';
import GuideActiveFilters from '@/components/search/GuideActiveFilters';
import GuidesListClient from '@/components/guides/GuidesListClient';
import type { Article } from '@/types';

const adsEnabled = !!process.env.NEXT_PUBLIC_ADSENSE_ID;

export const dynamic = 'force-dynamic';
export const metadata = buildMeta({
  title: 'Guides',
  description: 'In-depth gaming guides, walkthroughs, and mod guides from theCoreGamer',
  url: '/guides',
});

interface Props { searchParams: Promise<Record<string, string | undefined>> }

export default async function GuidesPage({ searchParams }: Props) {
  const params   = await searchParams;
  const page     = Number(params.page) || 1;
  const sort     = params.sort;
  const type     = params.type;          // legacy ?type= still works
  const guideType  = params.type;
  const platform   = params.platform;
  const genre      = params.genre;
  const gameSlug   = params.game;
  const tag        = params.tag;
  const search     = params.q;

  const fetchParams: any = {
    page,
    sort,
    limit: 20,
    contentType: 'GUIDE',
    revalidate: 60,
  };
  if (guideType) fetchParams.guideType = guideType;
  if (platform)  fetchParams.platform  = platform;
  if (genre)     fetchParams.genre     = genre;
  if (gameSlug)  fetchParams.gameSlug  = gameSlug;
  if (tag)       fetchParams.tag       = tag;
  if (search)    fetchParams.search    = search;

  const [mainRes, popularRes, facetsRes] = await Promise.all([
    fetchPosts(fetchParams),
    fetchPosts({ page: 1, limit: 8, sort: 'popular', contentType: 'GUIDE', revalidate: 60 }),
    fetchGuideFacets(300),
  ]);

  const articles        = mainRes.data        || [];
  const popularArticles = popularRes.data     || [];

  // Build a stable base path for pagination that preserves all active filters
  const paginationParams = new URLSearchParams();
  if (sort)      paginationParams.set('sort',     sort);
  if (guideType) paginationParams.set('type',     guideType);
  if (platform)  paginationParams.set('platform', platform);
  if (genre)     paginationParams.set('genre',    genre);
  if (gameSlug)  paginationParams.set('game',     gameSlug);
  if (tag)       paginationParams.set('tag',      tag);
  if (search)    paginationParams.set('q',        search);
  const paginationBase = `/guides${paginationParams.toString() ? `?${paginationParams}` : ''}`;

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
        <ContentTypeHeading title={type ? `${type}s` : 'GUIDES'} />
        <div className="mb-4 md:mb-8 flex flex-wrap items-center justify-between gap-4">
          <CategorySearch contentType="GUIDE" placeholder="Search guides..." />
        </div>

        <GuidesListClient
          initialGuides={articles}
          totalPages={mainRes.pagination?.totalPages || 1}
          sidebarChildren={
            <>
              {/* Popular guides */}
              <TrendingSidebarBox title="Popular Guides" articles={popularArticles} showBadge={true} />

              {/* Sticky bottom ad */}
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
