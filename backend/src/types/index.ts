import type { Role } from "@/generated/prisma";

// Extend NextAuth types
declare module "next-auth" {
  interface User {
    role?: Role;
    username?: string;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: Role;
      username: string;
      displayName: string;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
    username: string;
    displayName: string;
    /** User.sessionVersion at the time this token was issued. */
    sv?: number;
    /** Timestamp (ms) of the last sessionVersion DB check — throttles re-checks. */
    svCheckedAt?: number;
    /** Set when sessionVersion no longer matches the DB — session callback returns null. */
    invalid?: boolean;
  }
}

// Standard API Response
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Pagination params
export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export function parsePagination(
  searchParams: URLSearchParams,
  defaultLimit = 20,
  maxLimit = 100
): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(
    maxLimit,
    Math.max(1, parseInt(searchParams.get("limit") || String(defaultLimit)))
  );
  return { page, limit, skip: (page - 1) * limit };
}

export function buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

// Helper to build consistent responses
export function successResponse<T>(
  data: T,
  message?: string,
  pagination?: PaginationMeta
): ApiResponse<T> {
  return { success: true, data, message, pagination };
}

export function errorResponse(error: string, message?: string): ApiResponse {
  return { success: false, error, message };
}

export function serializeArticle(article: any) {
  const result = {
    ...article,
    viewCount: article.viewCount !== undefined ? Number(article.viewCount) : 0,
  };

  // Map Prisma relation names to nice names for the frontend
  if (article.User_Article_authorIdToUser) {
    result.author = article.User_Article_authorIdToUser;
    delete result.User_Article_authorIdToUser;
  }

  if (article.User_Article_editorIdToUser !== undefined) {
    result.editor = article.User_Article_editorIdToUser;
    delete result.User_Article_editorIdToUser;
  }

  if (article.User_Article_deletionRequestedByIdToUser !== undefined) {
    result.deletionRequestedBy = article.User_Article_deletionRequestedByIdToUser;
    delete result.User_Article_deletionRequestedByIdToUser;
  }

  if (article.ArticleTag) {
    result.tags = article.ArticleTag.map((at: any) => ({ tagId: at.tagId, tag: at.Tag || at.tag }));
    delete result.ArticleTag;
  }

  if (article.Game) {
    result.games = article.Game;
    delete result.Game;
  }

  if (article.GameReview) {
    result.gameReview = {
      ...article.GameReview,
      game: article.GameReview.Game || article.GameReview.game,
      reviewScore:
        article.GameReview.reviewScore !== null ? Number(article.GameReview.reviewScore) : null,
    };
    if (result.gameReview.Game) delete result.gameReview.Game;
    delete result.GameReview;
  }

  if (article.ModGuide) {
    result.modGuide = {
      ...article.ModGuide,
      game: article.ModGuide.Game || article.ModGuide.game,
      lastVerifiedBy: article.ModGuide.User_ModGuide_lastVerifiedByIdToUser || null,
      attachments: article.ModGuide.MediaAttachment
        ? article.ModGuide.MediaAttachment.map((a: any) => ({
            ...a,
            fileSizeBytes: Number(a.fileSizeBytes),
          }))
        : [],
    };
    if (result.modGuide.Game) delete result.modGuide.Game;
    if (result.modGuide.MediaAttachment) delete result.modGuide.MediaAttachment;
    if (result.modGuide.User_ModGuide_lastVerifiedByIdToUser !== undefined)
      delete result.modGuide.User_ModGuide_lastVerifiedByIdToUser;
    // Strip raw Prisma relation arrays that should not be exposed to the frontend
    if (result.modGuide.ModGuideVote !== undefined) delete result.modGuide.ModGuideVote;
    if (result.modGuide.UserScreenshot !== undefined) delete result.modGuide.UserScreenshot;
    delete result.ModGuide;
  }

  if (article.VideoAsset) {
    result.videoAssets = article.VideoAsset;
    delete result.VideoAsset;
  }

  if (article.Poll) {
    result.polls = article.Poll;
    delete result.Poll;
  }

  if (article._count) {
    result._count = {
      ...article._count,
      comments: article._count.Comment ?? article._count.comments ?? 0,
      reactions: article._count.ArticleReaction ?? article._count.reactions ?? 0,
    };
    if (result._count.Comment !== undefined) delete result._count.Comment;
    if (result._count.ArticleReaction !== undefined) delete result._count.ArticleReaction;
  }

  return result;
}
