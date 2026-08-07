'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useSWR, { useSWRConfig } from 'swr';
import { fetchUserPreferences, updateUserPreferences, fetchGameMetadata } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { Settings2, Check } from 'lucide-react';

export default function PreferencesPage() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const { addToast } = useUIStore();
  const { mutate: globalMutate } = useSWRConfig();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/auth/login?callbackUrl=/settings/preferences');
    }
  }, [isLoading, isAuthenticated, router]);

  const { data: prefs, isLoading: prefsLoading } = useSWR(
    isAuthenticated ? 'user-prefs' : null,
    () => fetchUserPreferences().then((r) => r.data ?? null)
  );
  const { data: meta } = useSWR('game-metadata', () => fetchGameMetadata().then((r) => r.data));

  const [genres, setGenres] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (prefs) {
      setGenres(prefs.followedGenres);
      setPlatforms(prefs.followedPlatforms);
    }
  }, [prefs]);

  const allGenres = meta?.genres ?? [];
  const allPlatforms = meta?.platforms ?? [];

  const toggleGenre = (g: string) =>
    setGenres((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  const togglePlatform = (p: string) =>
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  const handleSave = async () => {
    setSaving(true);
    const res = await updateUserPreferences({ followedGenres: genres, followedPlatforms: platforms });
    setSaving(false);
    if (res.success) {
      addToast({ type: 'success', message: 'Preferences saved' });
      globalMutate('user-prefs');
      globalMutate('feed-for-you');
    } else {
      addToast({ type: 'error', message: res.error || 'Failed to save preferences' });
    }
  };

  if (!isAuthenticated) return null;

  // Shared row class
  const rowCls = 'flex flex-col gap-2 px-5 py-5 border-b border-border dark:border-white/[0.07] last:border-0 transition-colors';

  return (
    <div className="w-full space-y-6" style={{ fontFamily: "'Gibson', sans-serif" }}>

      <div className="mb-6">
        <h3 className="text-[18px] font-bold text-text-primary">Interests</h3>
        <p className="text-[13px] text-text-muted mt-0.5">These preferences personalise your For You feed.</p>
      </div>

      {prefsLoading ? (
        <div className="rounded-xl border border-border dark:border-white/[0.08] overflow-hidden">
          <div className={rowCls}>
            <div className="h-24 w-full rounded bg-gray-200 dark:bg-white/[0.06] animate-pulse" />
          </div>
          <div className={rowCls}>
            <div className="h-24 w-full rounded bg-gray-200 dark:bg-white/[0.06] animate-pulse" />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl border border-border dark:border-white/[0.08] overflow-hidden">
            {allGenres.length > 0 && (
              <div className={rowCls}>
                <p className="text-[15px] font-medium text-text-primary mb-2">Genres</p>
                <div className="flex flex-wrap gap-2">
                  {allGenres.map((g: string) => (
                    <button
                      key={g}
                      onClick={() => toggleGenre(g)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-[13px] font-medium border transition-all',
                        genres.includes(g)
                          ? 'bg-accent text-white border-accent'
                          : 'border-border dark:border-white/[0.12] dark:bg-white/[0.02] text-text-muted hover:border-accent/50 dark:hover:border-accent/50'
                      )}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {allPlatforms.length > 0 && (
              <div className={rowCls}>
                <p className="text-[15px] font-medium text-text-primary mb-2">Platforms</p>
                <div className="flex flex-wrap gap-2">
                  {allPlatforms.map((p: string) => (
                    <button
                      key={p}
                      onClick={() => togglePlatform(p)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-[13px] font-medium border transition-all',
                        platforms.includes(p)
                          ? 'bg-accent text-white border-accent'
                          : 'border-border dark:border-white/[0.12] dark:bg-white/[0.02] text-text-muted hover:border-accent/50 dark:hover:border-accent/50'
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <Button variant="auth" onClick={handleSave} loading={saving}>
              {saving ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
