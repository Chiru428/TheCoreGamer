'use client';

import Image from 'next/image';
import Link from 'next/link';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import { use, useState } from 'react';
import { ThumbsUp, Gamepad2 } from 'lucide-react';
import { FaXTwitter, FaLinkedin } from 'react-icons/fa6';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import { fetchUserSummary, fetchAuthorArticles } from '@/lib/api';
import { CONTENT_TYPE_LABELS, CONTENT_TYPE_COLORS } from '@/lib/constants';
import { contentTypePath } from '@/lib/seo';
import { formatRelativeDate, getInitials, formatNumber, getGuideTypeColor } from '@/lib/utils';
import type { ApiResponse, AuthorArticleItem } from '@/types';
import { notFound } from 'next/navigation';

const PAGE_SIZE = 20;

const ROLE_BADGE_VARIANT: Record<string, 'danger' | 'purple' | 'info'> = {
  ADMIN: 'danger',
  EDITOR: 'purple',
  AUTHOR: 'info',
};

function ArticleListItem({ article, authorName }: { article: AuthorArticleItem; authorName?: string }) {
  const tc = CONTENT_TYPE_COLORS[article.contentType] || { bg: 'var(--accent)', color: '#fff' };
  return (
    <Link
      href={`/${contentTypePath(article.contentType)}/${article.slug}`}
      className="group flex items-center sm:items-start gap-3 sm:gap-5 hover:opacity-90 transition-opacity"
    >
      {/* Image — 150px on mobile, 350px on sm/desktop, 16:9 */}
      <div className="relative shrink-0 overflow-hidden border border-border bg-bg-surface w-[150px] sm:w-[350px] aspect-video">
        {article.featuredImageUrl ? (
          <Image src={article.featuredImageUrl} alt="" fill className="object-cover" sizes="(max-width: 640px) 150px, 350px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Gamepad2 className="w-6 h-6 sm:w-8 sm:h-8 opacity-20" />
          </div>
        )}
      </div>

      {/* Right: meta → title → excerpt */}
      <div className="flex-1 min-w-0 py-0 sm:py-1">
        {/* Row 1: content type + date */}
        <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-3">
          {article.contentType === 'GUIDE' && article.guideType ? (
            <span
              className="shrink-0 text-[10px] sm:text-[12px] font-bold uppercase tracking-widest"
              style={{ color: getGuideTypeColor(article.guideType) }}
            >
              {article.guideType}
            </span>
          ) : (
            <span
              className="shrink-0 text-[10px] sm:text-[12px] font-bold uppercase tracking-widest"
              style={{ color: tc.textColor || tc.bg }}
            >
              {CONTENT_TYPE_LABELS[article.contentType] || article.contentType}
            </span>
          )}
          <span className="text-text-dim text-[11px] sm:text-[13px]">·</span>
          <span className="text-text-dim text-[11px] sm:text-[13px] font-medium truncate">{formatRelativeDate(article.publishedAt || article.createdAt)}</span>
        </div>

        {/* Title */}
        <p className="text-[16px] sm:text-[20px] font-bold text-text-primary line-clamp-3 sm:line-clamp-2 leading-snug mb-0 sm:mb-3">
          <span className="hover-underline-animation">{article.title}</span>
        </p>

        {/* Excerpt - Hidden on mobile */}
        {article.excerpt && (
          <p className="hidden sm:block text-[16px] text-text-dim line-clamp-3 leading-relaxed">
            {article.excerpt}
          </p>
        )}
      </div>
    </Link>
  );
}


