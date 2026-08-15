'use client';

import Link from 'next/link';
import { formatDate, getGuideTypeColor } from '@/lib/utils';
import { contentTypePath } from '@/lib/seo';
import { CONTENT_TYPE_LABELS, CONTENT_TYPE_COLORS } from '@/lib/constants';

interface TrendingSidebarBoxProps {
  title: string;
  articles: any[];
  showBadge?: boolean;
}

export default function TrendingSidebarBox({ title, articles, showBadge = false }: TrendingSidebarBoxProps) {
  if (!articles || articles.length === 0) return null;

  return (
    <div className="trending-sidebar hidden lg:block w-full">
      <div className="trending-box">
        <div className="trending-header">
          <span className="section-title-bar !text-[24px] md:!text-[28px]">{title}</span>
        </div>
        <ul className="trending-list flex flex-col m-0 p-0 list-none">
          {articles.slice(0, 8).map((article) => (
            <li key={article.id} className="trending-item border-b border-[var(--border)] last:border-b-0">
              <Link
                href={`/${contentTypePath(article.contentType)}/${article.slug}`}
                className="trending-link group flex items-start gap-[10px] py-[14px] no-underline"
              >
                <div className="trending-body flex-1 min-w-0">
                  <p className="post-card-title trending-title">
                    <span className="hover-underline-animation">{article.title}</span>
                  </p>
                  <div className="news-meta flex flex-wrap items-center gap-[6px]" style={{ marginTop: '4px' }}>
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
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <style jsx>{`
        .trending-sidebar {
          background: var(--bg2);
          padding: 20px 28px;
        }
        .trending-sidebar :global(.section-title-bar) {
          font-family: "Gibson", sans-serif !important;
          font-size: 28px !important;
          line-height: 1.2 !important;
          font-weight: 700 !important;
        }
        @media (min-width: 768px) {
          .trending-sidebar :global(.section-title-bar) {
            font-size: 32px !important;
          }
        }
        .trending-sidebar :global(.section-title-bar::before) {
          display: none !important;
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
        .trending-sidebar :global(.trending-title) {
          font-family: "Gibson", sans-serif !important;
          font-size: 16px !important;
          font-weight: 700 !important;
          line-height: 1.4 !important;
          color: var(--text-strong) !important;
          margin: 0 !important;
        }
        .news-meta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
          margin-top: 8px;
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
      `}</style>
    </div>
  );
}
