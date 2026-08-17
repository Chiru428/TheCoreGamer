import { fetchPosts, fetchTags } from '@/lib/api';
import Pagination from '@/components/ui/Pagination';
import { buildMeta } from '@/lib/seo';
import type { Tag } from '@/types';
import SharedListCard from '@/components/blog/SharedListCard';
import HomePostCard from '@/components/blog/HomePostCard';
import ContentTypeHeading from '@/components/ui/ContentTypeHeading';
import AdSlot from '@/components/monetization/AdSlot';
import PopularTagsBox from '@/components/ui/PopularTagsBox';

const adsEnabled = !!process.env.NEXT_PUBLIC_ADSENSE_ID;

export const revalidate = 120;
interface Props { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> }

async function getTagsData(slug: string) {
  try {
    const res = await fetchTags(120);
    const allTags = res.data ?? [];
    const currentTag = allTags.find((t) => t.slug === slug) ?? null;
    const otherTags = allTags.filter((t) => t.slug !== slug).slice(0, 15);
    return { currentTag, otherTags };
  } catch {
    return { currentTag: null, otherTags: [] };
  }
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const { currentTag } = await getTagsData(slug);
  return buildMeta({
    title: `#${currentTag?.name ?? slug}`,
    description: currentTag?.description ?? `Articles tagged with ${slug}`,
    url: `/tags/${slug}`,
  });
}

export default async function TagPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = Number(sp.page) || 1;

  const [{ currentTag, otherTags }, mainRes] = await Promise.all([
    getTagsData(slug),
    fetchPosts({ tag: slug, page, limit: 20, revalidate: 120 }),
  ]);

  const articles = mainRes.data || [];

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
        <ContentTypeHeading 
          title={currentTag?.name ?? slug}
          description={currentTag?.description ?? `Articles tagged with "${currentTag?.name ?? slug}"`}
          preserveCase={true}
        />

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] xl:grid-cols-[900px_1fr] gap-6 md:gap-8 items-start min-h-screen">
          
          {/* -- Main list ----------------------------------- */}
          <div className="lg:border-r-2 lg:border-border lg:pr-8">
            {articles.length === 0 ? (
              <div className="text-center py-20 text-text-muted">No articles found for this tag.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-1 gap-4 sm:gap-0">
                {articles.map((a, i) => (
                  <div key={a.id}>
                    {/* Mobile View: 2-column grid card */}
                    <div className="block sm:hidden h-full">
                      <HomePostCard
                        article={a}
                        showBadge={true}
                        hideMetaBadgeOnMobile={true}
                        titleClassName="!text-[16px] leading-tight"
                        showExcerptOnMobile={false}
                        showExcerpt={false}
                        showBackground={false}
                        truncateTitle={false}
                        showViewArticle={false}
                        metaClassName="flex-col items-start gap-0.5"
                      />
                    </div>
                    {/* Desktop View: List card */}
                    <div className="hidden sm:block">
                      <SharedListCard article={a} priority={i === 0} isLast={i === articles.length - 1} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {mainRes.pagination && (
              <Pagination
                currentPage={page}
                totalPages={mainRes.pagination.totalPages}
                basePath={`/tags/${slug}`}
                className="mt-4"
              />
            )}
          </div>

          {/* -- Sidebar -- */}
          <aside className="hidden lg:flex flex-col gap-4 pb-0 md:pb-8 md:gap-6 md:w-full self-stretch">
            <PopularTagsBox tags={otherTags} />

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
