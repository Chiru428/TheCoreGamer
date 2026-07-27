'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import { Loader2, ThumbsUp, X } from 'lucide-react';
import { FaXTwitter, FaLinkedin } from 'react-icons/fa6';
import Modal from './Modal';
import Badge from './Badge';
import { useProfileModalStore } from '@/store/profileModalStore';
import { fetchUserSummary, fetchUserPosts, fetchUserReviews, fetchAuthorArticles } from '@/lib/api';
import { CONTENT_TYPE_LABELS, CONTENT_TYPE_COLORS } from '@/lib/constants';
import { contentTypePath } from '@/lib/seo';
import { formatRelativeDate, getInitials, formatNumber, cn } from '@/lib/utils';
import type { ApiResponse, UserPostItem, UserReviewItem, AuthorArticleItem } from '@/types';

const PAGE_SIZE = 10;
const POST_TRUNCATE_LENGTH = 220;

const ROLE_BADGE_VARIANT: Record<string, 'danger' | 'purple' | 'info'> = {
  ADMIN: 'danger',
  EDITOR: 'purple',
  AUTHOR: 'info',
};

function scoreColor(score: number): string {
  if (score >= 80) return 'var(--green)';
  if (score >= 50) return 'var(--gold)';
  return '#ef4444';
}

interface PostListItemProps {
  post: UserPostItem;
  avatarUrl: string | null;
  displayName: string;
  onNavigate: () => void;
}

function PostListItem({ post, avatarUrl, displayName, onNavigate }: PostListItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLong = post.body.length > POST_TRUNCATE_LENGTH;

  return (
    <div className="pb-6 border-b border-border last:border-0">
      <div className="flex items-center gap-2.5 mb-3">
        {avatarUrl ? (
          <img src={avatarUrl} alt={displayName} className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs bg-accent text-white dark:text-black">
            {getInitials(displayName)}
          </div>
        )}
        <p className="text-[16px] text-text-dim">Posted {formatRelativeDate(post.createdAt)}</p>
      </div>
      {post.gifUrl && (
        <div className="mb-2">
          <Image
            src={post.gifUrl}
            alt="GIF"
            width={160}
            height={120}
            unoptimized
            className="rounded-lg object-cover border border-border"
            style={{ maxWidth: '160px', width: '100%', height: 'auto' }}
          />
        </div>
      )}
      {/* '[GIF]' is a legacy placeholder from before captions were supported — treat it as no caption. */}
      {(!post.gifUrl || (post.body.trim() && post.body.trim() !== '[GIF]')) && (
        <p className={cn('text-[15px] text-text-primary whitespace-pre-wrap', isLong && !isExpanded && 'line-clamp-3')}>
          {post.body}
        </p>
      )}
      {isLong && (
        <button
          type="button"
          onClick={() => setIsExpanded((v) => !v)}
          className="mt-1 text-[13px] font-bold text-text-dim hover:text-text-primary transition-colors"
        >
          {isExpanded ? 'See less' : 'Read more...'}
        </button>
      )}
      <Link
        href={`/${contentTypePath(post.articleContentType)}/${post.articleSlug}`}
        onClick={onNavigate}
        className="group mt-4 flex items-center gap-2.5 p-2 rounded-lg border border-border hover:bg-bg-elevated transition-colors"
      >
        {post.articleFeaturedImageUrl && (
          <div className="relative w-[70px] h-[39px] shrink-0 rounded overflow-hidden">
            <Image src={post.articleFeaturedImageUrl} alt="" fill className="object-cover" sizes="70px" />
          </div>
        )}
        <span className="text-[14px] font-semibold text-text-primary line-clamp-2 group-hover:underline">{post.articleTitle}</span>
      </Link>
    </div>
  );
}

interface ReviewListItemProps {
  review: UserReviewItem;
  avatarUrl: string | null;
  displayName: string;
  onNavigate: () => void;
}

