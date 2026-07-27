// One-off: backfill Comment.rootId for replies created before the column existed.
// Run with: npx tsx --env-file=.env scripts/backfill-comment-root-ids.ts

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

async function main() {
  // Replies (have a parentId) with no rootId yet.
  const replies = await prisma.comment.findMany({
    where: { parentId: { not: null }, rootId: null },
    select: { id: true, parentId: true },
  });

  for (const reply of replies) {
    // Walk up the parent chain to find the true root (parentId === null).
    let currentId = reply.parentId!;
    while (true) {
      const parent: { id: string; parentId: string | null } | null = await prisma.comment.findUnique({
        where: { id: currentId },
        select: { id: true, parentId: true },
      });
      if (!parent || !parent.parentId) {
        await prisma.comment.update({
          where: { id: reply.id },
          data: { rootId: parent?.id ?? currentId },
        });
        break;
      }
      currentId = parent.parentId;
    }
  }

  logger.info(`[BackfillCommentRootIds] Backfilled ${replies.length} comments`);
}

main()
  .catch((err) => {
    logger.error({ err }, "[BackfillCommentRootIds] Failed");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
