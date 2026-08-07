import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { auth } from "@/lib/auth";
import { validateBody } from "@/middleware/validateBody";
import { rateLimit, getClientIp } from "@/middleware/rateLimit";
import { createCommentSchema, COMMENT_REACTION_TYPES } from "@/validators";
import { captureError } from "@/lib/sentry";
import { redis } from "@/lib/redis";
import { TOXICITY_THRESHOLD, COMMENTS_PER_HOUR_LIMIT } from "@/lib/constants";
import { parsePagination, buildPaginationMeta, successResponse, errorResponse } from "@/types";
import { csrfProtection } from "@/middleware/csrfProtection";
import { createNotification } from "@/lib/notifications";
import crypto from "crypto";

const STAFF_ROLES = ["AUTHOR", "EDITOR", "ADMIN"];

const REACTION_SELECT = { type: true, userId: true, sessionId: true } as const;

const USER_SELECT = {
  id: true,
  displayName: true,
  username: true,
  avatarUrl: true,
  role: true,
} as const;

// Attaches each reply to its true parent (any depth), so threads of
// unbounded depth survive — Prisma's `include` can't express "N levels deep"
// without a hardcoded N, so the tree is assembled in memory instead.
function attachChildren(comment: any, repliesByParent: Map<string, any[]>): any {
  const children = repliesByParent.get(comment.id) ?? [];
  return { ...comment, other_Comment: children.map((c) => attachChildren(c, repliesByParent)) };
}

interface Viewer {
  userId?: string;
  sessionId?: string;
}

/**
 * Renames Prisma relation fields to match the frontend Comment type:
 *   User          -> author
 *   other_Comment -> replies
 *   CommentReaction -> reactions / userReactions
 * Applied recursively so nested replies are also normalised.
 */
function normalizeComment(c: any, viewer: Viewer): any {
  const { User, other_Comment, CommentReaction, CommentVote, ...rest } = c;

  const reactions: Record<string, number> = {};
  for (const type of COMMENT_REACTION_TYPES) reactions[type] = 0;
  const userReactions: string[] = [];
  for (const r of CommentReaction ?? []) {
    reactions[r.type] = (reactions[r.type] ?? 0) + 1;
    const isMine = viewer.userId ? r.userId === viewer.userId : r.sessionId === viewer.sessionId;
    if (isMine) userReactions.push(r.type);
  }

  const userVote = Array.isArray(CommentVote) && CommentVote.length > 0 ? CommentVote[0].value : 0;

  return {
    ...rest,
    author: User ? { ...User, isStaff: STAFF_ROLES.includes(User.role) } : null,
    replies: Array.isArray(other_Comment)
      ? other_Comment.map((x: any) => normalizeComment(x, viewer))
      : [],
    reactions,
    userReactions,
    userVote,
  };
}

export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await rateLimit(request, "READ");
    if (rateLimitResponse) return rateLimitResponse;

    const articleId = request.nextUrl.searchParams.get("articleId");
    if (!articleId)
      return NextResponse.json(errorResponse("articleId is required"), { status: 400 });

    const searchParams = request.nextUrl.searchParams;
    const { page, limit, skip } = parsePagination(searchParams);

    const sortParam = searchParams.get("sort");
    const sort = sortParam === "new" || sortParam === "top" ? sortParam : "best";
    const orderBy: any =
      sort === "new"
        ? [{ isPinned: "desc" }, { createdAt: "desc" }]
        : sort === "top"
          ? [{ isPinned: "desc" }, { upvotes: "desc" }]
          : [{ isPinned: "desc" }, { sortScore: "desc" }];

    const session = await auth();
    const viewer: Viewer = {};
    if (session?.user?.id) {
      viewer.userId = session.user.id;
    } else {
      const ip = getClientIp(request);
      const ua = request.headers.get("user-agent") || "";
      viewer.sessionId = crypto.createHash("sha256").update(`${ip}:${ua}`).digest("hex").slice(0, 32);
    }

    // Voting requires an authenticated account, so there's nothing to fetch
    // for anonymous viewers — only attach the CommentVote relation when logged in.
    const commentInclude = {
      User: { select: USER_SELECT },
      CommentReaction: { select: REACTION_SELECT },
      ...(viewer.userId
        ? { CommentVote: { where: { userId: viewer.userId }, select: { value: true } } }
        : {}),
    };

    const where = { articleId, status: "APPROVED" as const, parentId: null };
    // Execute sequentially to avoid connection starvation
    const topLevelComments = await withRetry(() =>
      prisma.comment.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: commentInclude,
      })
    );

    // Every reply under this page's top-level comments, regardless of depth —
    // scoped via rootId (always the true top-level ancestor) so we don't have
    // to fetch the whole article's replies just to find ours.
    const topLevelIds = topLevelComments.map((c) => c.id);
    const allReplies = topLevelIds.length > 0
      ? await withRetry(() =>
          prisma.comment.findMany({
            where: { rootId: { in: topLevelIds }, status: "APPROVED" },
            orderBy: { createdAt: "asc" },
            include: commentInclude,
          })
        )
      : [];

    const repliesByParent = new Map<string, typeof allReplies>();
    for (const reply of allReplies) {
      if (!reply.parentId) continue;
      if (!repliesByParent.has(reply.parentId)) repliesByParent.set(reply.parentId, []);
      repliesByParent.get(reply.parentId)!.push(reply);
    }

    const comments = topLevelComments.map((c) =>
      normalizeComment(attachChildren(c, repliesByParent), viewer)
    );

    const total = await withRetry(() => prisma.comment.count({ where }));

    return NextResponse.json(
      successResponse(
        comments,
        undefined,
        buildPaginationMeta(page, limit, total)
      )
    );
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