function ReviewListItem({ review, avatarUrl, displayName, onNavigate }: ReviewListItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const body = review.body ?? '';
  const isLong = body.length > POST_TRUNCATE_LENGTH;

  return (
    <div className="pb-6 border-b border-border last:border-0 overflow-hidden">
      <Link
        href={`/games/${review.gameSlug}#reviews`}
        onClick={onNavigate}
        className="group block float-right ml-4 mb-2 w-28"
      >
        <div className="relative w-28 aspect-[2/3] rounded-lg overflow-hidden border border-border group-hover:border-accent transition-colors">
          {review.gameCoverImageUrl && (
            <Image src={review.gameCoverImageUrl} alt="" fill className="object-cover" sizes="112px" unoptimized />
          )}
        </div>
      </Link>

      <div className="flex items-center gap-2.5 mb-3">
        {avatarUrl ? (
          <img src={avatarUrl} alt={displayName} className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs bg-accent text-white dark:text-black">
            {getInitials(displayName)}
          </div>
        )}
        <p className="text-[16px] text-text-dim">Posted {formatRelativeDate(review.createdAt)}</p>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <Link
          href={`/games/${review.gameSlug}#reviews`}
          onClick={onNavigate}
          className="text-[16px] font-semibold text-text-primary underline hover:text-accent transition-colors"
        >
          {review.gameTitle}
        </Link>
        <span
          className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
          style={{ background: scoreColor(review.score) }}
        >
          {review.score}
        </span>
      </div>
      {body && (
        <>
          <p className={cn('text-[15px] text-text-primary whitespace-pre-wrap', isLong && !isExpanded && 'line-clamp-3')}>
            {body}
          </p>
          {isLong && (
            <button
              type="button"
              onClick={() => setIsExpanded((v) => !v)}
              className="mt-1 text-[13px] font-bold text-text-dim hover:text-text-primary transition-colors"
            >
              {isExpanded ? 'See less' : 'Read more...'}
            </button>
          )}
        </>
      )}
    </div>
  );
}

interface ArticleListItemProps {
  article: AuthorArticleItem;
  onNavigate: () => void;
}

