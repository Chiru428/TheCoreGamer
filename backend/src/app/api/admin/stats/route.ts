import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { requireRole } from "@/middleware/requireRole";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { cacheGet, cacheSet } from "@/lib/redis";
import { rateLimit } from "@/middleware/rateLimit";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const rateLimitResponse = await rateLimit(request, "READ");
    if (rateLimitResponse) return rateLimitResponse;

    const roleCheck = await requireRole(["ADMIN"], request);
    if (roleCheck) return roleCheck;

    const cacheKey = "admin:stats";
    try {
      const cached = await cacheGet<any>(cacheKey);
      if (cached) return NextResponse.json(successResponse(cached));
    } catch (err) {
      logger.warn({ err }, "Cache invalidation failed");
    }

    // Avoid massive Promise.all to prevent connection pool exhaustion (15 queries at once > pool limit of 10)
    let totalArticles = 0;
    let publishedArticles = 0;
    let draftArticles = 0;
    let inReviewArticles = 0;
    let totalUsers = 0;
    let totalComments = 0;
    let pendingComments = 0;
    let totalSubscribers = 0;
    let newsArticles = 0;
    let reviewArticles = 0;
    let modGuideArticles = 0;
    let walkthroughArticles = 0;
    let dealArticles = 0;
    let opinionArticles = 0;
    let featureArticles = 0;
    let listicleArticles = 0;
    
    let topAuthorGroups: any;
    let topAuthors: any;
    let topDealGroups: any;
    let recentArticles: any;
    let recentComments: any;

    await withRetry(async () => {
      const [
        totalArticlesRes,
        publishedArticlesRes,
        draftArticlesRes,
        inReviewArticlesRes,
        totalUsersRes,
        totalCommentsRes,
        pendingCommentsRes,
        totalSubscribersRes,
        newsArticlesRes,
        reviewArticlesRes,
        modGuideArticlesRes,
        walkthroughArticlesRes,
        dealArticlesRes,
        opinionArticlesRes,
        featureArticlesRes,
        listicleArticlesRes,
        topAuthorGroupsRaw,
        topDealGroupsRaw,
        recentArticlesRaw,
        recentCommentsRaw
      ] = await Promise.all([
        prisma.article.count(),
        prisma.article.count({ where: { status: "PUBLISHED" } }),
        prisma.article.count({ where: { status: "DRAFT" } }),
        prisma.article.count({ where: { status: "IN_REVIEW" } }),
        prisma.user.count(),
        prisma.comment.count(),
        prisma.comment.count({ where: { status: "PENDING" } }),
        prisma.newsletterSubscriber.count({ where: { confirmed: true } }),
        prisma.article.count({ where: { contentType: "NEWS" } }),
        prisma.article.count({ where: { contentType: "REVIEW" } }),
        prisma.article.count({ where: { contentType: "MOD_GUIDE" } }),
        prisma.article.count({ where: { contentType: "WALKTHROUGH" } }),
        prisma.article.count({ where: { contentType: "DEAL" } }),
        prisma.article.count({ where: { contentType: "OPINION" } }),
        prisma.article.count({ where: { contentType: "FEATURE" } }),
        prisma.article.count({ where: { contentType: "LISTICLE" } }),
        prisma.article.groupBy({
          by: ['authorId'],
          _count: { id: true },
          where: { status: 'PUBLISHED' },
          orderBy: { _count: { id: 'desc' } }
        }),
        prisma.affiliateClick.groupBy({
          by: ['store'],
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } }
        }),
        prisma.article.findMany({
          where: { status: 'PUBLISHED' },
          orderBy: { publishedAt: 'desc' },
          take: 5,
          select: { 
            id: true, 
            title: true, 
            slug: true,
            contentType: true,
            publishedAt: true, 
            User_Article_authorIdToUser: { select: { displayName: true } } 
          }
        }),
        prisma.comment.findMany({
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { 
            id: true, 
            body: true, 
            createdAt: true, 
            authorName: true, 
            Article: { select: { title: true } } 
          }
        })
      ]);

      totalArticles = totalArticlesRes;
      publishedArticles = publishedArticlesRes;
      draftArticles = draftArticlesRes;
      inReviewArticles = inReviewArticlesRes;
      totalUsers = totalUsersRes;
      totalComments = totalCommentsRes;
      pendingComments = pendingCommentsRes;
      totalSubscribers = totalSubscribersRes;
      newsArticles = newsArticlesRes;
      reviewArticles = reviewArticlesRes;
      modGuideArticles = modGuideArticlesRes;
      walkthroughArticles = walkthroughArticlesRes;
      dealArticles = dealArticlesRes;
      opinionArticles = opinionArticlesRes;
      featureArticles = featureArticlesRes;
      listicleArticles = listicleArticlesRes;

      topAuthorGroups = topAuthorGroupsRaw.slice(0, 5);
      topDealGroups = topDealGroupsRaw.slice(0, 5);
      recentArticles = recentArticlesRaw.map((a: any) => ({
        ...a,
        type: a.contentType
      }));
      recentComments = recentCommentsRaw;

      const authorIds = topAuthorGroups.map((g: any) => g.authorId);
      const authorsData = await prisma.user.findMany({
        where: { id: { in: authorIds } },
        select: { id: true, displayName: true, avatarUrl: true }
      });
      
      topAuthors = topAuthorGroups.map((g: any) => {
         const user = authorsData.find(u => u.id === g.authorId);
         return { 
           id: user?.id, 
           displayName: user?.displayName, 
           avatarUrl: user?.avatarUrl, 
           articleCount: g._count.id 
         };
      });
    });

    const activeAdZones = await withRetry(() =>
      prisma.adPlacement.count({ where: { isActive: true } })
    );

    const stats = {
      totalPublished: publishedArticles,
      pendingReview: inReviewArticles,
      totalUsers,
      activeAdZones,
      articles: {
        total: totalArticles,
        published: publishedArticles,
        drafts: draftArticles,
        inReview: inReviewArticles,
        byType: {
          news: newsArticles,
          review: reviewArticles,
          modGuide: modGuideArticles,
          walkthrough: walkthroughArticles,
          deal: dealArticles,
          opinion: opinionArticles,
          feature: featureArticles,
          listicle: listicleArticles,
        },
      },
      comments: { total: totalComments, pending: pendingComments },
      newsletter: { subscribers: totalSubscribers },
      topAuthors,
      topDeals: topDealGroups.map((g: any) => ({ store: g.store, clickCount: g._count.id })),
      recentActivity: {
        articles: recentArticles.map((a: any) => ({
          id: a.id,
          title: a.title,
          slug: a.slug,
          type: a.type,
          publishedAt: a.publishedAt,
          authorName: a.User_Article_authorIdToUser?.displayName || 'Unknown'
        })),
        comments: recentComments.map((c: any) => ({
          id: c.id,
          body: c.body,
          createdAt: c.createdAt,
          authorName: c.authorName,
          articleTitle: c.Article?.title || 'Unknown'
        }))
      }
    };

    try {
      await cacheSet(cacheKey, stats, 10);
    } catch (err) {
      logger.warn({ err }, "Cache invalidation failed");
    }

    return NextResponse.json(successResponse(stats));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
