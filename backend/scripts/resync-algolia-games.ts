/**
 * One-time script: Re-syncs all games to Algolia to fix missing filter fields
 * (themes, gameModes, playerPerspectives) that were lost due to race between
 * game creation and IGDB import.
 *
 * Run: npx tsx --env-file=.env scripts/resync-algolia-games.ts
 */
import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { upsertRecord } from '../src/lib/algolia';
import { logger } from '../src/lib/logger';

const GAMES_INDEX = 'games';
const BATCH = 50;

async function main() {
  let cursor: string | undefined;
  let total = 0;
  let synced = 0;

  const count = await prisma.game.count();
  logger.info(`Re-syncing ${count} games to Algolia...`);

  while (true) {
    const games = await prisma.game.findMany({
      take: BATCH,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
      include: {
        GameReview: {
          take: 1,
          orderBy: { Article: { publishedAt: 'desc' } },
          select: { reviewScore: true },
        },
      },
    });

    if (games.length === 0) break;
    cursor = games[games.length - 1].id;

    for (const game of games) {
      try {
        const computedReleaseStatus = (() => {
          if (!game.releaseDate) return 'Coming Soon';
          if (game.releaseDate.getTime() > Date.now()) return 'Coming Soon';
          if (game.releaseDate.getTime() <= Date.now() && game.releaseStatus === 'Coming Soon') return 'Released';
          return game.releaseStatus;
        })();

        const record = {
          objectID: `game_${game.id}`,
          title: game.title,
          slug: game.slug,
          developer: game.developer,
          publisher: game.publisher,
          coverImageUrl: game.coverImageUrl,
          releaseStatus: computedReleaseStatus,
          releaseDate: game.releaseDate ? Math.floor(game.releaseDate.getTime() / 1000) : null,
          releaseYear: game.releaseDate ? game.releaseDate.getFullYear() : null,
          platforms: game.platforms,
          genres: game.genres,
          gameModes: game.gameModes,
          playerPerspectives: game.playerPerspectives,
          themes: game.themes
            ? game.themes.split(/,\s*(?![^()]*\))/).map(s => s.trim()).filter(Boolean)
            : [],
          esrbRating: game.esrbRating,
          metacriticScore: game.metacritic,
          editorialScore: game.GameReview[0] ? Number(game.GameReview[0].reviewScore) : null,
          tags: game.tags,
          totalRating: game.totalRating,
          totalRatingCount: game.totalRatingCount,
          igdbFollows: game.igdbFollows,
        };
        await upsertRecord(GAMES_INDEX, record);
        synced++;
      } catch (err) {
        logger.error({ err, gameId: game.id }, `Failed to sync game ${game.slug}`);
      }
    }

    total += games.length;
    logger.info(`Progress: ${total}/${count} processed, ${synced} synced`);

    if (games.length < BATCH) break;
  }

  logger.info(`Done. ${synced}/${count} games synced to Algolia.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
}).finally(() => prisma.$disconnect());
