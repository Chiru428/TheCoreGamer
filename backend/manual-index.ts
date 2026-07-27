import { prisma } from './src/lib/prisma';
import { syncArticle } from './src/workers/algolia.worker';
async function run() {
  console.log('Indexing...');
  const articles = await prisma.article.findMany({
    where: { slug: { in: ['black-myth-wukong-bell-locations', 'black-myth-wukong-chapter-1-bosses'] } },
  });
  for (const a of articles) {
    console.log('Postgres:', a.slug);
    try {
        await prisma.$executeRawUnsafe(`UPDATE "Article" SET "searchVector" = setweight(to_tsvector('english', coalesce("title", '')), 'A') || setweight(to_tsvector('english', coalesce("excerpt", '')), 'B') WHERE id = $1`, a.id);
    } catch (err) {
        console.error("Postgres error (maybe no searchVector column?):", err);
    }
    console.log('Algolia:', a.slug);
    await syncArticle(a.id);
  }
  console.log('Done.');
  process.exit(0);
}
run().catch(console.error);
