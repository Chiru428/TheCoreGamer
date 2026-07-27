import Link from 'next/link';
import Image from 'next/image';
import { contentTypePath } from '@/lib/seo';
import type { Article } from '@/types';
import { Gamepad2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function DealsSection({ 
  articles,
  sideArticles 
}: { 
  articles: Article[],
  sideArticles?: Article[]
}) {
  if (!articles || articles.length === 0) return null;

  const mainArticle = articles[0];
  const subArticles = articles.slice(1, 4);
  const sideArticlesList = sideArticles ? sideArticles.slice(0, 4) : articles.slice(4, 8);

  return (
    <div className="deals-section-wrap flex flex-col lg:flex-row w-full shadow-xl border border-black/5 dark:border-0 mb-6 bg-gradient-to-br from-[#162032]/90 to-[#0a0f1c]/80 dark:from-[#0a0f1c]/95 dark:to-[#05080f]/90 backdrop-blur-xl">
      {/* LEFT SIDEBAR */}
      <div className="deals-sidebar w-full lg:w-[280px] xl:w-[320px] shrink-0 p-5 lg:p-6 flex flex-col" style={{ background: 'linear-gradient(to bottom, #4facfe 0%, #00f2fe 100%)' }}>
        <h3 className="deals-sidebar-title text-white font-bold tracking-widest text-[16px] mb-5 uppercase" style={{ fontFamily: "'Rubik', sans-serif" }}>Hot Deals</h3>
        <div className="flex flex-col gap-4">
          {sideArticlesList.map((article) => (
            <Link key={article.id} href={`/${contentTypePath(article.contentType)}/${article.slug}`} className="group relative block w-full aspect-[16/9] overflow-hidden shadow-md deals-img-wrap border border-white/10">
              {article.featuredImageUrl ? (
                <Image src={article.featuredImageUrl} alt={article.title} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 320px" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><Gamepad2 className="w-8 h-8 opacity-50 text-white" /></div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-4 lg:p-5">
                <div className="flex items-center gap-1.5 text-[13px] text-gray-300 font-medium mb-1">
                  {article.author?.displayName && (
                    <span className="font-bold" style={{ color: '#00e5a0' }}>{article.author.displayName}</span>
                  )}
                  <span>{formatDate(article.publishedAt || article.createdAt)}</span>
                </div>
                <h4 className="text-white font-bold leading-snug !text-[16px] group-hover:underline line-clamp-3" style={{ fontFamily: "'Rubik', sans-serif" }}>
                  {article.title}
                </h4>
              </div>
            </Link>
          ))}
          {Array.from({ length: Math.max(0, 4 - sideArticlesList.length) }).map((_, i) => (
            <div key={`placeholder-${i}`} className="deals-placeholder relative block w-full aspect-[16/9] overflow-hidden shadow-md border border-white/10">
              <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                <Gamepad2 className="w-8 h-8 opacity-20 text-white" />
                <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest">More Deals Soon</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT MAIN AREA */}
      <div className="deals-main flex-1 p-5 lg:p-10 flex flex-col gap-8 min-w-0">
        {/* Top Hero */}
        {mainArticle && (
          <div className="flex flex-col-reverse lg:flex-row gap-6 lg:gap-10 items-center">
            <div className="flex-1 min-w-0 flex flex-col gap-4">
              <Link href={`/${contentTypePath(mainArticle.contentType)}/${mainArticle.slug}`} className="group block">
                <div className="flex items-center gap-1.5 text-[13px] text-gray-400 font-medium mb-2">
                  {mainArticle.author?.displayName && (
                    <span className="deals-author font-bold mr-1" style={{ color: '#00e5a0' }}>{mainArticle.author.displayName}</span>
                  )}
                  <span className="deals-date">{formatDate(mainArticle.publishedAt || mainArticle.createdAt)}</span>
                </div>
                <h2 className="deals-main-title text-white font-bold !text-[18px] lg:!text-[22px] leading-tight mb-4 group-hover:underline" style={{ fontFamily: "'Rubik', sans-serif" }}>
                  {mainArticle.title}
                </h2>
                {mainArticle.excerpt && (
                  <p className="deals-excerpt text-gray-300 mt-5 text-[16px] leading-relaxed line-clamp-3 lg:line-clamp-4">
                    {mainArticle.excerpt}
                  </p>
                )}
              </Link>
            </div>
            <Link href={`/${contentTypePath(mainArticle.contentType)}/${mainArticle.slug}`} className="group relative w-full lg:w-[60%] shrink-0 aspect-[16/9] overflow-hidden shadow-lg deals-img-wrap border border-white/5">
              {mainArticle.featuredImageUrl ? (
                <Image src={mainArticle.featuredImageUrl} alt={mainArticle.title} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 60vw" priority />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><Gamepad2 className="w-12 h-12 opacity-50 text-white" /></div>
              )}
            </Link>
          </div>
        )}

        {/* Bottom 3 Grid */}
        {subArticles.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-auto">
            {subArticles.map((article) => (
              <Link key={article.id} href={`/${contentTypePath(article.contentType)}/${article.slug}`} className="group flex flex-col gap-4">
                <div className="deals-img-wrap relative w-full aspect-[16/9] overflow-hidden border border-white/5 shadow-md">
                  {article.featuredImageUrl ? (
                    <Image src={article.featuredImageUrl} alt={article.title} fill className="object-cover" sizes="(max-width: 640px) 100vw, 33vw" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Gamepad2 className="w-8 h-8 opacity-50 text-white" /></div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-[13px] text-gray-400 font-medium mb-1.5">
                    {article.author?.displayName && (
                      <span className="deals-author font-bold mr-1" style={{ color: '#00e5a0' }}>{article.author.displayName}</span>
                    )}
                    <span className="deals-date">{formatDate(article.publishedAt || article.createdAt)}</span>
                  </div>
                  <h4 className="deals-sub-title text-white font-bold text-[16px] leading-snug group-hover:underline mb-2 line-clamp-2" style={{ fontFamily: "'Rubik', sans-serif" }}>
                    {article.title}
                  </h4>
                  {article.excerpt && (
                    <p className="deals-excerpt text-gray-400 text-[16px] leading-relaxed line-clamp-3">
                      {article.excerpt}
                    </p>
                  )}
                </div>
              </Link>
            ))}
            {Array.from({ length: Math.max(0, 3 - subArticles.length) }).map((_, i) => (
              <div key={`sub-placeholder-${i}`} className="group flex flex-col gap-4">
                <div className="deals-placeholder relative w-full aspect-[16/9] overflow-hidden border border-white/5 shadow-md flex flex-col items-center justify-center text-white/30">
                  <Gamepad2 className="w-10 h-10 mb-2 opacity-30" />
                  <span className="text-[12px] font-bold tracking-widest uppercase opacity-50">More Deals Soon</span>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="h-4 w-3/4 bg-white/10 rounded-sm"></div>
                  <div className="h-3 w-1/2 bg-white/5 rounded-sm mt-1"></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