function ArticleListItem({ article, onNavigate }: ArticleListItemProps) {
  const tc = CONTENT_TYPE_COLORS[article.contentType] || { bg: 'var(--accent)', color: '#fff' };

  return (
    <Link
      href={`/${contentTypePath(article.contentType)}/${article.slug}`}
      onClick={onNavigate}
      className="group flex items-center gap-3 pb-6 border-b border-border last:border-0 hover:opacity-90 transition-opacity"
    >
      {article.featuredImageUrl ? (
        <div className="relative w-44 aspect-video shrink-0 overflow-hidden border border-border">
          <Image src={article.featuredImageUrl} alt="" fill className="object-cover" sizes="176px" />
        </div>
      ) : null}
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-text-primary line-clamp-2 mb-1 group-hover:underline">{article.title}</p>
        {article.excerpt && <p className="text-[13px] text-text-dim line-clamp-2 mb-1">{article.excerpt}</p>}
        <div className="flex items-center gap-2 text-[12px] text-text-dim">
          <span
            className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: tc.textColor || tc.bg }}
          >
            {CONTENT_TYPE_LABELS[article.contentType] || article.contentType}
          </span>
          <span>·</span>
          <span>{formatRelativeDate(article.publishedAt || article.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}

export default function UserProfileModal() {
  const username = useProfileModalStore((s) => s.username);
  const isAuthorHint = useProfileModalStore((s) => s.isAuthorHint);
  const closeProfile = useProfileModalStore((s) => s.closeProfile);
  const router = useRouter();

  const { data: summaryRes, error: summaryError } = useSWR(
    username ? `user-summary:${username}` : null,
    () => fetchUserSummary(username!)
  );

  const profile = summaryRes?.data;
  const isStaff = profile?.isStaff ?? isAuthorHint;
  
  const isReady = summaryRes !== undefined || summaryError !== undefined || isAuthorHint;
  const isOpen = username !== null && isReady && !isStaff && profile?.profileVisibility !== 'PRIVATE';

  const [activeTab, setActiveTab] = useState<'comments' | 'reviews' | 'articles'>(isAuthorHint ? 'articles' : 'comments');

  // Staff authors/editors/admins get their own dedicated page — close the modal
  // and navigate there the moment we confirm they are staff.
  useEffect(() => {
    if (profile?.isStaff && username) {
      closeProfile();
      router.push(`/authors/${username}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.username, profile?.isStaff]);

  // Also redirect immediately if the caller already knows this is an author
  // (isAuthorHint=true), before the summary even loads.
  useEffect(() => {
    if (isAuthorHint && username) {
      closeProfile();
      router.push(`/authors/${username}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, isAuthorHint]);

  // Private (non-staff) profiles only ever surface the hover card — close the
  // modal the moment we learn this one is private rather than showing it.
  useEffect(() => {
    if (profile && profile.profileVisibility === 'PRIVATE' && !profile.isStaff) {
      closeProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.username, profile?.profileVisibility]);

  const {
    data: articlesData,
    size: articlesSize,
    setSize: setArticlesSize,
    isValidating: isValidatingArticles,
  } = useSWRInfinite<ApiResponse<AuthorArticleItem[]>>(
    (pageIndex) => (username && activeTab === 'articles' ? `profile-articles-${username}-${pageIndex + 1}` : null),
    (key: string) => {
      const page = Number(key.split('-').pop());
      return fetchAuthorArticles(username!, page, PAGE_SIZE);
    },
    { revalidateFirstPage: false }
  );

  const {
    data: postsData,
    size: postsSize,
    setSize: setPostsSize,
    isValidating: isValidatingPosts,
  } = useSWRInfinite<ApiResponse<UserPostItem[]>>(
    (pageIndex) => (username && activeTab === 'comments' ? `profile-posts-${username}-${pageIndex + 1}` : null),
    (key: string) => {
      const page = Number(key.split('-').pop());
      return fetchUserPosts(username!, page, PAGE_SIZE);
    },
    { revalidateFirstPage: false }
  );

  const {
    data: reviewsData,
    size: reviewsSize,
    setSize: setReviewsSize,
    isValidating: isValidatingReviews,
  } = useSWRInfinite<ApiResponse<UserReviewItem[]>>(
    (pageIndex) => (username && activeTab === 'reviews' ? `profile-reviews-${username}-${pageIndex + 1}` : null),
    (key: string) => {
      const page = Number(key.split('-').pop());
      return fetchUserReviews(username!, page, PAGE_SIZE);
    },
    { revalidateFirstPage: false }
  );

  // Switching to a different user's modal shouldn't keep whatever page depth
  // (or tab) was left scrolled/selected for the previous one. Deliberately
  // depends on just `username` — including the SWR setSize setters here would
  // re-run this on every render if they're not referentially stable, snapping
  // activeTab back to 'comments' on every click before it's ever seen.
  useEffect(() => {
    if (username) {
      setPostsSize(1);
      setReviewsSize(1);
      setArticlesSize(1);
      setActiveTab(isAuthorHint ? 'articles' : 'comments');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  // Once the summary loads and reveals a staff author, default to their
  // "Articles" tab — keyed on username (not the profile object) so this only
  // fires once per opened profile and doesn't clobber a manual tab switch.
  useEffect(() => {
    if (profile?.isStaff) setActiveTab('articles');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.username]);

  const articles = articlesData ? articlesData.flatMap((res) => res.data ?? []) : [];
  const lastArticlesPage = articlesData?.[articlesData.length - 1];
  const hasMoreArticles = lastArticlesPage?.pagination ? lastArticlesPage.pagination.page < lastArticlesPage.pagination.totalPages : false;
  const isLoadingArticles = !articlesData && !!username && activeTab === 'articles';

  const posts = postsData ? postsData.flatMap((res) => res.data ?? []) : [];
  const lastPostsPage = postsData?.[postsData.length - 1];
  const hasMorePosts = lastPostsPage?.pagination ? lastPostsPage.pagination.page < lastPostsPage.pagination.totalPages : false;
  const isLoadingPosts = !postsData && !!username && activeTab === 'comments';

  const reviews = reviewsData ? reviewsData.flatMap((res) => res.data ?? []) : [];
  const lastReviewsPage = reviewsData?.[reviewsData.length - 1];
  const hasMoreReviews = lastReviewsPage?.pagination ? lastReviewsPage.pagination.page < lastReviewsPage.pagination.totalPages : false;
  const isLoadingReviews = !reviewsData && !!username && activeTab === 'reviews';

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeProfile}
      size="3xl"
      className="fixed inset-0 max-h-screen rounded-none sm:relative sm:inset-auto sm:max-h-[90vh] sm:rounded-xl sm:max-w-[1200px] sm:h-[1000px]"
      bodyClassName="no-scrollbar p-4 pt-14 sm:p-8 sm:pt-16 flex-1 flex flex-col overflow-y-auto overscroll-contain sm:overflow-y-hidden"
    >
      <button
        type="button"
        onClick={closeProfile}
        aria-label="Close"
        className="absolute top-4 right-4 z-10 p-1 rounded-lg hover:bg-bg-elevated transition-colors"
      >
        <X className="w-5 h-5 text-text-muted" />
      </button>
      <div className="grid grid-cols-1 content-start sm:grid-cols-[600px_310px] sm:grid-rows-[1fr] sm:justify-between gap-8 sm:gap-[70px] sm:ml-[80px] sm:flex-1 sm:min-h-0 sm:overflow-hidden">
        <div className="order-2 sm:order-1 flex flex-col sm:min-h-0 sm:overflow-hidden">
          <div className="flex items-center gap-5 mb-6 border-b border-border shrink-0">
            {isStaff && (
              <button
                type="button"
                onClick={() => setActiveTab('articles')}
                className={cn(
                  'px-1 pb-3 text-sm font-bold border-b-2 -mb-px transition-colors',
                  activeTab === 'articles' ? 'text-accent border-accent' : 'text-text-dim border-transparent hover:text-text-primary'
                )}
              >
                Articles by {profile?.displayName} {profile ? `(${profile.articlesCount})` : ''}
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab('comments')}
              className={cn(
                'px-1 pb-3 text-sm font-bold border-b-2 -mb-px transition-colors',
                activeTab === 'comments' ? 'text-accent border-accent' : 'text-text-dim border-transparent hover:text-text-primary'
              )}
            >
              Comments {profile ? `(${profile.commentsCount})` : ''}
            </button>
            {!isStaff && (
              <button
                type="button"
                onClick={() => setActiveTab('reviews')}
                className={cn(
                  'px-1 pb-3 text-sm font-bold border-b-2 -mb-px transition-colors',
                  activeTab === 'reviews' ? 'text-accent border-accent' : 'text-text-dim border-transparent hover:text-text-primary'
                )}
              >
                Reviews {profile ? `(${profile.reviewsCount})` : ''}
              </button>
            )}
          </div>

          <div className="no-scrollbar sm:flex-1 sm:min-h-0 overflow-y-visible sm:overflow-y-auto overscroll-contain mr-[-16px] pr-4 sm:mr-0 sm:pr-0">
            {activeTab === 'articles' ? (
              isLoadingArticles ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-text-dim" />
                </div>
              ) : articles.length === 0 ? (
                <p className="text-sm text-text-dim py-8 text-center">No published articles yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {articles.map((article) => (
                    <ArticleListItem key={article.id} article={article} onNavigate={closeProfile} />
                  ))}

                  {hasMoreArticles && (
                    <button
                      type="button"
                      onClick={() => setArticlesSize(articlesSize + 1)}
                      disabled={isValidatingArticles}
                      className="self-center text-sm font-bold text-accent hover:underline disabled:opacity-50"
                    >
                      {isValidatingArticles ? 'Loading…' : 'Load more'}
                    </button>
                  )}
                </div>
              )
            ) : activeTab === 'comments' ? (
              isLoadingPosts ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-text-dim" />
                </div>
              ) : posts.length === 0 ? (
                <p className="text-sm text-text-dim py-8 text-center">No comments yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {posts.map((post) => (
                    <PostListItem
                      key={post.id}
                      post={post}
                      avatarUrl={profile?.avatarUrl ?? null}
                      displayName={profile?.displayName ?? ''}
                      onNavigate={closeProfile}
                    />
                  ))}

                  {hasMorePosts && (
                    <button
                      type="button"
                      onClick={() => setPostsSize(postsSize + 1)}
                      disabled={isValidatingPosts}
                      className="self-center text-sm font-bold text-accent hover:underline disabled:opacity-50"
                    >
                      {isValidatingPosts ? 'Loading…' : 'Load more'}
                    </button>
                  )}
                </div>
              )
            ) : isLoadingReviews ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-text-dim" />
              </div>
            ) : reviews.length === 0 ? (
              <p className="text-sm text-text-dim py-8 text-center">No reviews yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {reviews.map((review) => (
                  <ReviewListItem
                    key={review.id}
                    review={review}
                    avatarUrl={profile?.avatarUrl ?? null}
                    displayName={profile?.displayName ?? ''}
                    onNavigate={closeProfile}
                  />
                ))}

                {hasMoreReviews && (
                  <button
                    type="button"
                    onClick={() => setReviewsSize(reviewsSize + 1)}
                    disabled={isValidatingReviews}
                    className="self-center text-sm font-bold text-accent hover:underline disabled:opacity-50"
                  >
                    {isValidatingReviews ? 'Loading…' : 'Load more'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="order-1 sm:order-2 flex flex-col items-center text-center sm:items-start sm:text-left gap-2">
          {profile?.avatarUrl ? (
            <img src={profile.avatarUrl} alt={profile.username} className="w-[100px] h-[100px] rounded-full object-cover" />
          ) : profile ? (
            <div className="w-[100px] h-[100px] rounded-full flex items-center justify-center font-bold text-xl bg-accent text-white dark:text-black">
              {getInitials(profile.displayName || profile.username)}
            </div>
          ) : (
            <>
              <div className="w-[100px] h-[100px] rounded-full bg-bg-elevated animate-pulse" />
              <div className="h-[18px] w-32 rounded bg-bg-elevated animate-pulse mt-1" />
              <div className="h-[14px] w-24 rounded bg-bg-elevated animate-pulse" />
              <div className="h-[14px] w-full max-w-[260px] rounded bg-bg-elevated animate-pulse mt-2" />
              <div className="h-[14px] w-[80%] max-w-[200px] rounded bg-bg-elevated animate-pulse" />
            </>
          )}
          {profile && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-[18px] font-bold text-text-primary">{profile.displayName}</span>
                {ROLE_BADGE_VARIANT[profile.role] && (
                  <Badge variant={ROLE_BADGE_VARIANT[profile.role]}>{profile.role}</Badge>
                )}
              </div>
              <span className="text-text-dim text-sm">@{profile.username}</span>

              {profile.bio && (
                <p className="text-[14px] leading-relaxed text-text-primary whitespace-pre-wrap mt-2">{profile.bio}</p>
              )}

              {profile.expertise.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2 sm:justify-start justify-center">
                  {profile.expertise.map((tag) => (
                    <span key={tag} className="text-[11px] px-2 py-1 rounded-full border border-border text-text-dim">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {(profile.twitterHandle || profile.linkedinUrl) && (
                <div className="flex items-center gap-3 mt-2">
                  {profile.twitterHandle && (
                    <a
                      href={`https://twitter.com/${profile.twitterHandle.replace(/^@/, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`@${profile.twitterHandle.replace(/^@/, '')} on X`}
                      className="text-black dark:text-white hover:opacity-80 transition-opacity"
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
                      className="hover:opacity-80 transition-opacity"
                      style={{ color: '#0A66C2' }}
                    >
                      <FaLinkedin className="w-5 h-5" />
                    </a>
                  )}
                </div>
              )}

              <div className="flex items-center gap-1.5 mt-2 text-text-primary">
                <ThumbsUp className="w-4 h-4" />
                <span className="font-bold">{formatNumber(profile.likesCount)}</span>
                <span className="text-text-dim text-sm">Likes received</span>
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
