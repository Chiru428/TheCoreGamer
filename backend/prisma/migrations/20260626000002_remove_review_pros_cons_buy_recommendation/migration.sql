-- Remove Pros/Cons and Buy Recommendation from GameReview — feature removed, Verdict is kept
ALTER TABLE "GameReview" DROP COLUMN IF EXISTS "prosList";
ALTER TABLE "GameReview" DROP COLUMN IF EXISTS "consList";
ALTER TABLE "GameReview" DROP COLUMN IF EXISTS "buyRecommendation";
DROP TYPE IF EXISTS "public"."BuyRecommendation";
