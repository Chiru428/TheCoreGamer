'use client';

import { useState } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { cn, getScoreLabel } from '@/lib/utils';
import { createGameRating } from '@/lib/api';
import { useUIStore } from '@/store/uiStore';
import type { UserRating } from '@/types';

function ScoreSelector({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value ?? 0;

  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1" onMouseLeave={() => setHover(null)}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            className="p-0.5"
            aria-label={`Score ${n}`}
          >
            <Star
              className={cn('w-6 h-6 transition-colors', n <= display ? 'text-accent' : 'text-border')}
              fill={n <= display ? 'currentColor' : 'none'}
            />
          </button>
        ))}
      </div>
      {display > 0 && (
        <span className="text-sm font-bold text-text-primary">
          {display}/10 · {getScoreLabel(display)}
        </span>
      )}
    </div>
  );
}

export default function ReviewForm({
  slug,
  existing,
  onSaved,
  onCancel,
}: {
  slug: string;
  existing: UserRating | null;
  onSaved: (saved: UserRating) => void;
  onCancel?: () => void;
}) {
  const { addToast } = useUIStore();
  const [score, setScore] = useState<number | null>(existing?.score ?? null);
  const [body, setBody] = useState(existing?.body ?? '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!score) {
      addToast({ type: 'error', message: 'Please select a score (1–10)' });
      return;
    }
    setSaving(true);
    const res = await createGameRating(slug, { score, body: body.trim() || undefined });
    setSaving(false);
    if (res.success && res.data) {
      addToast({ type: 'success', message: existing ? 'Review updated' : 'Review posted!' });
      onSaved(res.data);
    } else {
      addToast({ type: 'error', message: res.error || 'Failed to save review' });
    }
  };

  return (
    <div className="p-4 bg-bg-surface border border-accent/30 rounded-none mb-6">
      <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
        <Star className="w-4 h-4 text-accent" />
        {existing ? 'Update your review' : 'Write a review'}
      </h3>
      <div className="mb-3">
        <p className="text-xs text-text-muted mb-2">Score (1 = Unplayable, 10 = Masterpiece)</p>
        <ScoreSelector value={score} onChange={setScore} />
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={1000}
        rows={4}
        placeholder="Share your thoughts... (optional)"
        className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent resize-none placeholder:text-text-muted"
      />
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-text-muted">{body.length}/1000</span>
        <div className="flex gap-2">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-transparent text-text-muted rounded-lg text-sm font-semibold hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={saving || !score}
            className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-semibold disabled:opacity-50 hover:bg-accent/90 transition-colors flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {existing ? 'Update' : 'Post Review'}
          </button>
        </div>
      </div>
    </div>
  );
}
