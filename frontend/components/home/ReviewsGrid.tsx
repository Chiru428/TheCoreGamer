'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Gamepad2 } from 'lucide-react';
import type { Article } from '@/types';
import { contentTypePath } from '@/lib/seo';
import { formatDate } from '@/lib/utils';

interface ReviewsGridProps {
  articles: Article[];
}

export default function ReviewsGrid({ articles }: ReviewsGridProps) {
  if (!articles || articles.length === 0) return null;

  const heroArticle = articles[0];
  const stackedArticles = articles.slice(1, 3);
  const bottomArticles = articles.slice(3, 7);

  return (
    <div className="reviews-grid-wrapper">
      {/* Top Section */}
      <div className="reviews-top-section">
        {/* Large Hero Card */}
        {heroArticle && (
          <Link
            href={`/${contentTypePath(heroArticle.contentType)}/${heroArticle.slug}`}
            className="review-hero-card group"
          >
            <div className="review-image-container">
              {heroArticle.featuredImageUrl ? (
                <Image
                  src={heroArticle.featuredImageUrl}
                  alt={heroArticle.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 66vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#0d0d1a] opacity-30">
                  <Gamepad2 className="w-12 h-12 text-white" />
                </div>
              )}
              <div className="review-gradient-overlay" />
            </div>
            <div className="review-content hero-content">
              <div className="hidden sm:flex items-center gap-1.5 text-[13px] text-gray-300 font-medium mb-1.5">
                {heroArticle.author?.displayName && (
                  <span className="font-bold truncate max-w-[120px]" style={{ color: '#00e5a0' }}>{heroArticle.author.displayName}</span>
                )}
                <span className="shrink-0">{formatDate(heroArticle.publishedAt || heroArticle.createdAt)}</span>
              </div>
              <h3 className="rg-hero-title group-hover:underline">
                {heroArticle.title}
              </h3>
            </div>
          </Link>
        )}

        {/* Stacked Right Cards */}
        {stackedArticles.length > 0 && (
          <div className="reviews-stacked-col">
            {stackedArticles.map((article) => (
              <Link
                key={article.id}
                href={`/${contentTypePath(article.contentType)}/${article.slug}`}
                className="review-small-card group"
              >
                <div className="review-image-container">
                  {article.featuredImageUrl ? (
                    <Image
                      src={article.featuredImageUrl}
                      alt={article.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#0d0d1a] opacity-30">
                      <Gamepad2 className="w-8 h-8 text-white" />
                    </div>
                  )}
                  <div className="review-gradient-overlay" />
                </div>
                <div className="review-content">
                  <div className="hidden sm:flex items-center gap-1.5 text-[13px] text-gray-300 font-medium mb-1">
                    {article.author?.displayName && (
                      <span className="font-bold truncate max-w-[100px]" style={{ color: '#00e5a0' }}>{article.author.displayName}</span>
                    )}
                    <span className="shrink-0">{formatDate(article.publishedAt || article.createdAt)}</span>
                  </div>
                  <h3 className="rg-small-title group-hover:underline">
                    {article.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Section */}
      {bottomArticles.length > 0 && (
        <div className="reviews-bottom-section">
          {bottomArticles.map((article) => (
            <Link
              key={article.id}
              href={`/${contentTypePath(article.contentType)}/${article.slug}`}
              className="review-small-card group"
            >
              <div className="review-image-container">
                {article.featuredImageUrl ? (
                  <Image
                    src={article.featuredImageUrl}
                    alt={article.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#0d0d1a] opacity-30">
                    <Gamepad2 className="w-8 h-8 text-white" />
                  </div>
                )}
                <div className="review-gradient-overlay" />
              </div>
              <div className="review-content">
                <div className="hidden sm:flex items-center gap-1.5 text-[13px] text-gray-300 font-medium mb-1">
                  {article.author?.displayName && (
                    <span className="font-bold truncate max-w-[100px]" style={{ color: '#00e5a0' }}>{article.author.displayName}</span>
                  )}
                  <span className="shrink-0">{formatDate(article.publishedAt || article.createdAt)}</span>
                </div>
                <h3 className="rg-small-title group-hover:underline">
                  {article.title}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      )}

      <style>{`
        .reviews-grid-wrapper {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .reviews-top-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        @media (min-width: 768px) {
          .reviews-top-section {
            display: grid;
            grid-template-columns: 2fr 1fr;
          }
        }

        .reviews-stacked-col {
          display: flex;
          flex-direction: column;
          gap: 12px;
          height: 100%;
        }

        .reviews-bottom-section {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        @media (min-width: 768px) {
          .reviews-bottom-section {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        .review-hero-card {
          position: relative;
          display: block;
          width: 100%;
          overflow: hidden;
          aspect-ratio: 16/9;
        }

        @media (min-width: 768px) {
          .review-hero-card {
             /* Make it fill the grid row height properly instead of strictly 16/9 */
             height: 100%;
             aspect-ratio: auto;
          }
        }

        .review-small-card {
          position: relative;
          display: block;
          width: 100%;
          overflow: hidden;
          aspect-ratio: 16/9;
          flex: 1;
        }

        .review-image-container {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          background: #111;
        }

        .review-gradient-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.3) 50%, transparent 100%);
          z-index: 1;
          pointer-events: none;
        }

        .review-content {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 12px 16px;
          z-index: 2;
        }

        .hero-content {
          padding: 16px 24px;
        }

        h3.rg-hero-title, h3.rg-small-title {
          font-family: 'Gibson', sans-serif !important;
          font-weight: 700 !important;
          color: #fff !important;
          margin: 0 !important;
          line-height: 1.2 !important;
          text-shadow: 0 1px 3px rgba(0,0,0,0.5) !important;
          transition: color 0.2s !important;
          font-size: 18px !important;
        }

        .reviews-bottom-section h3.rg-small-title {
          font-size: 16px !important;
        }

        @media (min-width: 768px) {
          h3.rg-hero-title {
            font-size: 26px !important;
          }

          h3.rg-small-title, .reviews-bottom-section h3.rg-small-title {
            font-size: 20px !important;
          }
        }
      `}</style>
    </div>
  );
}
