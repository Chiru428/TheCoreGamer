import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { fetchGameHub } from '@/lib/api';
import { buildMeta, buildOgImageUrl } from '@/lib/seo';
import JsonLd from '@/components/seo/JsonLd';
import GameHero from '@/components/games/hub/GameHero';
import GameHubTabs from '@/components/games/hub/GameHubTabs';
import RecentlyViewedGames from '@/components/games/hub/RecentlyViewedGames';
import AlgoliaEventTracker from '@/components/blog/AlgoliaEventTracker';

export const revalidate = 600;

interface Props { params: Promise<{ slug: string }> }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getYoutubeId(url: string | null): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

// ---------------------------------------------------------------------------
// generateMetadata
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const res = await fetchGameHub(slug, 600);
  if (!res.data) return {};
  const game = res.data;

  const rawDesc = game.description || game.storyline || '';
  const description = rawDesc.length > 157 ? rawDesc.slice(0, 157).trimEnd() + '...' : rawDesc;

  const ogImage = buildOgImageUrl({
    title: game.title,
    type: 'GAME',
    gameCoverUrl: game.coverImageUrl,
  });

  // buildMeta appends "| TheCoreGamer"
  return buildMeta({
    title: `${game.title} — PC, Reviews, Guides`,
    description,
    image: ogImage,
    url: `/games/${slug}`,
  });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function GameHubPage({ params }: Props) {
  const { slug } = await params;

  const gameRes = await fetchGameHub(slug, 600);
  if (!gameRes.data) notFound();
  const game = gameRes.data;

  // Trailer resolution: stored URL → YouTube embed; otherwise the modal
  // falls back to a YouTube search link.
  const youtubeId = getYoutubeId(game.trailerUrl);
  const trailerUrl = youtubeId ? `https://www.youtube.com/embed/${youtubeId}?autoplay=0` : null;
  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
    game.title + ' official trailer'
  )}`;

  return (
    <>
      <AlgoliaEventTracker objectID={`game_${game.id}`} indexName="games" />

      {/* -- Structured Data ----------------------------------------------- */}
      <JsonLd
        type="VideoGame"
        data={{
          slug,
          title: game.title,
          description: (game.description || game.storyline || '').slice(0, 300),
          coverImageUrl: game.coverImageUrl,
          genres: game.genres ?? [],
          platforms: game.platforms ?? [],
          releaseDate: game.releaseDate,
          developer: game.developer,
          publisher: game.publisher,
          metacritic: game.metacritic,
          ratingsCount: game.userRatings?.count,
          esrbRating: game.esrbRating,
        }}
      />
      <JsonLd
        type="BreadcrumbList"
        data={{
          items: [
            { name: 'Home', url: '/' },
            { name: 'Games', url: '/games' },
            { name: game.title, url: `/games/${slug}` },
          ],
        }}
      />

      {/* -- Hero ---------------------------------------------------------- */}
      <GameHero
        game={game}
        slug={slug}
        trailerUrl={trailerUrl}
        youtubeId={youtubeId}
        youtubeSearchUrl={youtubeSearchUrl}
      />

      {/* -- Sticky tab bar + tab content --------------------------------- */}
      <Suspense fallback={null}>
        <GameHubTabs game={game} slug={slug} />
      </Suspense>

      {/* -- Recently Viewed Games --------------------------------------- */}
      <RecentlyViewedGames currentGame={game as any} />
    </>
  );
}