export async function POST(request: Request) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const { data, error } = await validateBody(request, createCommentSchema);
    if (error) return error;

    // Honeypot check
    if (data.website && data.website.length > 0) {
      return NextResponse.json(successResponse(null, "Comment submitted"), { status: 201 });
    }

    const session = await auth();
    const ip = getClientIp(request);

    if (!session?.user) {
      if (!data.authorName?.trim()) {
        return NextResponse.json(errorResponse("Name is required for guest comments"), {
          status: 400,
        });
      }
      if (!data.authorEmail?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.authorEmail)) {
        return NextResponse.json(errorResponse("A valid email is required for guest comments"), {
          status: 400,
        });
      }
    }

    // 20 comments per hour — keyed per user when authenticated, per IP for guests
    try {
      const commentKey = `comment-rate:${session?.user?.id ?? ip}`;
      const commentCount = await redis.incr(commentKey);
      if (commentCount === 1) await redis.expire(commentKey, 3600);
      if (commentCount > COMMENTS_PER_HOUR_LIMIT) {
        return NextResponse.json(errorResponse("Too many comments. Try again later."), {
          status: 429,
        });
      }
    } catch (redisErr) {
      // Redis unavailable — skip rate limiting rather than blocking the request
      console.warn("[comments] Redis rate-limit check failed, skipping:", redisErr);
    }

    // rootId always points to the ultimate top-level ancestor of the thread —
    // kept as metadata (e.g. for notifications) even though replies nest
    // normally under whichever comment was actually replied to.
    let resolvedRootId: string | undefined = undefined;
    let parentAuthorId: string | null = null;

    if (data.parentId) {
      const parent = await withRetry(() =>
        prisma.comment.findUnique({ where: { id: data.parentId } })
      );
      if (!parent)
        return NextResponse.json(errorResponse("Parent comment not found"), { status: 404 });

      resolvedRootId = parent.parentId === null ? parent.id : (parent.rootId ?? parent.parentId);
      parentAuthorId = parent.authorId;
    }

    // Comments show up immediately — when OPENAI_API_KEY is configured, the toxicity
    // worker checks them in the background and demotes flagged ones to SPAM after
    // the fact, instead of holding every comment back until it's been reviewed.
    const commentStatus = "APPROVED" as const;

    const mentionedUserIds = Array.from(new Set(data.mentionedUserIds ?? []));

    const comment = await withRetry(() =>
      prisma.comment.create({
        data: {
          articleId: data.articleId,
          parentId: data.parentId,
          rootId: resolvedRootId,
          authorId: session?.user?.id,
          authorName: session?.user?.name || data.authorName || "Anonymous",
          authorEmail: session?.user?.email || data.authorEmail || "",
          body: data.body,
          gifUrl: data.gifUrl,
          gifId: data.gifId,
          mentionedUserIds,
          status: commentStatus,
          ipAddress: ip,
        },
        include: {
          User: { select: USER_SELECT },
        },
      })
    );

    // Toxicity-check enqueue and reply/mention notifications don't affect this
    // response — running them after the response is sent (rather than awaiting
    // a queue add plus several sequential DB round trips first) is what was
    // making "Post comment" feel slow.
    after(async () => {
      try {
        if (process.env.OPENAI_API_KEY) {
          const { addToxicityCheckJob } = await import("@/lib/bullmq");
          await addToxicityCheckJob({ commentId: comment.id, text: data.body }).catch(() => {});
        }

        const hasReplyTarget = !!parentAuthorId && parentAuthorId !== comment.authorId;
        const needsArticle = mentionedUserIds.length > 0 || hasReplyTarget;
        const article = needsArticle
          ? await withRetry(() =>
              prisma.article.findUnique({ where: { id: data.articleId }, select: { slug: true, contentType: true } })
            )
          : null;
        
        let href: string | undefined = undefined;
        if (article) {
          const contentTypeToPath: Record<string, string> = { 
            NEWS: 'news', 
            REVIEW: 'reviews', 
            MOD_GUIDE: 'mod-guides', 
            WALKTHROUGH: 'articles', 
            OPINION: 'articles', 
            DEAL: 'deals' 
          };
          const basePath = contentTypeToPath[article.contentType] ?? 'articles';
          href = `/${basePath}/${article.slug}#comment-${comment.id}`;
        }
        
        const actorName = comment.User?.username || comment.authorName;

        if (mentionedUserIds.length > 0) {
          const recipients = mentionedUserIds.filter((uid) => uid !== comment.authorId);
          if (recipients.length > 0) {
            await Promise.all(
              recipients.map((uid) =>
                createNotification(uid, "MENTION", `@${actorName} mentioned you`, comment.body, href)
              )
            );
          }
        }

        // Skip if the parent author was already notified via @mention above.
        if (hasReplyTarget && !mentionedUserIds.includes(parentAuthorId!)) {
          const pref = await withRetry(() =>
            prisma.notificationPreference.findUnique({ where: { userId: parentAuthorId! } })
          );
          if (pref?.commentReplies !== false) {
            await createNotification(
              parentAuthorId!,
              "COMMENT_REPLY",
              `${actorName} replied to your comment`,
              comment.body,
              href
            );
          }
        }
      } catch (err) {
        captureError(err);
      }
    });

    const { User, ...commentRest } = comment;
    return NextResponse.json(
      successResponse(
        { ...commentRest, author: User ?? null, replies: [], reactions: {}, userReactions: [], userVote: 0 },
        "Comment posted"
      ),
      { status: 201 }
    );
  } catch (err) {
    console.error("[comments POST] Unhandled error:", err);
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
