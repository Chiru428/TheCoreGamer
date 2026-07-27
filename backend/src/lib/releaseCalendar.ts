// Shared helpers for the release-calendar endpoints
// (/api/games/upcoming and /api/games/new-releases).

/** Filter-bar values mapped to the platform strings stored on Game rows */
export const PLATFORM_ALIASES: Record<string, string[]> = {
  PS5: ["PS5", "PlayStation 5"],
  "Xbox Series X": ["Xbox Series X", "Xbox Series X/S", "Xbox Series X|S", "XSX/S", "XSX"],
  "Nintendo Switch": ["Nintendo Switch", "Switch", "Nintendo Switch 2"],
  PC: ["PC", "Windows", "PC (Microsoft Windows)"],
  Mobile: ["Mobile", "iOS", "Android"],
};

/** Lightweight card payload for calendar/list views */
export const GAME_CARD_SELECT = {
  id: true,
  title: true,
  slug: true,
  coverImageUrl: true,
  libraryImageUrl: true,
  developer: true,
  publisher: true,
  releaseDate: true,
  platforms: true,
  genres: true,
} as const;

/** Groups games under "YYYY-MM" keys for the calendar grid */
export function groupByMonth<T extends { releaseDate: Date | null }>(
  games: T[]
): Record<string, T[]> {
  const byMonth: Record<string, T[]> = {};
  for (const game of games) {
    if (!game.releaseDate) continue;
    const key = game.releaseDate.toISOString().slice(0, 7);
    (byMonth[key] ??= []).push(game);
  }
  return byMonth;
}
