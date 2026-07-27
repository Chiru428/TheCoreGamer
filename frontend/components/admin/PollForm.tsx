'use client';

import { Plus, Trash2 } from 'lucide-react';
import ArticleSearchSelect from '@/components/ui/ArticleSearchSelect';
import { cn } from '@/lib/utils';

export interface PollFormValues {
  question: string;
  options: { text: string; allowCustomInput: boolean }[];
  allowMultiple: boolean;
  homepageSlot: 1 | 2 | null;
  articleId: string;
  expiresAt: string;
}

interface PollFormProps {
  values: PollFormValues;
  onChange: (values: PollFormValues) => void;
  /** Options and allowMultiple can't change once a poll already exists (votes depend on them) */
  locked?: boolean;
}

export default function PollForm({ values, onChange, locked = false }: PollFormProps) {
  const set = <K extends keyof PollFormValues>(key: K, value: PollFormValues[K]) =>
    onChange({ ...values, [key]: value });

  const addOption = () => {
    if (values.options.length < 10) set('options', [...values.options, { text: '', allowCustomInput: false }]);
  };

  const removeOption = (i: number) => {
    if (values.options.length <= 2) return;
    set('options', values.options.filter((_, idx) => idx !== i));
  };

  const updateOptionText = (i: number, value: string) => {
    set('options', values.options.map((o, idx) => (idx === i ? { ...o, text: value } : o)));
  };

  const updateOptionCustomInput = (i: number, value: boolean) => {
    set('options', values.options.map((o, idx) => (idx === i ? { ...o, allowCustomInput: value } : o)));
  };

  return (
    <div className="space-y-5">
      {/* Question */}
      <div>
        <label className="block text-sm font-semibold text-text-primary mb-1.5">
          Question <span className="text-red-400">*</span>
        </label>
        <textarea
          value={values.question}
          onChange={(e) => set('question', e.target.value)}
          maxLength={200}
          rows={2}
          placeholder="What do you want to ask the community?"
          className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent resize-none"
        />
        <p className="text-xs text-text-muted mt-1">{values.question.length}/200</p>
      </div>

      {/* Options */}
      <div>
        <label className="block text-sm font-semibold text-text-primary mb-1.5">
          Options <span className="text-red-400">*</span>
          <span className="text-text-muted font-normal ml-2">
            {locked ? '(cannot be changed after creation)' : '(2–10)'}
          </span>
        </label>
        {locked ? (
          <div className="space-y-1">
            {values.options.map((opt, i) => (
              <div key={i} className="px-3 py-2 bg-bg-elevated border border-border rounded-lg text-sm text-text-muted flex justify-between">
                <span>{opt.text}</span>
                {opt.allowCustomInput && <span className="text-xs opacity-60">Allows custom input</span>}
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {values.options.map((opt, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <div className="flex gap-2">
                    <input
                      value={opt.text}
                      onChange={(e) => updateOptionText(i, e.target.value)}
                      maxLength={100}
                      placeholder={`Option ${i + 1}`}
                      className="flex-1 px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent"
                    />
                    {values.options.length > 2 && (
                      <button
                        onClick={() => removeOption(i)}
                        className="p-2 text-text-muted hover:text-red-400 transition-colors"
                        title="Remove option"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <label className="flex items-center gap-2 text-xs text-text-muted ml-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={opt.allowCustomInput}
                      onChange={(e) => updateOptionCustomInput(i, e.target.checked)}
                      className="w-3.5 h-3.5 accent-accent"
                    />
                    Allow users to type custom text for this option
                  </label>
                </div>
              ))}
            </div>
            {values.options.length < 10 && (
              <button
                onClick={addOption}
                className="mt-2 flex items-center gap-1.5 text-xs text-accent hover:underline"
              >
                <Plus className="w-3.5 h-3.5" /> Add option
              </button>
            )}
          </>
        )}
      </div>

      {/* Allow multiple selection */}
      <div>
        <label className={cn('flex items-center gap-2.5 text-sm font-semibold text-text-primary', locked && 'opacity-60 cursor-not-allowed')}>
          <input
            type="checkbox"
            checked={values.allowMultiple}
            disabled={locked}
            onChange={(e) => set('allowMultiple', e.target.checked)}
            className="w-4 h-4 accent-accent"
          />
          Allow selecting multiple options
        </label>
        <p className="text-xs text-text-muted mt-1 ml-[26px]">
          Voters can pick more than one answer instead of being limited to one.
        </p>
      </div>

      {/* Homepage slot */}
      <div>
        <label className="block text-sm font-semibold text-text-primary mb-1.5">
          Homepage Placement
        </label>
        <select
          value={values.homepageSlot ?? ''}
          onChange={(e) => set('homepageSlot', e.target.value === '' ? null : Number(e.target.value) as 1 | 2)}
          className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent"
        >
          <option value="">Not on Homepage</option>
          <option value="1">Slot 1 — Below News &amp; Updates</option>
          <option value="2">Slot 2 — Below Mod Guides</option>
        </select>
        <p className="text-xs text-text-muted mt-1">
          Only one poll can occupy each slot. Assigning a slot removes the previous poll from it.
        </p>
      </div>

      {/* Attach to article — only settable at creation, the update API doesn't change it */}
      {!locked && (
        <div>
          <label className="block text-sm font-semibold text-text-primary mb-1.5">
            Attach to Article
            <span className="text-text-muted font-normal ml-2">(optional)</span>
          </label>
          <ArticleSearchSelect value={values.articleId} onChange={(v) => set('articleId', v)} />
        </div>
      )}

      {/* Expiry */}
      <div>
        <label className="block text-sm font-semibold text-text-primary mb-1.5">
          Close At
          <span className="text-text-muted font-normal ml-2">(optional)</span>
        </label>
        <input
          type="datetime-local"
          value={values.expiresAt}
          onChange={(e) => set('expiresAt', e.target.value)}
          className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent"
        />
      </div>
    </div>
  );
}
