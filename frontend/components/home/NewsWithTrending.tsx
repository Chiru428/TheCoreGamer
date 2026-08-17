'use client';

import Link from 'next/link';
import Image from 'next/image';
import HomePostCard from '@/components/blog/HomePostCard';
import { formatDate, getGuideTypeColor } from '@/lib/utils';
import { contentTypePath } from '@/lib/seo';
import { CONTENT_TYPE_LABELS, CONTENT_TYPE_COLORS } from '@/lib/constants';
import AdSlot from '@/components/monetization/AdSlot';
import type { Article } from '@/types';

interface NewsWithTrendingProps {
  newsArticles: Article[];
  trendingArticles: Article[];
  sidebarTitle?: string;
  showBadge?: boolean;
  actionButton?: React.ReactNode;
}

export default function NewsWithTrending({ newsArticles, trendingArticles, sidebarTitle = "Trending News", showBadge = false, actionButton }: NewsWithTrendingProps) {
  if (!newsArticles || newsArticles.length === 0) return null;

  const heroArticle = newsArticles[0];
  const gridArticles = newsArticles.slice(1, 5);

  return (
    <>
      <div className="news-trending-wrapper">
        {/* ── Left: News feed ── */}
      <div className="news-main-col">
        {/* Large Hero Card */}
        {heroArticle && (
          <div className="mb-0 md:mb-2">
            <HomePostCard
              article={heroArticle}
              showBadge={showBadge}
              showImageBadge={false}
              showExcerptOnMobile={true}
              titleClassName="!text-[18px] md:!text-[26px] !font-[700]"
              showExcerpt={true}
              showBackground={false}
              truncateTitle={false}
              showViewArticle={false}
              metaClassName="flex-row items-center gap-1.5"
            />
          </div>
        )}

        {/* 2×2 grid of remaining posts */}
        {gridArticles.length > 0 && (
          <div className="news-grid">
            {gridArticles.map((article) => (
              <HomePostCard
                key={article.id}
                article={article}
                showBadge={showBadge}
                hideMetaBadgeOnMobile={true}
                titleClassName="!text-[16px] md:!text-[18px]"
                showExcerptOnMobile={false}
                showExcerpt={true}
                showBackground={false}
                truncateTitle={false}
                showViewArticle={false}
                metaClassName="flex-col items-start gap-0.5 sm:flex-row sm:items-center sm:gap-1.5"
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Right: Trending sidebar & Sticky Ad ── */}
      <div className="news-right-col">
        {trendingArticles.length > 0 && (
          <aside className="trending-sidebar">
            <div className="trending-header">
              <span className="section-title-bar !text-[24px] md:!text-[28px]">{sidebarTitle}</span>
            </div>
            <ul className="trending-list">
              {trendingArticles.slice(0, 6).map((article, i) => (
                <li key={article.id} className="trending-item">
                  <Link
                    href={`/${contentTypePath(article.contentType)}/${article.slug}`}
                    className="trending-link group"
                  >
                    <div className="trending-body">
                      <p className="post-card-title trending-title"><span className="hover-underline-animation">{article.title}</span></p>
                      {sidebarTitle === 'Popular Guides' ? (
                        <>
                          {/* Mobile: Single row */}
                          <div className="flex md:hidden flex-wrap items-center gap-3 mt-1">
                            {article.author?.displayName && (
                              <span className="text-[14px] font-bold text-[var(--brand-green)]">{article.author.displayName}</span>
                            )}
                            <span className="text-[14px] font-medium text-muted">{formatDate(article.publishedAt || article.createdAt)}</span>
                            {showBadge && (
                              article.contentType === 'GUIDE' && article.guideType ? (
                                <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: getGuideTypeColor(article.guideType) }}>
                                  {article.guideType}
                                </span>
                              ) : (
                                <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: (CONTENT_TYPE_COLORS[article.contentType] || { bg: 'var(--accent)' }).textColor || (CONTENT_TYPE_COLORS[article.contentType] || { bg: 'var(--accent)' }).bg }}>
                                  {CONTENT_TYPE_LABELS[article.contentType] || article.contentType}
                                </span>
                              )
                            )}
                          </div>

                          {/* Desktop: Split rows */}
                          <div className="hidden md:flex flex-col gap-1 mt-2">
                            {article.author?.displayName && (
                              <span className="text-[14px] font-bold text-[var(--brand-green)]">{article.author.displayName}</span>
                            )}
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="text-[14px] font-medium text-muted">{formatDate(article.publishedAt || article.createdAt)}</span>
                              {showBadge && (
                                article.contentType === 'GUIDE' && article.guideType ? (
                                  <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: getGuideTypeColor(article.guideType) }}>
                                    {article.guideType}
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: (CONTENT_TYPE_COLORS[article.contentType] || { bg: 'var(--accent)' }).textColor || (CONTENT_TYPE_COLORS[article.contentType] || { bg: 'var(--accent)' }).bg }}>
                                    {CONTENT_TYPE_LABELS[article.contentType] || article.contentType}
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="news-meta" style={{ marginTop: '4px' }}>
                          {article.author?.displayName && (
                            <span className="news-author" style={{ fontSize: '14px' }}>{article.author.displayName}</span>
                          )}
                          <span className="news-date" style={{ fontSize: '14px' }}>{formatDate(article.publishedAt || article.createdAt)}</span>
                          {showBadge && (
                            article.contentType === 'GUIDE' && article.guideType ? (
                              <span style={{ marginLeft: '6px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: getGuideTypeColor(article.guideType) }}>
                                {article.guideType}
                              </span>
                            ) : (
                              <span style={{ marginLeft: '6px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: (CONTENT_TYPE_COLORS[article.contentType] || { bg: 'var(--accent)' }).textColor || (CONTENT_TYPE_COLORS[article.contentType] || { bg: 'var(--accent)' }).bg }}>
                                {CONTENT_TYPE_LABELS[article.contentType] || article.contentType}
                              </span>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        )}

        {/* Mobile action button (hidden on desktop) */}
        {actionButton && (
          <div className="block lg:hidden mt-6 w-full">
            {actionButton}
          </div>
        )}
        

      </div>

      <style>{`
        /* ── Wrapper ── */
        .news-trending-wrapper {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        @media (min-width: 1024px) {
          .news-trending-wrapper {
            flex-direction: row;
            justify-content: space-between;
            gap: 28px;
          }
        }

        /* ── Left news column ── */
        .news-main-col {
          display: flex;
          flex-direction: column;
          gap: 28px;
          width: 100%;
          max-width: 900px;
          min-width: 0;
        }

        /* ── Hero card ── */
        .news-hero-card {
          display: block;
          text-decoration: none;
        }
        .news-hero-img {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          overflow: hidden;
          background: var(--deep, #0d0d1a);
        }
        .news-hero-body {
          padding-top: 16px;
          padding-bottom: 8px;
        }
        .news-type-badge {
          display: inline-block;
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }
        .news-hero-title {
          font-size: 18px !important;
          line-height: 1.25 !important;
          font-weight: 700 !important;
          color: var(--text-strong) !important;
          margin: 0 0 8px !important;
        }
        @media (min-width: 768px) {
          .news-hero-title {
            font-size: 26px !important;
          }
        }
        .news-hero-excerpt {
          font-size: 16px;
          color: var(--muted);
          line-height: 1.55;
          margin-bottom: 10px;
        }

        /* ── Shared meta row ── */
        .news-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .news-author {
          font-size: 13px;
          font-weight: 700;
          color: var(--brand-green);
        }
        .news-date {
          font-size: 13px;
          color: var(--muted);
          font-weight: 500;
        }

        /* ── 2×2 grid ── */
        .news-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        @media (min-width: 1024px) {
          .news-grid {
            gap: 20px;
          }
        }

        /* ── Right column ── */
        .news-right-col {
          width: 100%;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
        }
        @media (min-width: 1024px) {
          .news-right-col {
            width: 320px;
          }
        }
        
        .trending-sidebar {
          background: var(--bg2);
          padding: 20px 28px;
        }
        .trending-header {
          padding-bottom: 12px;
          border-bottom: 2px solid var(--accent, #00e5a0);
          margin-bottom: 0;
        }
        .trending-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
        }
        .trending-item {
          border-bottom: 1px solid var(--border);
        }
        .trending-item:last-child {
          border-bottom: none;
        }
        .trending-link {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 14px 0;
          text-decoration: none;
        }

        .trending-body {
          flex: 1;
          min-width: 0;
        }
        .trending-title {
          font-size: 16px !important;
          font-weight: 700 !important;
          line-height: 1.4 !important;
          color: var(--text-strong) !important;
          margin: 0 !important;
        }
      `}</style>
      </div>

      {/* Desktop action button (hidden on mobile) */}
      {actionButton && (
        <div className="hidden lg:block mt-8 w-full">
          {actionButton}
        </div>
      )}
    </>
  );
}
