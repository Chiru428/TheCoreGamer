-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."ArticleStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."BuyRecommendation" AS ENUM ('YES', 'NO', 'WAIT_FOR_SALE', 'DEPENDS');

-- CreateEnum
CREATE TYPE "public"."CommentStatus" AS ENUM ('PENDING', 'APPROVED', 'SPAM', 'HIDDEN');

-- CreateEnum
CREATE TYPE "public"."ContentType" AS ENUM ('NEWS', 'REVIEW', 'MOD_GUIDE', 'WALKTHROUGH', 'OPINION', 'ESPORTS', 'DEAL');

-- CreateEnum
CREATE TYPE "public"."Difficulty" AS ENUM ('EASY', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('VISITOR', 'USER', 'AUTHOR', 'EDITOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."UserScreenshotStatus" AS ENUM ('PENDING', 'APPROVED');

-- CreateTable
CREATE TABLE "public"."AdPlacement" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "adUnitId" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdPlacement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AffiliateClick" (
    "id" TEXT NOT NULL,
    "articleId" TEXT,
    "gameId" TEXT,
    "store" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "utmSource" TEXT NOT NULL DEFAULT 'frameratehub',
    "utmMedium" TEXT NOT NULL DEFAULT 'affiliate',
    "utmCampaign" TEXT,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    "referrer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,

    CONSTRAINT "AffiliateClick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Article" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(75) NOT NULL,
    "content" JSONB NOT NULL,
    "excerpt" VARCHAR(300),
    "featuredImageUrl" TEXT,
    "status" "public"."ArticleStatus" NOT NULL DEFAULT 'DRAFT',
    "contentType" "public"."ContentType" NOT NULL,
    "authorId" TEXT NOT NULL,
    "editorId" TEXT,
    "seoTitle" VARCHAR(90),
    "seoDescription" VARCHAR(250),
    "publishedAt" TIMESTAMP(3),
    "scheduledAt" TIMESTAMP(3),
    "viewCount" BIGINT NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "isBreaking" BOOLEAN NOT NULL DEFAULT false,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "searchVector" tsvector,
    "autosaveContent" JSONB,
    "autosavedAt" TIMESTAMP(3),
    "focusKeyword" VARCHAR(100),
    "embargoUntil" TIMESTAMP(3),
    "isSponsored" BOOLEAN NOT NULL DEFAULT false,
    "sponsorName" TEXT,
    "originallyPublishedAt" TIMESTAMP(3),
    "lastMajorUpdateAt" TIMESTAMP(3),
    "lastMajorUpdateNote" TEXT,
    "isLiveBlog" BOOLEAN NOT NULL DEFAULT false,
    "liveBlogEndedAt" TIMESTAMP(3),
    "communitySubmitterNote" TEXT,
    "isCommunityContent" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ArticleAuthor" (
    "articleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT DEFAULT 'AUTHOR',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ArticleAuthor_pkey" PRIMARY KEY ("articleId","userId")
);

-- CreateTable
CREATE TABLE "public"."ArticleReaction" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ArticleSeries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "coverImageUrl" TEXT,
    "authorId" TEXT,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArticleSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ArticleSeriesEntry" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "displayTitle" TEXT,

    CONSTRAINT "ArticleSeriesEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ArticleTag" (
    "articleId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "ArticleTag_pkey" PRIMARY KEY ("articleId","tagId")
);

-- CreateTable
CREATE TABLE "public"."ArticleVersion" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "editorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Award" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "year" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "winnerGameId" TEXT,
    "nomineesJson" JSONB DEFAULT '[]',
    "editorPickId" TEXT,
    "isVotingOpen" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Award_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AwardVote" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "awardId" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "gameId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AwardVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Badge" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "iconEmoji" TEXT NOT NULL,
    "iconUrl" TEXT,
    "category" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Bookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Comment" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "parentId" TEXT,
    "authorId" TEXT,
    "authorName" TEXT NOT NULL,
    "authorEmail" TEXT NOT NULL,
    "body" VARCHAR(2000) NOT NULL,
    "status" "public"."CommentStatus" NOT NULL DEFAULT 'PENDING',
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "downvotes" INTEGER NOT NULL DEFAULT 0,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "ipAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reportCount" INTEGER NOT NULL DEFAULT 0,
    "gifId" TEXT,
    "gifUrl" TEXT,
    "mentionedUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sortScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rootId" TEXT,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CommentReaction" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CommentVote" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,

    CONSTRAINT "CommentVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EditorNote" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EditorNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ForumBoard" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "iconEmoji" TEXT DEFAULT '💬',
    "isGameBoard" BOOLEAN DEFAULT false,
    "gameId" TEXT,
    "threadCount" INTEGER DEFAULT 0,
    "sortOrder" INTEGER DEFAULT 0,
    "isActive" BOOLEAN DEFAULT true,

    CONSTRAINT "ForumBoard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ForumReply" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "threadId" TEXT NOT NULL,
    "parentId" TEXT,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "upvotes" INTEGER DEFAULT 0,
    "isHidden" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForumReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ForumThread" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "boardId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT DEFAULT 'OPEN',
    "isPinned" BOOLEAN DEFAULT false,
    "replyCount" INTEGER DEFAULT 0,
    "upvotes" INTEGER DEFAULT 0,
    "lastActivityAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForumThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Franchise" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" VARCHAR(500),
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bannerImageUrl" TEXT,
    "logoImageUrl" TEXT,
    "igdbId" INTEGER,
    "articleCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Franchise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FranchiseGame" (
    "franchiseId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,

    CONSTRAINT "FranchiseGame_pkey" PRIMARY KEY ("franchiseId","gameId")
);

-- CreateTable
CREATE TABLE "public"."Game" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "coverImageUrl" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "trailerUrl" TEXT,
    "developer" TEXT,
    "publisher" TEXT,
    "releaseDate" TIMESTAMP(3),
    "platforms" TEXT[],
    "genres" TEXT[],
    "steamAppId" TEXT,
    "esrbRating" TEXT,
    "metacritic" INTEGER,
    "playtime" INTEGER,
    "rating" DOUBLE PRECISION,
    "redditUrl" TEXT,
    "tags" TEXT[],
    "website" TEXT,
    "pegiRating" TEXT,
    "regionalReleaseDates" JSONB,
    "avgUserScore" DOUBLE PRECISION,
    "franchiseId" TEXT,
    "igdbId" INTEGER,
    "storyline" TEXT,
    "igdbUrl" TEXT,
    "totalRating" DOUBLE PRECISION,
    "totalRatingCount" INTEGER,
    "franchiseNames" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dlcNames" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "similarGameNames" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "igdbHypes" INTEGER DEFAULT 0,
    "igdbFollows" INTEGER DEFAULT 0,
    "releaseStatus" TEXT DEFAULT 'Released',
    "dlcOfId" TEXT,
    "gameEdition" TEXT DEFAULT 'STANDARD',
    "igdbSlug" TEXT,
    "screenshotUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "artworkUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allCompaniesJson" JSONB DEFAULT '[]',
    "releaseDatesByPlatformJson" JSONB DEFAULT '[]',
    "themes" TEXT,
    "keywords" TEXT,
    "gameModes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "playerPerspectives" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "gameEngine" TEXT,
    "aggregatedRating" DOUBLE PRECISION,
    "aggregatedRatingCount" INTEGER,
    "igdbCommunityRating" DOUBLE PRECISION,
    "igdbCommunityRatingCount" INTEGER,
    "collectionName" TEXT,
    "dlcsJson" JSONB DEFAULT '[]',
    "expansionsJson" JSONB DEFAULT '[]',
    "similarGamesJson" JSONB DEFAULT '[]',
    "videosJson" JSONB DEFAULT '[]',
    "websitesJson" JSONB DEFAULT '{}',
    "multiplayerModesJson" JSONB,
    "languageSupportsJson" JSONB DEFAULT '[]',
    "backgroundImageUrl" TEXT,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GameReview" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "gameTitle" TEXT NOT NULL,
    "developer" TEXT NOT NULL,
    "publisher" TEXT NOT NULL,
    "releaseDate" TIMESTAMP(3) NOT NULL,
    "platforms" TEXT[],
    "genres" TEXT[],
    "reviewScore" DECIMAL(3,1) NOT NULL,
    "prosList" TEXT[],
    "consList" TEXT[],
    "verdict" TEXT NOT NULL,
    "buyRecommendation" "public"."BuyRecommendation" NOT NULL,
    "originalScore" DECIMAL(3,1),
    "scoreUpdatedAt" TIMESTAMP(3),
    "scoreUpdateReason" TEXT,
    "gameId" TEXT NOT NULL,
    "showReviewDetails" BOOLEAN NOT NULL DEFAULT true,
    "copyProvidedByPublisher" BOOLEAN NOT NULL DEFAULT false,
    "platformsTested" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "GameReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InAppNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "body" VARCHAR(300) NOT NULL,
    "url" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InAppNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LiveBlogUpdate" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "label" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LiveBlogUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MediaAttachment" (
    "id" TEXT NOT NULL,
    "modGuideId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSizeBytes" BIGINT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ModGuide" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "gameName" TEXT NOT NULL,
    "modName" TEXT NOT NULL,
    "gameVersionNotes" TEXT NOT NULL,
    "difficulty" "public"."Difficulty" NOT NULL,
    "estimatedInstallMinutes" INTEGER NOT NULL,
    "prerequisiteList" JSONB NOT NULL,
    "gameId" TEXT,
    "bodyTitle" TEXT DEFAULT 'About This Guide',
    "installationTitle" TEXT DEFAULT 'Installation Steps',
    "sections" JSONB,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "notHelpfulCount" INTEGER NOT NULL DEFAULT 0,
    "gameVersion" TEXT NOT NULL DEFAULT '',
    "gameVersionDate" TIMESTAMP(3),
    "lastVerifiedAt" TIMESTAMP(3),
    "lastVerifiedVersion" TEXT,
    "lastVerifiedById" TEXT,
    "compatibilityNotes" VARCHAR(500),

    CONSTRAINT "ModGuide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ModGuideVote" (
    "id" TEXT NOT NULL,
    "modGuideId" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModGuideVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ModerationLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "moderatorId" TEXT,
    "reason" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NewsletterSend" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "subject" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "openCount" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "hasSponsored" BOOLEAN NOT NULL DEFAULT false,
    "sponsorName" TEXT,
    "campaignId" TEXT,
    "content" JSONB,

    CONSTRAINT "NewsletterSend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NewsletterSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmToken" TEXT,
    "preferences" JSONB,
    "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "newArticlesInCategories" BOOLEAN NOT NULL DEFAULT true,
    "commentReplies" BOOLEAN NOT NULL DEFAULT true,
    "newsletter" BOOLEAN NOT NULL DEFAULT true,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT false,
    "esportsResults" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PointTransaction" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "referenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Poll" (
    "id" TEXT NOT NULL,
    "question" VARCHAR(200) NOT NULL,
    "articleId" TEXT,
    "createdById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "allowMultiple" BOOLEAN NOT NULL DEFAULT false,
    "voterCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Poll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PollOption" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "text" VARCHAR(100) NOT NULL,
    "voteCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PollOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PollVote" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PollVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PriceSnapshot" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "priceINR" DECIMAL(10,2) NOT NULL,
    "cutPercent" INTEGER NOT NULL DEFAULT 0,
    "url" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "endpoint" TEXT NOT NULL,
    "keys" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ReadingList" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadingList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ReadingListItem" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "listId" TEXT NOT NULL,
    "articleId" TEXT,
    "gameId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadingListItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RecentlyViewed" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecentlyViewed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ReviewScoreHistory" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "oldScore" DOUBLE PRECISION NOT NULL,
    "newScore" DOUBLE PRECISION NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedById" TEXT,

    CONSTRAINT "ReviewScoreHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ReviewScorePlatform" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "gameplay" DOUBLE PRECISION,
    "visuals" DOUBLE PRECISION,
    "story" DOUBLE PRECISION,
    "performance" DOUBLE PRECISION,
    "value" DOUBLE PRECISION,
    "overall" DOUBLE PRECISION NOT NULL,
    "notes" VARCHAR(500),

    CONSTRAINT "ReviewScorePlatform_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SearchMiss" (
    "id" TEXT NOT NULL,
    "query" VARCHAR(200) NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchMiss_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SearchQuery" (
    "id" TEXT NOT NULL,
    "query" VARCHAR(200) NOT NULL,
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchQuery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" VARCHAR(300),
    "color" VARCHAR(7),

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "username" VARCHAR(50) NOT NULL,
    "displayName" VARCHAR(100) NOT NULL,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "passwordHash" TEXT,
    "role" "public"."Role" NOT NULL DEFAULT 'USER',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerificationToken" TEXT,
    "emailVerificationExpires" TIMESTAMP(3),
    "passwordResetToken" TEXT,
    "passwordResetExpires" TIMESTAMP(3),
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "oauthProvider" TEXT,
    "oauthId" TEXT,
    "loginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockUntil" TIMESTAMP(3),
    "premiumUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),
    "sessionVersion" INTEGER NOT NULL DEFAULT 0,
    "usernameChangedAt" TIMESTAMP(3),
    "authorBio" VARCHAR(1000),
    "expertise" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "linkedinUrl" TEXT,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "totalAuthorViewCount" BIGINT NOT NULL DEFAULT 0,
    "twitterHandle" TEXT,
    "yearsExperience" INTEGER,
    "profileVisibility" TEXT DEFAULT 'PUBLIC',
    "pinnedArticleId" TEXT,
    "isPublicBookmarks" BOOLEAN NOT NULL DEFAULT false,
    "points" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserBadge" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserContentPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "followedGenres" TEXT[],
    "followedPlatforms" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserContentPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserDevice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceHash" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "UserDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserRating" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "body" VARCHAR(1000),
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserRatingVote" (
    "id" TEXT NOT NULL,
    "userRatingId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,

    CONSTRAINT "UserRatingVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserScreenshot" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "caption" TEXT,
    "status" "public"."UserScreenshotStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserScreenshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserStrike" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "severity" INTEGER NOT NULL DEFAULT 1,
    "issuedById" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "UserStrike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserTeamFollow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamSlug" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserTeamFollow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VideoAsset" (
    "id" TEXT NOT NULL,
    "articleId" TEXT,
    "title" TEXT NOT NULL,
    "muxAssetId" TEXT NOT NULL,
    "muxPlaybackId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'preparing',
    "duration" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "aspectRatio" TEXT,
    "uploadId" TEXT,
    "transcript" TEXT,
    "subtitleTrackId" TEXT,
    "thumbnailUrl" TEXT,

    CONSTRAINT "VideoAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_ArticleGames" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ArticleGames_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdPlacement_zoneId_key" ON "public"."AdPlacement"("zoneId" ASC);

-- CreateIndex
CREATE INDEX "AffiliateClick_articleId_idx" ON "public"."AffiliateClick"("articleId" ASC);

-- CreateIndex
CREATE INDEX "AffiliateClick_createdAt_idx" ON "public"."AffiliateClick"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "AffiliateClick_createdAt_store_idx" ON "public"."AffiliateClick"("createdAt" ASC, "store" ASC);

-- CreateIndex
CREATE INDEX "AffiliateClick_store_idx" ON "public"."AffiliateClick"("store" ASC);

-- CreateIndex
CREATE INDEX "AffiliateClick_userId_idx" ON "public"."AffiliateClick"("userId" ASC);

-- CreateIndex
CREATE INDEX "Article_authorId_idx" ON "public"."Article"("authorId" ASC);

-- CreateIndex
CREATE INDEX "Article_contentType_idx" ON "public"."Article"("contentType" ASC);

-- CreateIndex
CREATE INDEX "Article_contentType_publishedAt_idx" ON "public"."Article"("contentType" ASC, "publishedAt" ASC);

-- CreateIndex
CREATE INDEX "Article_featured_idx" ON "public"."Article"("featured" ASC);

-- CreateIndex
CREATE INDEX "Article_isBreaking_idx" ON "public"."Article"("isBreaking" ASC);

-- CreateIndex
CREATE INDEX "Article_publishedAt_idx" ON "public"."Article"("publishedAt" ASC);

-- CreateIndex
CREATE INDEX "Article_slug_idx" ON "public"."Article"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Article_slug_key" ON "public"."Article"("slug" ASC);

-- CreateIndex
CREATE INDEX "Article_status_idx" ON "public"."Article"("status" ASC);

-- CreateIndex
CREATE INDEX "Article_viewCount_idx" ON "public"."Article"("viewCount" ASC);

-- CreateIndex
CREATE INDEX "ArticleReaction_articleId_idx" ON "public"."ArticleReaction"("articleId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ArticleReaction_articleId_sessionId_type_key" ON "public"."ArticleReaction"("articleId" ASC, "sessionId" ASC, "type" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ArticleReaction_articleId_userId_type_key" ON "public"."ArticleReaction"("articleId" ASC, "userId" ASC, "type" ASC);

-- CreateIndex
CREATE INDEX "ArticleSeries_authorId_idx" ON "public"."ArticleSeries"("authorId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ArticleSeries_slug_key" ON "public"."ArticleSeries"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ArticleSeriesEntry_articleId_key" ON "public"."ArticleSeriesEntry"("articleId" ASC);

-- CreateIndex
CREATE INDEX "ArticleSeriesEntry_seriesId_idx" ON "public"."ArticleSeriesEntry"("seriesId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ArticleSeriesEntry_seriesId_position_key" ON "public"."ArticleSeriesEntry"("seriesId" ASC, "position" ASC);

-- CreateIndex
CREATE INDEX "ArticleVersion_articleId_idx" ON "public"."ArticleVersion"("articleId" ASC);

-- CreateIndex
CREATE INDEX "ArticleVersion_articleId_versionNumber_idx" ON "public"."ArticleVersion"("articleId" ASC, "versionNumber" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "AwardVote_awardId_sessionId_key" ON "public"."AwardVote"("awardId" ASC, "sessionId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "AwardVote_awardId_userId_key" ON "public"."AwardVote"("awardId" ASC, "userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Badge_slug_key" ON "public"."Badge"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Bookmark_userId_articleId_key" ON "public"."Bookmark"("userId" ASC, "articleId" ASC);

-- CreateIndex
CREATE INDEX "Comment_articleId_idx" ON "public"."Comment"("articleId" ASC);

-- CreateIndex
CREATE INDEX "Comment_articleId_status_parentId_idx" ON "public"."Comment"("articleId" ASC, "status" ASC, "parentId" ASC);

-- CreateIndex
CREATE INDEX "Comment_authorId_idx" ON "public"."Comment"("authorId" ASC);

-- CreateIndex
CREATE INDEX "Comment_createdAt_idx" ON "public"."Comment"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "Comment_parentId_idx" ON "public"."Comment"("parentId" ASC);

-- CreateIndex
CREATE INDEX "Comment_rootId_idx" ON "public"."Comment"("rootId" ASC);

-- CreateIndex
CREATE INDEX "Comment_status_idx" ON "public"."Comment"("status" ASC);

-- CreateIndex
CREATE INDEX "CommentReaction_commentId_idx" ON "public"."CommentReaction"("commentId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "CommentReaction_commentId_sessionId_type_key" ON "public"."CommentReaction"("commentId" ASC, "sessionId" ASC, "type" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "CommentReaction_commentId_userId_type_key" ON "public"."CommentReaction"("commentId" ASC, "userId" ASC, "type" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "CommentVote_commentId_userId_key" ON "public"."CommentVote"("commentId" ASC, "userId" ASC);

-- CreateIndex
CREATE INDEX "EditorNote_articleId_idx" ON "public"."EditorNote"("articleId" ASC);

-- CreateIndex
CREATE INDEX "ForumBoard_gameId_idx" ON "public"."ForumBoard"("gameId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ForumBoard_slug_key" ON "public"."ForumBoard"("slug" ASC);

-- CreateIndex
CREATE INDEX "ForumReply_authorId_idx" ON "public"."ForumReply"("authorId" ASC);

-- CreateIndex
CREATE INDEX "ForumReply_parentId_idx" ON "public"."ForumReply"("parentId" ASC);

-- CreateIndex
CREATE INDEX "ForumReply_threadId_idx" ON "public"."ForumReply"("threadId" ASC);

-- CreateIndex
CREATE INDEX "ForumThread_authorId_idx" ON "public"."ForumThread"("authorId" ASC);

-- CreateIndex
CREATE INDEX "ForumThread_boardId_lastActivityAt_idx" ON "public"."ForumThread"("boardId" ASC, "lastActivityAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ForumThread_slug_key" ON "public"."ForumThread"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Franchise_name_key" ON "public"."Franchise"("name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Franchise_slug_key" ON "public"."Franchise"("slug" ASC);

-- CreateIndex
CREATE INDEX "Game_dlcOfId_idx" ON "public"."Game"("dlcOfId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Game_igdbId_key" ON "public"."Game"("igdbId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Game_slug_key" ON "public"."Game"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Game_title_key" ON "public"."Game"("title" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "GameReview_articleId_key" ON "public"."GameReview"("articleId" ASC);

-- CreateIndex
CREATE INDEX "GameReview_gameId_idx" ON "public"."GameReview"("gameId" ASC);

-- CreateIndex
CREATE INDEX "InAppNotification_userId_createdAt_idx" ON "public"."InAppNotification"("userId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "InAppNotification_userId_isRead_idx" ON "public"."InAppNotification"("userId" ASC, "isRead" ASC);

-- CreateIndex
CREATE INDEX "LiveBlogUpdate_articleId_publishedAt_idx" ON "public"."LiveBlogUpdate"("articleId" ASC, "publishedAt" ASC);

-- CreateIndex
CREATE INDEX "MediaAttachment_modGuideId_idx" ON "public"."MediaAttachment"("modGuideId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ModGuide_articleId_key" ON "public"."ModGuide"("articleId" ASC);

-- CreateIndex
CREATE INDEX "ModGuideVote_modGuideId_idx" ON "public"."ModGuideVote"("modGuideId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ModGuideVote_modGuideId_sessionId_key" ON "public"."ModGuideVote"("modGuideId" ASC, "sessionId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ModGuideVote_modGuideId_userId_key" ON "public"."ModGuideVote"("modGuideId" ASC, "userId" ASC);

-- CreateIndex
CREATE INDEX "ModerationLog_createdAt_idx" ON "public"."ModerationLog"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "ModerationLog_moderatorId_idx" ON "public"."ModerationLog"("moderatorId" ASC);

-- CreateIndex
CREATE INDEX "ModerationLog_targetType_targetId_idx" ON "public"."ModerationLog"("targetType" ASC, "targetId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSend_campaignId_key" ON "public"."NewsletterSend"("campaignId" ASC);

-- CreateIndex
CREATE INDEX "NewsletterSend_sentAt_idx" ON "public"."NewsletterSend"("sentAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "public"."NewsletterSubscriber"("email" ASC);

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_subscribedAt_idx" ON "public"."NewsletterSubscriber"("subscribedAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "public"."NotificationPreference"("userId" ASC);

-- CreateIndex
CREATE INDEX "PointTransaction_createdAt_idx" ON "public"."PointTransaction"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "PointTransaction_userId_idx" ON "public"."PointTransaction"("userId" ASC);

-- CreateIndex
CREATE INDEX "Poll_articleId_idx" ON "public"."Poll"("articleId" ASC);

-- CreateIndex
CREATE INDEX "Poll_isActive_idx" ON "public"."Poll"("isActive" ASC);

-- CreateIndex
CREATE INDEX "PollOption_pollId_idx" ON "public"."PollOption"("pollId" ASC);

-- CreateIndex
CREATE INDEX "PollVote_pollId_idx" ON "public"."PollVote"("pollId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "PollVote_pollId_sessionId_optionId_key" ON "public"."PollVote"("pollId" ASC, "sessionId" ASC, "optionId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "PollVote_pollId_userId_optionId_key" ON "public"."PollVote"("pollId" ASC, "userId" ASC, "optionId" ASC);

-- CreateIndex
CREATE INDEX "PriceSnapshot_gameId_idx" ON "public"."PriceSnapshot"("gameId" ASC);

-- CreateIndex
CREATE INDEX "PriceSnapshot_gameId_recordedAt_idx" ON "public"."PriceSnapshot"("gameId" ASC, "recordedAt" ASC);

-- CreateIndex
CREATE INDEX "PriceSnapshot_gameId_shop_recordedAt_idx" ON "public"."PriceSnapshot"("gameId" ASC, "shop" ASC, "recordedAt" ASC);

-- CreateIndex
CREATE INDEX "PriceSnapshot_recordedAt_idx" ON "public"."PriceSnapshot"("recordedAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "public"."PushSubscription"("endpoint" ASC);

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "public"."PushSubscription"("userId" ASC);

-- CreateIndex
CREATE INDEX "ReadingList_userId_idx" ON "public"."ReadingList"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ReadingList_userId_slug_key" ON "public"."ReadingList"("userId" ASC, "slug" ASC);

-- CreateIndex
CREATE INDEX "ReadingListItem_articleId_idx" ON "public"."ReadingListItem"("articleId" ASC);

-- CreateIndex
CREATE INDEX "ReadingListItem_gameId_idx" ON "public"."ReadingListItem"("gameId" ASC);

-- CreateIndex
CREATE INDEX "ReadingListItem_listId_idx" ON "public"."ReadingListItem"("listId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "RecentlyViewed_userId_articleId_key" ON "public"."RecentlyViewed"("userId" ASC, "articleId" ASC);

-- CreateIndex
CREATE INDEX "RecentlyViewed_userId_viewedAt_idx" ON "public"."RecentlyViewed"("userId" ASC, "viewedAt" DESC);

-- CreateIndex
CREATE INDEX "ReviewScoreHistory_changedAt_idx" ON "public"."ReviewScoreHistory"("changedAt" ASC);

-- CreateIndex
CREATE INDEX "ReviewScoreHistory_reviewId_idx" ON "public"."ReviewScoreHistory"("reviewId" ASC);

-- CreateIndex
CREATE INDEX "ReviewScorePlatform_reviewId_idx" ON "public"."ReviewScorePlatform"("reviewId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ReviewScorePlatform_reviewId_platform_key" ON "public"."ReviewScorePlatform"("reviewId" ASC, "platform" ASC);

-- CreateIndex
CREATE INDEX "SearchMiss_createdAt_idx" ON "public"."SearchMiss"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "SearchMiss_query_idx" ON "public"."SearchMiss"("query" ASC);

-- CreateIndex
CREATE INDEX "SearchQuery_createdAt_idx" ON "public"."SearchQuery"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "SearchQuery_query_idx" ON "public"."SearchQuery"("query" ASC);

-- CreateIndex
CREATE INDEX "SearchQuery_resultCount_idx" ON "public"."SearchQuery"("resultCount" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "public"."Tag"("name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "public"."Tag"("slug" ASC);

-- CreateIndex
CREATE INDEX "User_email_idx" ON "public"."User"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email" ASC);

-- CreateIndex
CREATE INDEX "User_oauthProvider_oauthId_idx" ON "public"."User"("oauthProvider" ASC, "oauthId" ASC);

-- CreateIndex
CREATE INDEX "User_pinnedArticleId_idx" ON "public"."User"("pinnedArticleId" ASC);

-- CreateIndex
CREATE INDEX "User_username_idx" ON "public"."User"("username" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "public"."User"("username" ASC);

-- CreateIndex
CREATE INDEX "UserBadge_badgeId_idx" ON "public"."UserBadge"("badgeId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "UserBadge_userId_badgeId_key" ON "public"."UserBadge"("userId" ASC, "badgeId" ASC);

-- CreateIndex
CREATE INDEX "UserBadge_userId_idx" ON "public"."UserBadge"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "UserContentPreference_userId_key" ON "public"."UserContentPreference"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "UserDevice_userId_deviceHash_key" ON "public"."UserDevice"("userId" ASC, "deviceHash" ASC);

-- CreateIndex
CREATE INDEX "UserDevice_userId_lastSeenAt_idx" ON "public"."UserDevice"("userId" ASC, "lastSeenAt" ASC);

-- CreateIndex
CREATE INDEX "UserRating_gameId_idx" ON "public"."UserRating"("gameId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "UserRating_userId_gameId_key" ON "public"."UserRating"("userId" ASC, "gameId" ASC);

-- CreateIndex
CREATE INDEX "UserRating_userId_idx" ON "public"."UserRating"("userId" ASC);

-- CreateIndex
CREATE INDEX "UserRatingVote_userRatingId_idx" ON "public"."UserRatingVote"("userRatingId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "UserRatingVote_userRatingId_voterId_key" ON "public"."UserRatingVote"("userRatingId" ASC, "voterId" ASC);

-- CreateIndex
CREATE INDEX "UserScreenshot_gameId_idx" ON "public"."UserScreenshot"("gameId" ASC);

-- CreateIndex
CREATE INDEX "UserScreenshot_status_idx" ON "public"."UserScreenshot"("status" ASC);

-- CreateIndex
CREATE INDEX "UserScreenshot_userId_idx" ON "public"."UserScreenshot"("userId" ASC);

-- CreateIndex
CREATE INDEX "UserStrike_issuedAt_idx" ON "public"."UserStrike"("issuedAt" ASC);

-- CreateIndex
CREATE INDEX "UserStrike_userId_idx" ON "public"."UserStrike"("userId" ASC);

-- CreateIndex
CREATE INDEX "UserTeamFollow_teamSlug_idx" ON "public"."UserTeamFollow"("teamSlug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "UserTeamFollow_userId_teamSlug_key" ON "public"."UserTeamFollow"("userId" ASC, "teamSlug" ASC);

-- CreateIndex
CREATE INDEX "VideoAsset_articleId_idx" ON "public"."VideoAsset"("articleId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "VideoAsset_muxAssetId_key" ON "public"."VideoAsset"("muxAssetId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "VideoAsset_uploadId_key" ON "public"."VideoAsset"("uploadId" ASC);

-- CreateIndex
CREATE INDEX "_ArticleGames_B_index" ON "public"."_ArticleGames"("B" ASC);

-- AddForeignKey
ALTER TABLE "public"."AffiliateClick" ADD CONSTRAINT "AffiliateClick_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "public"."Article"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AffiliateClick" ADD CONSTRAINT "AffiliateClick_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "public"."Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AffiliateClick" ADD CONSTRAINT "AffiliateClick_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Article" ADD CONSTRAINT "Article_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Article" ADD CONSTRAINT "Article_editorId_fkey" FOREIGN KEY ("editorId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ArticleAuthor" ADD CONSTRAINT "ArticleAuthor_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "public"."Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ArticleAuthor" ADD CONSTRAINT "ArticleAuthor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ArticleReaction" ADD CONSTRAINT "ArticleReaction_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "public"."Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ArticleReaction" ADD CONSTRAINT "ArticleReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ArticleSeries" ADD CONSTRAINT "ArticleSeries_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ArticleSeriesEntry" ADD CONSTRAINT "ArticleSeriesEntry_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "public"."Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ArticleSeriesEntry" ADD CONSTRAINT "ArticleSeriesEntry_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "public"."ArticleSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ArticleTag" ADD CONSTRAINT "ArticleTag_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "public"."Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ArticleTag" ADD CONSTRAINT "ArticleTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "public"."Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ArticleVersion" ADD CONSTRAINT "ArticleVersion_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "public"."Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ArticleVersion" ADD CONSTRAINT "ArticleVersion_editorId_fkey" FOREIGN KEY ("editorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Award" ADD CONSTRAINT "Award_editorPickId_fkey" FOREIGN KEY ("editorPickId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Award" ADD CONSTRAINT "Award_winnerGameId_fkey" FOREIGN KEY ("winnerGameId") REFERENCES "public"."Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AwardVote" ADD CONSTRAINT "AwardVote_awardId_fkey" FOREIGN KEY ("awardId") REFERENCES "public"."Award"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AwardVote" ADD CONSTRAINT "AwardVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Bookmark" ADD CONSTRAINT "Bookmark_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "public"."Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Bookmark" ADD CONSTRAINT "Bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "public"."Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_rootId_fkey" FOREIGN KEY ("rootId") REFERENCES "public"."Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CommentReaction" ADD CONSTRAINT "CommentReaction_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "public"."Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CommentReaction" ADD CONSTRAINT "CommentReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CommentVote" ADD CONSTRAINT "CommentVote_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "public"."Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CommentVote" ADD CONSTRAINT "CommentVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EditorNote" ADD CONSTRAINT "EditorNote_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "public"."Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EditorNote" ADD CONSTRAINT "EditorNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ForumBoard" ADD CONSTRAINT "ForumBoard_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "public"."Game"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."ForumReply" ADD CONSTRAINT "ForumReply_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."ForumReply" ADD CONSTRAINT "ForumReply_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."ForumReply"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."ForumReply" ADD CONSTRAINT "ForumReply_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "public"."ForumThread"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."ForumThread" ADD CONSTRAINT "ForumThread_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."ForumThread" ADD CONSTRAINT "ForumThread_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "public"."ForumBoard"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."FranchiseGame" ADD CONSTRAINT "FranchiseGame_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "public"."Franchise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FranchiseGame" ADD CONSTRAINT "FranchiseGame_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "public"."Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Game" ADD CONSTRAINT "Game_dlcOfId_fkey" FOREIGN KEY ("dlcOfId") REFERENCES "public"."Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Game" ADD CONSTRAINT "Game_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "public"."Franchise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GameReview" ADD CONSTRAINT "GameReview_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "public"."Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GameReview" ADD CONSTRAINT "GameReview_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "public"."Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InAppNotification" ADD CONSTRAINT "InAppNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LiveBlogUpdate" ADD CONSTRAINT "LiveBlogUpdate_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "public"."Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LiveBlogUpdate" ADD CONSTRAINT "LiveBlogUpdate_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MediaAttachment" ADD CONSTRAINT "MediaAttachment_modGuideId_fkey" FOREIGN KEY ("modGuideId") REFERENCES "public"."ModGuide"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ModGuide" ADD CONSTRAINT "ModGuide_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "public"."Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ModGuide" ADD CONSTRAINT "ModGuide_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "public"."Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ModGuide" ADD CONSTRAINT "ModGuide_lastVerifiedById_fkey" FOREIGN KEY ("lastVerifiedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ModGuideVote" ADD CONSTRAINT "ModGuideVote_modGuideId_fkey" FOREIGN KEY ("modGuideId") REFERENCES "public"."ModGuide"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ModGuideVote" ADD CONSTRAINT "ModGuideVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ModerationLog" ADD CONSTRAINT "ModerationLog_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PointTransaction" ADD CONSTRAINT "PointTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Poll" ADD CONSTRAINT "Poll_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "public"."Article"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Poll" ADD CONSTRAINT "Poll_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PollOption" ADD CONSTRAINT "PollOption_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "public"."Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PollVote" ADD CONSTRAINT "PollVote_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "public"."PollOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PollVote" ADD CONSTRAINT "PollVote_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "public"."Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PollVote" ADD CONSTRAINT "PollVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PriceSnapshot" ADD CONSTRAINT "PriceSnapshot_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "public"."Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReadingList" ADD CONSTRAINT "ReadingList_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReadingListItem" ADD CONSTRAINT "ReadingListItem_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "public"."Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReadingListItem" ADD CONSTRAINT "ReadingListItem_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "public"."Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReadingListItem" ADD CONSTRAINT "ReadingListItem_listId_fkey" FOREIGN KEY ("listId") REFERENCES "public"."ReadingList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecentlyViewed" ADD CONSTRAINT "RecentlyViewed_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "public"."Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecentlyViewed" ADD CONSTRAINT "RecentlyViewed_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReviewScoreHistory" ADD CONSTRAINT "ReviewScoreHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReviewScoreHistory" ADD CONSTRAINT "ReviewScoreHistory_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "public"."GameReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReviewScorePlatform" ADD CONSTRAINT "ReviewScorePlatform_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "public"."GameReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_pinnedArticleId_fkey" FOREIGN KEY ("pinnedArticleId") REFERENCES "public"."Article"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserBadge" ADD CONSTRAINT "UserBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "public"."Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserContentPreference" ADD CONSTRAINT "UserContentPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserDevice" ADD CONSTRAINT "UserDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserRating" ADD CONSTRAINT "UserRating_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "public"."Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserRating" ADD CONSTRAINT "UserRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserRatingVote" ADD CONSTRAINT "UserRatingVote_userRatingId_fkey" FOREIGN KEY ("userRatingId") REFERENCES "public"."UserRating"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserRatingVote" ADD CONSTRAINT "UserRatingVote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserScreenshot" ADD CONSTRAINT "UserScreenshot_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "public"."Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserScreenshot" ADD CONSTRAINT "UserScreenshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserStrike" ADD CONSTRAINT "UserStrike_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserStrike" ADD CONSTRAINT "UserStrike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserTeamFollow" ADD CONSTRAINT "UserTeamFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VideoAsset" ADD CONSTRAINT "VideoAsset_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "public"."Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_ArticleGames" ADD CONSTRAINT "_ArticleGames_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_ArticleGames" ADD CONSTRAINT "_ArticleGames_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

