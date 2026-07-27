'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { mutate } from 'swr';
import { ThumbsUp, ThumbsDown, Flag, Pin, ChevronDown, ChevronUp, MoreVertical } from 'lucide-react';
import { cn, formatRelativeDate, getInitials } from '@/lib/utils';
import { voteComment, reportComment, unreportComment, pinComment, reactToComment } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import Badge from '@/components/ui/Badge';
import UserHoverCard from '@/components/ui/UserHoverCard';
import { renderCommentBody } from './renderCommentBody';
import { useProfileModalStore } from '@/store/profileModalStore';
import type { Comment, CommentReactionType } from '@/types';
import { Role } from '@/types';

const REACTION_EMOJIS: CommentReactionType[] = ['🔥', '😂', '😲', '👍', '❤️'];
const REPLIES_PER_PAGE = 3;
// Comments longer than this are collapsed behind a "See more" toggle.
const COMMENT_TRUNCATE_LENGTH = 400;

// Total nested descendants (not just direct children) — shown on the collapsed
// "View N replies" toggle so the count reflects the whole thread underneath it.
function countDescendants(replies: Comment[]): number {
  return replies.reduce((sum, r) => sum + 1 + countDescendants(r.replies ?? []), 0);
}

interface CommentItemProps {
  comment: Comment;
  onReply: (id: string, authorName: string) => void;
  depth: number;
  replyToId?: string | null;
  renderReplyForm?: (isInline: boolean) => React.ReactNode;
  cacheKey: string;
}

