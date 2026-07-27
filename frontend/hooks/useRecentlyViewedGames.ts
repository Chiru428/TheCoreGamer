import { useState, useEffect } from 'react';

export interface RecentlyViewedGame {
  id: string;
  slug: string;
  title: string;
  coverImageUrl: string | null;
  publisher: string | null;
}

const STORAGE_KEY = 'tcg_recently_viewed_games';
const MAX_HISTORY = 15;

export function useRecentlyViewedGames() {
  const [history, setHistory] = useState<RecentlyViewedGame[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load recently viewed games', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const addGameToHistory = (game: RecentlyViewedGame) => {
    setHistory((prev) => {
      // Remove it if it already exists to avoid duplicates
      const filtered = prev.filter((g) => g.id !== game.id);
      
      // Add the new game to the front
      const newHistory = [game, ...filtered].slice(0, MAX_HISTORY);
      
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
      } catch (e) {
        console.error('Failed to save recently viewed games', e);
      }
      
      return newHistory;
    });
  };

  return { history, isLoaded, addGameToHistory };
}
