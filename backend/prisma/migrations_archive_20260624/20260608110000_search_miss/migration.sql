CREATE TABLE "SearchMiss" (
  "id" TEXT NOT NULL,
  "query" VARCHAR(200) NOT NULL,
  "userId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SearchMiss_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SearchMiss_createdAt_idx" ON "SearchMiss"("createdAt");
CREATE INDEX "SearchMiss_query_idx" ON "SearchMiss"("query");
