'use client';

import { useState, useRef } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { ThumbsUp, ChevronDown } from 'lucide-react';
import ReviewForm from './ReviewForm';
import PlatformIcon from './PlatformIcon';
import { fetchGameRatings, voteGameRating, deleteGameRating } from '@/lib/api';
import { formatDate, getScoreColor, getScoreLabel } from '@/lib/utils';
import type { GameHubData, UserRating } from '@/types';
import styles from './gamehub.module.css';

type SortMode = 'helpful' | 'recent' | 'highest' | 'lowest';

const REVIEW_TRUNCATE_LENGTH = 280;

const SORT_TABS: Array<{ id: SortMode; label: string }> = [
  { id: 'helpful', label: 'Most Helpful' },
  { id: 'recent', label: 'Most Recent' },
  { id: 'highest', label: 'Highest' },
  { id: 'lowest', label: 'Lowest' },
];

import { Trash2, Loader2, Pencil } from 'lucide-react';

function RatingCard({ 
  rating, 
  slug, 
  canVote, 
  isOwn,
  onEdit,
  onDelete
}: { 
  rating: UserRating;
  slug: string;
  canVote: boolean;
  isOwn?: boolean;
  onEdit?: () => void;
  onDelete?: (deletedId: string) => void;
}) {
  const [helpful, setHelpful] = useState(rating.helpfulCount);
  const [myVote, setMyVote] = useState<number | null>(rating.myVote ?? null);
  const [deleting, setDeleting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const voteRequestId = useRef(0);
  const isLong = (rating.body?.length ?? 0) > REVIEW_TRUNCATE_LENGTH;

  const handleVote = async () => {
    if (!canVote || isOwn) return;

    // Apply the toggle instantly so rapid clicks feel responsive — the
    // request-id ref below discards any stale response if the user
    // toggles again before this one comes back.
    const prevHelpful = helpful;
    const prevMyVote = myVote;
    const wasHelpful = myVote === 1;
    setMyVote(wasHelpful ? null : 1);
    setHelpful(wasHelpful ? prevHelpful - 1 : prevHelpful + 1);

    const requestId = ++voteRequestId.current;
    const res = await voteGameRating(slug, rating.id, 1);
    if (requestId !== voteRequestId.current) return;

    if (res.success && res.data) {
      setHelpful(res.data.helpfulCount);
      setMyVote(res.data.myVote);
    } else {
      setHelpful(prevHelpful);
      setMyVote(prevMyVote);
    }
  };

  const handleDelete = async () => {
    if (!isOwn || !onDelete || deleting) return;
    setDeleting(true);
    const res = await deleteGameRating(slug);
    setDeleting(false);
    if (res.success) {
      onDelete(rating.id);
    }
  };

  return (
    <div className={styles.ratingCard}>
      <div className="flex items-center gap-3 mb-2">
        <div className="relative w-9 h-9 shrink-0 overflow-hidden" style={{ background: 'var(--bg4)', borderRadius: '50%' }}>
          {rating.user.avatarUrl ? (
            <Image src={rating.user.avatarUrl} alt={`${rating.user.displayName} profile photo`} fill unoptimized className="object-cover" sizes="36px" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm font-bold" style={{ color: 'var(--muted2)' }}>
              {rating.user.displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="text-sm font-bold truncate" style={{ color: 'var(--text)' }}>
              {rating.user.username}
            </div>
            {isOwn && (
              <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded tracking-wider" style={{ background: 'var(--accent)', color: '#fff' }}>
                Your review
              </span>
            )}
          </div>
          <div className="text-xs" style={{ color: 'var(--muted2)' }}>{formatDate(rating.createdAt)}</div>
        </div>
        <div className="flex items-center gap-2">
          {isOwn && (
            <div className="flex gap-1 items-center mr-2">
              {onEdit && (
                <button onClick={onEdit} className="p-1 hover:text-[var(--accent)] transition-colors" title="Edit your review">
                  <Pencil className="w-3.5 h-3.5" style={{ color: 'var(--muted2)' }} />
                </button>
              )}
              {onDelete && (
                <button onClick={handleDelete} disabled={deleting} className="p-1 hover:text-red-400 transition-colors" title="Delete your review">
                  {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" style={{ color: 'var(--muted2)' }} />}
                </button>
              )}
            </div>
          )}
          <span className={styles.reviewScoreBadge} style={{ background: getScoreColor(rating.score) }}>{rating.score}</span>
        </div>
      </div>

      {rating.body && (
        <>
          <p
            className={`leading-relaxed ${isLong ? 'mb-1' : !isOwn ? 'mb-3' : ''} ${isLong && !isExpanded ? 'line-clamp-3' : ''}`}
            style={{ color: 'var(--muted)', fontSize: 14, fontFamily: '"Gibson", sans-serif' }}
          >
            {rating.body}
          </p>
          {isLong && (
            <button
              type="button"
              onClick={() => setIsExpanded((v) => !v)}
              className="mb-3 text-xs font-bold hover:underline"
              style={{ color: 'var(--muted2)' }}
            >
              {isExpanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </>
      )}

      {!isOwn && (
        <button
          type="button"
          onClick={handleVote}
          disabled={!canVote}
          className="flex items-center gap-1.5 text-xs font-semibold disabled:opacity-50"
          style={{ color: myVote === 1 ? 'var(--green)' : 'var(--muted2)' }}
          title={canVote ? 'Mark as helpful' : 'Sign in to vote'}
        >
          <ThumbsUp size={13} />
          Helpful{helpful > 0 ? ` (${helpful})` : ''}
        </button>
      )}
    </div>
  );
}

export default function ReviewsTab({ game, slug }: { game: GameHubData; slug: string }) {
  const { data: session } = useSession();
  const viewerId = session?.user?.id;

  const [sort, setSort] = useState<SortMode>('helpful');
  const [page, setPage] = useState(1);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const { data: ratingsRes, isLoading, mutate } = useSWR(
    `game-ratings-${slug}-${sort}-${page}`,
    () => fetchGameRatings(slug, page, sort)
  );

  const ratings = ratingsRes?.data?.ratings ?? [];
  const pagination = ratingsRes?.pagination;

  const review = game.GameReview?.find((r) => r.Article?.status === 'PUBLISHED') ?? game.GameReview?.[0] ?? null;
  const platformScores = review?.ReviewScorePlatforms ?? [];
  const scoreHistory = review?.ScoreHistory ?? [];
  const reviewPlatforms = review?.platformsTested?.length ? review.platformsTested : review?.platforms ?? [];
  const reviewScore = review ? Number(review.reviewScore) : 0;

  return (
    <div>
      {/* -- Editorial review ------------------------------------------- */}
      {review ? (
        <div className={styles.contentCard}>
          <div className="section-title-bar">{review.Article?.title ?? 'TheCoreGamer Review'}</div>

          <div className={styles.reviewHero}>
            <div className={styles.reviewHeroMeta}>
              <div className={styles.hexBadge} style={{ background: getScoreColor(reviewScore) }}>
                <span className={styles.hexBadgeScore}>{reviewScore.toFixed(1)}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className={styles.reviewVerdictLabel}>{getScoreLabel(reviewScore)}</div>
                {reviewPlatforms.length > 0 && (
                  <div className={styles.reviewPlatformRow}>
                    {reviewPlatforms.map((p) => (
                      <span key={p} className={styles.reviewPlatformIcon} title={p}>
                        <PlatformIcon platform={p} />
                      </span>
                    ))}
                  </div>
                )}
                {review.Article && (
                  <Link href={`/reviews/${review.Article.slug}`} className={styles.reviewReadBtn}>
                    Read Review
                  </Link>
                )}
              </div>
            </div>

            {review.Article?.featuredImageUrl && (
              <div className={styles.reviewHeroImage}>
                <Image
                  src={review.Article.featuredImageUrl}
                  alt={review.Article.title}
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="(min-width: 640px) 420px, 100vw"
                />
              </div>
            )}
          </div>

          {/* Platform score breakdown */}
          {platformScores.length > 0 && (
            <div className="mt-6">
              <div className={styles.detailLabel} style={{ marginBottom: 10 }}>Score by Platform</div>
              <div className={styles.platformScoreGrid}>
                {platformScores.map((p) => (
                  <div key={p.id} className={styles.platformScoreCard}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>{p.platform}</span>
                      <span className="text-base font-black" style={{ color: 'var(--accent)' }}>
                        {p.overall.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs" style={{ color: 'var(--muted2)' }}>
                      {p.gameplay != null && <span>Gameplay {p.gameplay.toFixed(1)}</span>}
                      {p.visuals != null && <span>Visuals {p.visuals.toFixed(1)}</span>}
                      {p.story != null && <span>Story {p.story.toFixed(1)}</span>}
                      {p.performance != null && <span>Performance {p.performance.toFixed(1)}</span>}
                      {p.value != null && <span>Value {p.value.toFixed(1)}</span>}
                    </div>
                    {p.notes && (
                      <p className="text-xs italic mt-2" style={{ color: 'var(--muted2)' }}>{p.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Score history accordion */}
          {scoreHistory.length > 0 && (
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setHistoryOpen((v) => !v)}
                className="flex items-center gap-2 text-sm font-bold"
                style={{ color: 'var(--muted)' }}
              >
                <ChevronDown
                  size={16}
                  style={{ transform: historyOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}
                />
                Score History ({scoreHistory.length})
              </button>
              {historyOpen && (
                <div className="mt-2">
                  {scoreHistory.map((h) => (
                    <div key={h.id} className={styles.historyRow}>
                      <span style={{ color: 'var(--muted2)', flexShrink: 0 }}>{formatDate(h.changedAt)}</span>
                      <span className="font-bold" style={{ color: 'var(--text)' }}>
                        {h.oldScore.toFixed(1)} → {h.newScore.toFixed(1)}
                      </span>
                      <span style={{ color: 'var(--muted2)' }}>{h.reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className={styles.contentCard}>
          <div className="section-title-bar">TheCoreGamer Review</div>
          <div className="flex items-center gap-5">
            <div className={`shimmer ${styles.shimmerHex}`} />
            <p style={{ color: 'var(--muted2)' }}>No review yet — check back soon.</p>
          </div>
        </div>
      )}

      {/* -- Community ratings ------------------------------------------ */}
      <div className="section-title-bar">Community Ratings</div>

      {viewerId && !isLoading && (!ratingsRes?.data?.aggregate?.userRating || isEditing) && (
        <ReviewForm 
          slug={slug} 
          existing={ratingsRes?.data?.aggregate?.userRating ?? null} 
          onSaved={(saved) => {
            // Update the cache with the rating the POST already returned
            // instead of waiting on a second round-trip refetch to learn
            // it — that revalidation lag was what made the form linger
            // on-screen after the "Review posted!" toast.
            mutate(
              (current) => {
                if (!current?.data) return current;
                const wasNew = !current.data.aggregate.userRating;
                return {
                  ...current,
                  data: {
                    ...current.data,
                    ratings: wasNew
                      ? [saved, ...current.data.ratings]
                      : current.data.ratings.map((r) => (r.userId === saved.userId ? saved : r)),
                    aggregate: { ...current.data.aggregate, userRating: saved },
                  },
                };
              },
              { revalidate: false }
            );
            setIsEditing(false);
            // Reconcile the average score/distribution/total in the background.
            mutate();
          }}
          onCancel={ratingsRes?.data?.aggregate?.userRating ? () => setIsEditing(false) : undefined}
        />
      )}
      {!viewerId && (
        <p className="text-sm mb-6 p-4 rounded-none border border-border" style={{ color: 'var(--muted)', background: 'var(--bg3)' }}>
          <a href="/auth/login" style={{ color: 'var(--accent)' }} className="underline hover:no-underline font-bold">Sign in</a> to leave a community review.
        </p>
      )}

      <div className={styles.sortTabs}>
        {SORT_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`${styles.sortTab} ${sort === t.id ? styles.sortTabActive : ''}`}
            onClick={() => { setSort(t.id); setPage(1); }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className={styles.ratingGrid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="shimmer" style={{ height: 120 }} />
          ))}
        </div>
      ) : ratings.length > 0 ? (
        <>
          <div className={styles.ratingGrid}>
            {ratings.map((r) => {
              if (isEditing && viewerId === r.userId) return null;
              return (
                <RatingCard 
                  key={r.id} 
                  rating={r} 
                  slug={slug} 
                  canVote={!!viewerId && viewerId !== r.userId}
                  isOwn={viewerId === r.userId}
                  onEdit={() => setIsEditing(true)}
                  onDelete={(deletedId) => {
                    mutate(
                      (current) => {
                        if (!current?.data) return current;
                        const stillOwnRating =
                          current.data.aggregate.userRating?.id === deletedId
                            ? null
                            : current.data.aggregate.userRating;
                        return {
                          ...current,
                          data: {
                            ...current.data,
                            ratings: current.data.ratings.filter((item) => item.id !== deletedId),
                            aggregate: { ...current.data.aggregate, userRating: stillOwnRating },
                          },
                        };
                      },
                      { revalidate: false }
                    );
                    // Reconcile the average score/distribution/total in the background.
                    mutate();
                  }}
                />
              );
            })}
          </div>
          {pagination && pagination.totalPages > 1 && (
            <div className={styles.loadMoreWrap} style={{ gap: 10 }}>
              <button
                type="button"
                className="btn-ghost"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span className="text-sm self-center" style={{ color: 'var(--muted2)' }}>
                Page {pagination.page} / {pagination.totalPages}
              </span>
              <button
                type="button"
                className="btn-ghost"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div className={styles.emptyState}>No community ratings yet. Be the first to rate this game!</div>
      )}
    </div>
  );
}
