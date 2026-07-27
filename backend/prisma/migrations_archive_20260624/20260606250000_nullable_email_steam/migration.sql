-- Make User.email nullable to support Steam accounts (which have no email)
-- PostgreSQL allows multiple NULL values in a UNIQUE index, so existing uniqueness is preserved
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