export default function AuthorPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const { data: summaryRes, isLoading: summaryLoading } = useSWR(
    `user-summary:${username}`,
    () => fetchUserSummary(username)
  );
  const profile = summaryRes?.data;

  // Redirect non-staff (regular users) to 404
  if (!summaryLoading && profile && !profile.isStaff) {
    notFound();
  }

  const {
    data: articlesData,
    size: articlesSize,
    setSize: setArticlesSize,
    isValidating: isValidatingArticles,
  } = useSWRInfinite<ApiResponse<AuthorArticleItem[]>>(
    (pageIndex) => `author-articles-${username}-${selectedType || 'all'}-${pageIndex + 1}`,
    (key: string) => {
      const page = Number(key.split('-').pop());
      return fetchAuthorArticles(username, page, PAGE_SIZE, selectedType);
    },
    { revalidateFirstPage: false }
  );

  const articles = articlesData ? articlesData.flatMap(r => r.data ?? []) : [];
  const hasMoreArticles = articlesData?.[articlesData.length - 1]?.pagination
    ? (articlesData[articlesData.length - 1].pagination!.page < articlesData[articlesData.length - 1].pagination!.totalPages)
    : false;
  const isLoadingArticles = !articlesData;

  // Derive unique content types from the profile summary (which checks all published articles)
  // Fallback to loaded articles if the backend field isn't available yet
  const availableTypes = profile?.availableContentTypes?.length
    ? profile.availableContentTypes
    : Array.from(new Set(articles.map(a => a.contentType)));
    
  // Filter is now handled by the backend, so articles is exactly what we want to render
  const filteredArticles = articles;

  return (
    <div className="w-full max-w-[1280px] mx-auto px-4 lg:px-0 py-8">
      <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-start">
        {/* ── Sidebar: Author Card ── */}
        <aside className="w-full lg:w-[300px] shrink-0 lg:sticky lg:top-28">
          {summaryLoading || !profile ? (
            <div className="space-y-4">
              <Skeleton className="w-[120px] h-[120px] rounded-full" />
              <Skeleton className="h-7 w-48 rounded-lg" />
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="h-24 w-full rounded-lg" />
              <div className="flex gap-1.5 flex-wrap">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Avatar */}
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName}
                  className="w-[120px] h-[120px] rounded-full object-cover ring-4 ring-border"
                />
              ) : (
                <div className="w-[120px] h-[120px] rounded-full flex items-center justify-center font-bold text-3xl bg-accent text-white dark:text-black ring-4 ring-border">
                  {getInitials(profile.displayName || profile.username)}
                </div>
              )}

              {/* Name & Role */}
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="text-[26px] font-bold text-text-primary leading-tight">
                    {profile.displayName}
                  </h1>
                  {ROLE_BADGE_VARIANT[profile.role] && (
                    <Badge variant={ROLE_BADGE_VARIANT[profile.role]}>{profile.role}</Badge>
                  )}
                </div>
                <p className="text-text-dim text-sm">@{profile.username}</p>
              </div>

              {/* Bio */}
              {profile.bio && (
                <p className="text-[16px] leading-relaxed text-text-primary whitespace-pre-wrap">
                  {profile.bio}
                </p>
              )}

              {/* Expertise tags */}
              {profile.expertise.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {profile.expertise.map((tag) => (
                    <span key={tag} className="text-[13px] px-2.5 py-1 rounded-full border border-border text-text-dim">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Social links */}
              {(profile.twitterHandle || profile.linkedinUrl) && (
                <div className="flex items-center gap-3">
                  {profile.twitterHandle && (
                    <a
                      href={`https://twitter.com/${profile.twitterHandle.replace(/^@/, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`@${profile.twitterHandle.replace(/^@/, '')} on X`}
                      className="text-black dark:text-white hover:opacity-70 transition-opacity"
                    >
                      <FaXTwitter className="w-5 h-5" />
                    </a>
                  )}
                  {profile.linkedinUrl && (
                    <a
                      href={profile.linkedinUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="LinkedIn"
                      className="hover:opacity-70 transition-opacity"
                      style={{ color: '#0A66C2' }}
                    >
                      <FaLinkedin className="w-5 h-5" />
                    </a>
                  )}
                </div>
              )}

              {/* Likes */}
              <div className="flex items-center gap-1.5 text-text-primary">
                <ThumbsUp className="w-4 h-4" />
                <span className="font-bold">{formatNumber(profile.likesCount)}</span>
                <span className="text-text-dim text-sm">Likes received</span>
              </div>
            </div>
          )}
        </aside>

        {/* ── Main Content: Articles ── */}
        <div className="flex-1 min-w-0">
          {/* Section heading */}
          <div className="mb-8 pb-3 border-b border-border">
            <h2 className="text-[18px] font-bold text-text-primary">
              Published Work {profile ? `(${profile.articlesCount})` : ''}
            </h2>
          </div>

          {/* Filter pills */}
          {availableTypes.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-6">
              <button
                type="button"
                onClick={() => setSelectedType(null)}
                className={`px-3 py-1.5 rounded-full text-[13px] font-semibold border transition-colors bg-bg-elevated ${
                  selectedType === null
                    ? 'border-accent text-accent'
                    : 'border-border text-text-primary hover:border-accent hover:text-accent'
                }`}
              >
                All
              </button>
              {availableTypes.map(type => {
                const tc = CONTENT_TYPE_COLORS[type] || { bg: 'var(--accent)' };
                const isActive = selectedType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedType(isActive ? null : type)}
                    className={`px-3 py-1.5 rounded-full text-[13px] font-semibold border transition-colors bg-bg-elevated ${
                      isActive
                        ? 'border-[var(--hover-color)] text-[var(--hover-color)]'
                        : 'border-border text-text-primary hover:border-[var(--hover-color)] hover:text-[var(--hover-color)]'
                    }`}
                    style={{ '--hover-color': tc.textColor || tc.bg } as React.CSSProperties}
                  >
                    {CONTENT_TYPE_LABELS[type] || type}
                  </button>
                );
              })}
            </div>
          )}

          {isLoadingArticles ? (
            <div className="flex flex-col gap-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center sm:items-start gap-3 sm:gap-5 pb-6 border-b border-border">
                  <Skeleton className="shrink-0 rounded-md w-[150px] sm:w-[350px] aspect-video" />
                  <div className="flex-1 py-1 space-y-2">
                    <Skeleton className="h-2.5 sm:h-3 w-20 sm:w-36 rounded-md" />
                    <Skeleton className="h-4 sm:h-6 w-full rounded-md" />
                    <Skeleton className="h-4 sm:h-6 w-3/4 rounded-md" />
                    <Skeleton className="hidden sm:block h-12 w-full rounded-md mt-1" />
                  </div>
                </div>
              ))}
            </div>
          ) : articles.length === 0 ? (
            <p className="text-sm text-text-dim py-8 text-center">No published articles yet.</p>
          ) : (
            <div className="flex flex-col">
              {filteredArticles.map((a, i) => (
                <div key={a.id}>
                  <div className="py-8">
                    <ArticleListItem article={a} authorName={profile?.displayName || username} />
                  </div>
                  {i < filteredArticles.length - 1 && (
                    <div className="flex justify-center">
                      <div className="w-full h-px bg-border" />
                    </div>
                  )}
                </div>
              ))}
              {hasMoreArticles && (
                <button
                  type="button"
                  onClick={() => setArticlesSize(articlesSize + 1)}
                  disabled={isValidatingArticles}
                  className="mt-6 self-center px-6 py-2 rounded-full border border-border text-sm font-bold text-accent hover:bg-bg-elevated transition-colors disabled:opacity-50"
                >
                  {isValidatingArticles ? 'Loading…' : 'Load more'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
