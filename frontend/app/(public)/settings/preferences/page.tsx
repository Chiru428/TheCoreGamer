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

  return (
    <div>
      <h1 className="text-[24px] font-bold text-text-primary mb-2 flex items-center gap-2">
        <Settings2 className="w-6 h-6 text-accent" /> Interests
      </h1>
      <p className="text-sm text-text-muted mb-8">These preferences personalise your For You feed.</p>

      {prefsLoading ? (
        <div className="space-y-4">
          <div className="h-32 rounded-xl shimmer" />
          <div className="h-32 rounded-xl shimmer" />
        </div>
      ) : (
        <div className="bg-bg-surface border border-border rounded-xl p-5 max-w-2xl">
          {allGenres.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-2">Genres</p>
              <div className="flex flex-wrap gap-1.5">
                {allGenres.map((g: string) => (
                  <button
                    key={g}
                    onClick={() => toggleGenre(g)}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                      genres.includes(g)
                        ? 'bg-accent text-white border-accent'
                        : 'border-border text-text-muted hover:border-accent/50'
                    )}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          )}

          {allPlatforms.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-2">Platforms</p>
              <div className="flex flex-wrap gap-1.5">
                {allPlatforms.map((p: string) => (
                  <button
                    key={p}
                    onClick={() => togglePlatform(p)}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                      platforms.includes(p)
                        ? 'bg-accent text-white border-accent'
                        : 'border-border text-text-muted hover:border-accent/50'
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Button variant="auth" onClick={handleSave} loading={saving} icon={<Check className="w-4 h-4" />}>
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      )}
    </div>
  );
}
