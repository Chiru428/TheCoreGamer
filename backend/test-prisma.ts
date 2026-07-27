import { PrismaClient } from './src/generated/prisma';
const prisma = new PrismaClient();

async function main() {
  try {
    const res = await Promise.all([
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
          type: true,
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
    console.log("Success");
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