export default function CommentItem({ comment, onReply, depth, replyToId, renderReplyForm, cacheKey }: CommentItemProps) {
  const { isAuthenticated, user } = useAuthStore();
  const openProfile = useProfileModalStore((s) => s.openProfile);
  const netScore = comment.upvotes - comment.downvotes;
  const isHidden = netScore < -5;
  const [showHidden, setShowHidden] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [visibleCount, setVisibleCount] = useState(REPLIES_PER_PAGE);
  const voteRequestId = useRef(0);
  const [sessionVote, setSessionVote] = useState<1 | -1 | 0>(comment.userVote ?? 0);
  const [isReported, setIsReported] = useState(false);
  const [isPinned, setIsPinned] = useState(comment.isPinned);
  const [isPinning, setIsPinning] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Matches the "sm:" Tailwind breakpoint used on the avatar's own size classes,
  // so the JS-computed indent/spine math below stays in sync with the actual
  // rendered avatar size at every viewport width.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    if (!showMobileMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setShowMobileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMobileMenu]);

  const canPin = isAuthenticated && user &&
    [Role.EDITOR, Role.ADMIN].includes(user.role as Role);

  const handlePin = async () => {
    if (isPinning) return;
    setIsPinning(true);
    const wasPin = !isPinned;
    setIsPinned(wasPin);
    const res = await pinComment(comment.id);
    if (!res.success) {
      setIsPinned(!wasPin);
    }
    setIsPinning(false);
  };

  const handleVote = async (value: 1 | -1) => {
    if (!isAuthenticated) return;

    let newVote: 1 | -1 | 0 = value;
    if (sessionVote === value) {
      newVote = 0;
    }

    const upvoteDiff = (newVote === 1 ? 1 : 0) - (sessionVote === 1 ? 1 : 0);
    const downvoteDiff = (newVote === -1 ? 1 : 0) - (sessionVote === -1 ? 1 : 0);

    setSessionVote(newVote);

    mutate(
      cacheKey,
      (currentComments: Comment[] = []) => {
        const updateTree = (comments: Comment[]): Comment[] => {
          return comments.map((c) => {
            if (c.id === comment.id) {
              return {
                ...c,
                upvotes: Math.max(0, c.upvotes + upvoteDiff),
                downvotes: Math.max(0, c.downvotes + downvoteDiff),
              };
            }
            if (c.replies && c.replies.length > 0) {
              return { ...c, replies: updateTree(c.replies) };
            }
            return c;
          });
        };
        return updateTree(currentComments);
      },
      { revalidate: false }
    );

    // Toggling fast (like then unlike) fires another request before this one
    // resolves — track which call is the latest so an out-of-order response
    // can't clobber a newer optimistic state with stale counts.
    const requestId = ++voteRequestId.current;
    const res = await voteComment(comment.id, value);
    if (requestId !== voteRequestId.current) return;

    if (res.success && res.data) {
      mutate(
        cacheKey,
        (currentComments: Comment[] = []) => {
          const updateTree = (comments: Comment[]): Comment[] => {
            return comments.map((c) => {
              if (c.id === comment.id) {
                return {
                  ...c,
                  upvotes: res.data!.upvotes,
                  downvotes: res.data!.downvotes,
                };
              }
              if (c.replies && c.replies.length > 0) {
                return { ...c, replies: updateTree(c.replies) };
              }
              return c;
            });
          };
          return updateTree(currentComments);
        },
        { revalidate: false }
      );
    }
  };

  const handleReport = () => {
    if (isReported) {
      unreportComment(comment.id);
      setIsReported(false);
    } else {
      reportComment(comment.id);
      setIsReported(true);
    }
  };

  const handleReaction = async (emoji: CommentReactionType) => {
    const isActive = comment.userReactions?.includes(emoji) ?? false;

    const applyUpdate = (reactions: Record<string, number>, userReactions: CommentReactionType[]) => {
      mutate(
        cacheKey,
        (currentComments: Comment[] = []) => {
          const updateTree = (comments: Comment[]): Comment[] =>
            comments.map((c) => {
              if (c.id === comment.id) {
                return { ...c, reactions: reactions as any, userReactions: userReactions as any };
              }
              if (c.replies && c.replies.length > 0) {
                return { ...c, replies: updateTree(c.replies) };
              }
              return c;
            });
          return updateTree(currentComments);
        },
        { revalidate: false }
      );
    };

    const optimisticReactions = { ...(comment.reactions || {}) } as Record<string, number>;
    optimisticReactions[emoji] = Math.max(0, (optimisticReactions[emoji] || 0) + (isActive ? -1 : 1));
    const optimisticUserReactions = isActive
      ? (comment.userReactions || []).filter((r) => r !== emoji)
      : [...(comment.userReactions || []), emoji];
    applyUpdate(optimisticReactions, optimisticUserReactions);

    const res = await reactToComment(comment.id, emoji);
    if (res.success && res.data) {
      applyUpdate(res.data.reactions as any, res.data.userReactions as any);
    }
  };

  const isLong = comment.body.length > COMMENT_TRUNCATE_LENGTH;
  const directReplyCount = comment.replies?.length ?? 0;
  const totalReplyCount = countDescendants(comment.replies ?? []);
  const visibleReplies = comment.replies?.slice(0, visibleCount) ?? [];
  const remainingCount = directReplyCount - visibleCount;

  if (isHidden && !showHidden) {
    return (
      <div className={cn('py-2', depth > 0 && 'ml-8')}>
        <button onClick={() => setShowHidden(true)} className="text-xs text-text-dim hover:text-text-muted transition-colors">
          View hidden comment (score: {netScore})
        </button>
      </div>
    );
  }

  const isStaff = comment.author?.isStaff ?? ['AUTHOR', 'EDITOR', 'ADMIN'].includes(comment.author?.role ?? '');

  // Replies are indented to align under THIS comment's text content, not its
  // avatar — i.e. by the avatar's full width plus the "gap-3" (12px) flex gap
  // between avatar and content. The connecting spine then has to be pulled
  // back left from that indent by exactly half the avatar's width, so it lands
  // on the avatar's vertical center rather than under the content.
  const AVATAR_SIZE_PX = isMobile
    ? (depth === 0 ? 30 : 24)
    : (depth === 0 ? 40 : 32);
  const AVATAR_TOP_PX = 2; // mt-0.5 on the avatar
  const REPLY_INDENT_PX = AVATAR_SIZE_PX + 12;
  const BRANCH_OFFSET = REPLY_INDENT_PX - AVATAR_SIZE_PX / 2;

  return (
    <div className={cn("relative", depth > 0 && "mt-3")}>

      {/* group/comment is scoped to just this row (not the replies subtree below),
          so hovering a nested reply doesn't also reveal an ancestor's flag/pin icons. */}
      <div className="group/comment flex gap-3 relative z-10">
        {/* Connects the avatar's bottom edge down to this row's own bottom —
            top/bottom (not a fixed height) so it auto-stretches regardless of
            how many lines the comment body wraps to. The remaining short gap
            down to the reply toggle/spine is handled by the existing curves
            below, which already reach back up to almost this exact point. */}
        {directReplyCount > 0 && (
          <div
            className="absolute w-px bg-border pointer-events-none"
            style={{ left: `${AVATAR_SIZE_PX / 2}px`, top: `${AVATAR_TOP_PX + AVATAR_SIZE_PX}px`, bottom: '-8px' }}
          />
        )}
        {/* Avatar */}
        <div className="shrink-0 relative z-10">
          {(() => {
            const avatar = comment.author?.avatarUrl ? (
              <img
                src={comment.author.avatarUrl}
                alt={`${comment.author?.username || comment.authorName} profile photo`}
                className={cn(
                  "rounded-full object-cover mt-0.5",
                  depth === 0 ? "w-[30px] h-[30px] sm:w-10 sm:h-10" : "w-6 h-6 sm:w-8 sm:h-8"
                )}
              />
            ) : (
              <div className={cn(
                "rounded-full flex items-center justify-center font-bold bg-accent text-white dark:text-black mt-0.5 shadow-lg shadow-accent/20",
                depth === 0 ? "w-[30px] h-[30px] sm:w-10 sm:h-10 text-sm" : "w-6 h-6 sm:w-8 sm:h-8 text-[10px]"
              )}>
                {getInitials(comment.author?.username || comment.authorName || '?')}
              </div>
            );
            if (!comment.author?.username) return avatar;
            const username = comment.author.username;
            return (
              <UserHoverCard username={username}>
                <button type="button" onClick={() => openProfile(username)} className="block">{avatar}</button>
              </UserHoverCard>
            );
          })()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {isStaff && (
              <span className="gh-tag" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#000', fontWeight: 700, letterSpacing: '0.03em' }}>
                Staff
              </span>
            )}
            {comment.author?.username ? (
              <UserHoverCard username={comment.author.username}>
                <button
                  type="button"
                  onClick={() => openProfile(comment.author!.username)}
                  className="font-bold text-[13px] text-text-primary hover:underline"
                >
                  @{comment.author.username}
                </button>
              </UserHoverCard>
            ) : (
              <span className="font-bold text-[13px] text-text-primary">
                @{comment.authorName.replace(/\s+/g, '').toLowerCase()}
              </span>
            )}
            {comment.isPinned && <Badge variant="purple" size="sm"><Pin className="w-3 h-3 mr-0.5" />Pinned</Badge>}
            <span className="text-text-dim text-[12px]">{formatRelativeDate(comment.createdAt)}</span>
          </div>

          {comment.gifUrl && (
            <div className="mb-2">
              <Image
                src={comment.gifUrl}
                alt="GIF"
                width={160}
                height={120}
                unoptimized
                loading="lazy"
                className="rounded-lg object-contain border border-border"
                style={{ maxWidth: '160px', width: '100%', height: 'auto' }}
              />
            </div>
          )}
          {/* '[GIF]' is a legacy placeholder from before captions were supported — treat it as no caption. */}
          {(!comment.gifUrl || (comment.body.trim() && comment.body.trim() !== '[GIF]')) && (
            <div className="mb-2">
              <div
                className={cn(
                  "text-[14px] text-text-primary whitespace-pre-wrap break-words",
                  isLong && !isExpanded && "line-clamp-5"
                )}
              >
                {renderCommentBody(comment.body)}
              </div>
              {isLong && (
                <button
                  onClick={() => setIsExpanded(v => !v)}
                  className="mt-0.5 text-[13px] font-bold text-text-dim hover:text-text-primary transition-colors"
                >
                  {isExpanded ? 'See less' : 'See more'}
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-1 text-xs">
            <button
              onClick={() => handleVote(1)}
              aria-label={`Upvote${comment.upvotes > 0 ? `, ${comment.upvotes} upvotes` : ''}`}
              aria-pressed={sessionVote === 1}
              className="flex items-center gap-1.5 hover:bg-bg-surface p-1.5 rounded-full transition-colors cursor-pointer text-text-primary"
            >
              <ThumbsUp className="w-4 h-4" fill={sessionVote === 1 ? "currentColor" : "none"} />
              <span className={cn("font-medium", sessionVote === 1 ? "text-text-primary" : "text-text-dim")}>
                {comment.upvotes > 0 ? comment.upvotes : ''}
              </span>
            </button>
            <button
              onClick={() => handleVote(-1)}
              aria-label="Downvote"
              aria-pressed={sessionVote === -1}
              className="flex items-center gap-1.5 hover:bg-bg-surface p-1.5 rounded-full transition-colors cursor-pointer mr-1 text-text-primary"
            >
              <ThumbsDown className="w-4 h-4" fill={sessionVote === -1 ? "currentColor" : "none"} />
            </button>
            <button
              onClick={() => onReply(comment.id, comment.author?.username || comment.authorName.replace(/\s+/g, '').toLowerCase())}
              className="font-medium text-[12px] text-text-primary hover:bg-bg-surface px-3 py-1.5 rounded-full transition-colors cursor-pointer"
            >
              Reply
            </button>
            {/* Desktop: hover-reveal Flag & Pin */}
            <button
              onClick={handleReport}
              className={cn(
                "hidden sm:flex items-center gap-1 hover:text-warning transition-colors cursor-pointer ml-1 p-1.5 rounded-full hover:bg-bg-surface",
                isReported ? "text-warning opacity-100" : "text-text-dim opacity-0 group-hover/comment:opacity-100"
              )}
              aria-label={isReported ? "Remove Report" : "Report"}
            >
              <Flag className="w-4 h-4" fill={isReported ? "currentColor" : "none"} />
            </button>
            {canPin && (
              <button
                onClick={handlePin}
                disabled={isPinning}
                className={cn(
                  "hidden sm:flex items-center gap-1 transition-colors cursor-pointer ml-1 p-1.5 rounded-full hover:bg-bg-surface",
                  isPinned ? "text-purple-400 opacity-100" : "text-text-dim opacity-0 group-hover/comment:opacity-100"
                )}
                aria-label={isPinned ? "Unpin comment" : "Pin comment"}
                title={isPinned ? "Unpin comment" : "Pin comment"}
              >
                <Pin className="w-4 h-4" fill={isPinned ? "currentColor" : "none"} />
              </button>
            )}

            {/* Mobile: three-dot menu for Flag & Pin */}
            <div className="relative sm:hidden" ref={mobileMenuRef}>
              <button
                onClick={() => setShowMobileMenu(v => !v)}
                className="flex items-center justify-center p-1.5 rounded-full text-text-dim hover:text-text-primary hover:bg-bg-surface transition-colors cursor-pointer ml-1"
                aria-label="More options"
                aria-haspopup="true"
                aria-expanded={showMobileMenu}
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {showMobileMenu && (
                <div className="absolute right-0 bottom-full mb-1 z-50 min-w-[140px] rounded-xl border border-border bg-bg-surface shadow-2xl shadow-black/30 overflow-hidden py-1">
                  <button
                    onClick={() => { handleReport(); setShowMobileMenu(false); }}
                    className={cn(
                      "flex items-center gap-2.5 w-full px-3 py-2 text-[13px] transition-colors",
                      isReported ? "text-warning" : "text-text-primary hover:bg-bg-primary"
                    )}
                  >
                    <Flag className="w-3.5 h-3.5 shrink-0" fill={isReported ? "currentColor" : "none"} />
                    {isReported ? "Remove Report" : "Report"}
                  </button>
                  {canPin && (
                    <button
                      onClick={() => { handlePin(); setShowMobileMenu(false); }}
                      disabled={isPinning}
                      className={cn(
                        "flex items-center gap-2.5 w-full px-3 py-2 text-[13px] transition-colors",
                        isPinned ? "text-purple-400" : "text-text-primary hover:bg-bg-primary"
                      )}
                    >
                      <Pin className="w-3.5 h-3.5 shrink-0" fill={isPinned ? "currentColor" : "none"} />
                      {isPinned ? "Unpin" : "Pin"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Inline Reply Form */}
          {replyToId === comment.id && renderReplyForm && (
            <div className="mt-3 mb-2">
              {renderReplyForm(true)}
            </div>
          )}
        </div>
      </div>

      {/* -- Replies — YouTube-style threading -- */}
      {directReplyCount > 0 && (
        <div
          className="mt-2 ml-13"
          // ml-13 = 52px fallback, matching REPLY_INDENT_PX at depth 0 (40px avatar + 12px gap)
          style={{ marginLeft: `${REPLY_INDENT_PX}px` }}
        >
          {!showReplies ? (
            /* -- Collapsed: "View N replies" with a small L-curve -- */
            <div className="relative mt-1 pb-1">
              {/* L-curve connecting parent's avatar-center line to the button */}
              <div
                className="absolute border-l border-b border-border rounded-bl-[10px] pointer-events-none"
                style={{
                  left: `-${BRANCH_OFFSET}px`,
                  top: '-6px',
                  width: `${BRANCH_OFFSET}px`,
                  height: '22px',
                }}
              />
              <button
                onClick={() => setShowReplies(true)}
                className="flex items-center gap-1.5 text-[13px] font-bold text-[#3ea6ff] hover:bg-[#3ea6ff]/10 py-1.5 pl-1 pr-3 rounded-full transition-colors relative z-10"
              >
                <ChevronDown className="w-4 h-4" />
                View {totalReplyCount} {totalReplyCount === 1 ? 'reply' : 'replies'}
              </button>
            </div>
          ) : (
            /* -- Expanded: vertical spine + per-reply branch curves -- */
            <div className="relative pb-1">
              {/*
                Vertical spine: runs from the very top of the expanded block down
                to just above the "Hide replies" button row (~28px from bottom).
                Left is positioned at avatar-center of the parent comment.
              */}
              <div
                className="absolute top-0 w-px bg-border pointer-events-none"
                style={{
                  left: `-${BRANCH_OFFSET}px`,
                  bottom: '28px',
                }}
              />

              {/* Reply items */}
              <div className="flex flex-col gap-3">
                {visibleReplies.map((reply) => (
                  <div key={reply.id} className="relative">
                    {/*
                      L-curve branch for this reply:
                      - left: same as the spine (negative offset)
                      - top: 12px so it connects at the avatar's vertical midpoint
                      - width: BRANCH_OFFSET so it reaches the spine
                      - height: 20px for the curve arc
                    */}
                    <div
                      className="absolute border-l border-b border-border rounded-bl-[10px] pointer-events-none"
                      style={{
                        left: `-${BRANCH_OFFSET}px`,
                        top: '12px',
                        width: `${BRANCH_OFFSET}px`,
                        height: '20px',
                      }}
                    />
                    <CommentItem
                      comment={reply}
                      onReply={onReply}
                      depth={depth + 1}
                      replyToId={replyToId}
                      renderReplyForm={renderReplyForm}
                      cacheKey={cacheKey}
                    />
                  </div>
                ))}
              </div>

              {/* Show more / Hide replies buttons */}
              <div className="flex flex-col gap-1 mt-2">
                {remainingCount > 0 && (
                  <div className="relative">
                    {/* Branch curve for "Show more" */}
                    <div
                      className="absolute border-l border-b border-border rounded-bl-[10px] pointer-events-none"
                      style={{
                        left: `-${BRANCH_OFFSET}px`,
                        top: '4px',
                        width: `${BRANCH_OFFSET}px`,
                        height: '20px',
                      }}
                    />
                    <button
                      onClick={() => setVisibleCount(v => v + REPLIES_PER_PAGE)}
                      className="flex items-center gap-1.5 text-[13px] font-bold text-[#3ea6ff] hover:bg-[#3ea6ff]/10 py-1.5 pl-1 pr-3 rounded-full transition-colors relative z-10"
                    >
                      <ChevronDown className="w-4 h-4" />
                      Show {Math.min(remainingCount, REPLIES_PER_PAGE)} more {remainingCount === 1 ? 'reply' : 'replies'}
                    </button>
                  </div>
                )}

                <div className="relative">
                  {/* Branch curve for "Hide replies" */}
                  <div
                    className="absolute border-l border-b border-border rounded-bl-[10px] pointer-events-none"
                    style={{
                      left: `-${BRANCH_OFFSET}px`,
                      top: '4px',
                      width: `${BRANCH_OFFSET}px`,
                      height: '20px',
                    }}
                  />
                  <button
                    onClick={() => { setShowReplies(false); setVisibleCount(REPLIES_PER_PAGE); }}
                    className="flex items-center gap-1.5 text-[13px] font-bold text-[#3ea6ff] hover:bg-[#3ea6ff]/10 py-1.5 pl-1 pr-3 rounded-full transition-colors relative z-10"
                  >
                    <ChevronUp className="w-4 h-4" />
                    Hide replies
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}