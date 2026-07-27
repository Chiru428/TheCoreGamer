-- Backfill any GameReview rows still missing a gameId, using the first game
-- linked to their Article (the admin review form previously never set
-- GameReview.gameId directly — see the gameId fix in the review API routes).
UPDATE "GameReview" gr
SET "gameId" = sub."gameId"
FROM (
  SELECT DISTINCT ON (ag."A") ag."A" AS "articleId", ag."B" AS "gameId"
  FROM "_ArticleGames" ag
  ORDER BY ag."A", ag."B"
) sub
WHERE gr."articleId" = sub."articleId"
  AND gr."gameId" IS NULL;

-- A review must always be linked to exactly one game.
ALTER TABLE "GameReview" ALTER COLUMN "gameId" SET NOT NULL;
