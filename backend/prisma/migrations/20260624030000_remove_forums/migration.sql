-- Remove the community forums feature entirely.
-- CASCADE drops each table's own foreign keys along with it; children are
-- dropped before parents isn't required since CASCADE handles dependency order.
DROP TABLE IF EXISTS "ForumReply" CASCADE;
DROP TABLE IF EXISTS "ForumThread" CASCADE;
DROP TABLE IF EXISTS "ForumBoard" CASCADE;
