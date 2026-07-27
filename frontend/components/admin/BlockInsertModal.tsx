import React, { useState, useEffect, useRef } from 'react';import { Spinner } from '@/components/ui/Spinner';

import { X, Check } from 'lucide-react';
import type { FieldConfig, BlockInsertModalConfig } from '@/types/block-insert';
import { fetchOEmbed, OEmbedResult } from '@/lib/oembed';
import ImageUploader from './ImageUploader';

// Re-export so existing imports of FieldConfig/BlockInsertModalConfig from
// this file continue to work without changes.
export type { FieldConfig, BlockInsertModalConfig } from '@/types/block-insert';

interface BlockInsertModalProps extends BlockInsertModalConfig {
  onClose: () => void;
}

const BlockInsertModal = ({ title, fields, tabs, onInsert, onClose, insertLabel = 'Insert' }: BlockInsertModalProps) => {
  const [activeTab, setActiveTab] = useState(0);
  const effectiveFields = tabs ? tabs[activeTab].fields : fields;

  const [values, setValues] = useState<Record<string, string | number>>(() => {
    const initial: Record<string, string | number> = {};
    const allFields = tabs ? tabs.flatMap(t => t.fields) : fields;
    allFields.forEach(f => {
      initial[f.key] = f.defaultValue ?? '';
    });
    return initial;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [oembedStatus, setOembedStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [oembedPreview, setOembedPreview] = useState<OEmbedResult | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const handleInsert = () => {
    const newErrors: Record<string, string> = {};
    effectiveFields.forEach(f => {
      if (f.required && !String(values[f.key] ?? '').trim()) {
        newErrors[f.key] = `${f.label} is required`;
      }
      if ((f.type === 'url' || f.type === 'oembed-url') && values[f.key]) {
        try {
          new URL(String(values[f.key]));
        } catch {
          newErrors[f.key] = 'Invalid URL format';
        }
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onInsert(values);
    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter' && !e.shiftKey) {
        // Only submit on Enter if not in a textarea
        const activeElement = document.activeElement;
        if (activeElement?.tagName !== 'TEXTAREA') {
          handleInsert();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [values, handleInsert]);

  const handleChange = (key: string, value: string | number) => {
    setValues(v => ({ ...v, [key]: value }));
    if (errors[key]) {
      setErrors(e => {
        const next = { ...e };
        delete next[key];
        return next;
      });
    }
  };

  const handleFetchOEmbed = async (field: FieldConfig) => {
    const url = String(values[field.key] || '').trim();
    if (!url) {
      setErrors(e => ({ ...e, [field.key]: 'Enter a URL first' }));
      return;
    }
    try {
      new URL(url);
    } catch {
      setErrors(e => ({ ...e, [field.key]: 'Invalid URL format' }));
      return;
    }

    setOembedStatus('loading');
    setOembedPreview(null);
    const result = await fetchOEmbed(url);
    setOembedPreview(result);
    setOembedStatus(result ? 'success' : 'error');

    if (field.onOEmbedResult) {
      const extra = field.onOEmbedResult(result, url);
      setValues(v => ({ ...v, ...extra }));
    }
  };

  const previewThumb = oembedPreview && 'thumbnailUrl' in oembedPreview ? oembedPreview.thumbnailUrl : undefined;
  const previewName = oembedPreview && 'authorName' in oembedPreview ? oembedPreview.authorName : undefined;
  const previewText = oembedPreview
    ? ('description' in oembedPreview ? oembedPreview.description : 'title' in oembedPreview ? oembedPreview.title : undefined)
    : undefined;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
      <div
        ref={modalRef}
        className="w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col border"
        style={{ background: 'var(--ed-elevated)', borderColor: 'var(--ed-border)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ background: 'var(--ed-surface)', borderColor: 'var(--ed-border)' }}
        >
          <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--ed-text)' }}>{title}</h3>
          <button onClick={onClose} className="transition-colors" style={{ color: 'var(--ed-text-muted)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        {tabs && (
          <div className="flex border-b" style={{ background: 'var(--ed-surface)', borderColor: 'var(--ed-border)' }}>
            {tabs.map((tab, idx) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(idx)}
                className="flex-1 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors border-b-2"
                style={
                  activeTab === idx
                    ? { color: 'var(--ed-accent)', borderColor: 'var(--ed-accent)', background: 'var(--ed-accent-dim)' }
                    : { color: 'var(--ed-text-muted)', borderColor: 'transparent' }
                }
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {effectiveFields.map(field => (
            <div key={field.key} className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: 'var(--ed-text-muted)' }}>
                {field.label} {field.required && <span style={{ color: 'var(--ed-danger-text)' }}>*</span>}
                {field.hint && (
                  <span className="ml-1.5 font-normal normal-case tracking-normal" style={{ color: 'var(--ed-text-dim)' }}>
                    ({field.hint})
                  </span>
                )}
              </label>

              {field.type === 'image' ? (
                <ImageUploader
                  value={values[field.key] as string}
                  onChange={(url) => handleChange(field.key, url)}
                />
              ) : field.type === 'oembed-url' ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={values[field.key]}
                      onChange={e => { handleChange(field.key, e.target.value); setOembedStatus('idle'); setOembedPreview(null); }}
                      placeholder={field.placeholder}
                      autoFocus={effectiveFields[0].key === field.key}
                      className="flex-1 rounded-lg px-4 py-2 focus:outline-none transition-colors text-sm border"
                      style={{ background: 'var(--ed-input-bg)', borderColor: 'var(--ed-border)', color: 'var(--ed-input-text)' }}
                    />
                    <button
                      type="button"
                      onClick={() => handleFetchOEmbed(field)}
                      disabled={oembedStatus === 'loading'}
                      className="px-4 py-2 rounded-lg text-xs font-bold disabled:opacity-50 transition-colors flex items-center gap-1.5 whitespace-nowrap hover:brightness-110"
                      style={{ background: 'var(--ed-accent-dim)', color: 'var(--ed-accent)' }}
                    >
                      {oembedStatus === 'loading' && <Spinner className="w-3.5 h-3.5 animate-spin" />}
                      Fetch Preview
                    </button>
                  </div>
                  {oembedStatus === 'error' && (
                    <p className="text-[10px] font-medium" style={{ color: 'var(--ed-danger-text)' }}>Couldn&apos;t fetch embed data for this URL.</p>
                  )}
                  {oembedStatus === 'success' && oembedPreview && (
                    <div className="flex items-center gap-3 p-3 rounded-lg border" style={{ background: 'var(--ed-surface)', borderColor: 'var(--ed-border)' }}>
                      {previewThumb && (
                        <img src={previewThumb} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate" style={{ color: 'var(--ed-text)' }}>{previewName || 'Preview ready'}</p>
                        {previewText && <p className="text-[11px] truncate" style={{ color: 'var(--ed-text-muted)' }}>{previewText}</p>}
                        <p className="text-[10px] uppercase tracking-wider font-bold mt-0.5" style={{ color: 'var(--ed-accent)' }}>{oembedPreview.platform}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : field.type === 'select' ? (
                <select
                  value={values[field.key]}
                  onChange={e => handleChange(field.key, e.target.value)}
                  className="w-full rounded-lg px-4 py-2 focus:outline-none transition-colors text-sm border"
                  style={{ background: 'var(--ed-input-bg)', borderColor: 'var(--ed-border)', color: 'var(--ed-input-text)' }}
                >
                  <option value="" disabled>Select an option...</option>
                  {field.options?.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : field.type === 'textarea' ? (
                <textarea
                  value={values[field.key]}
                  onChange={e => handleChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full h-24 rounded-lg px-4 py-2 focus:outline-none transition-colors text-sm resize-none border"
                  style={{ background: 'var(--ed-input-bg)', borderColor: 'var(--ed-border)', color: 'var(--ed-input-text)' }}
                />
              ) : (
                <input
                  type={field.type === 'url' ? 'text' : field.type}
                  value={values[field.key]}
                  onChange={e => handleChange(field.key, field.type === 'number' ? parseFloat(e.target.value) : e.target.value)}
                  placeholder={field.placeholder}
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  autoFocus={effectiveFields[0].key === field.key}
                  className="w-full rounded-lg px-4 py-2 focus:outline-none transition-colors text-sm border"
                  style={{ background: 'var(--ed-input-bg)', borderColor: 'var(--ed-border)', color: 'var(--ed-input-text)' }}
                />
              )}

              {errors[field.key] && (
                <p className="text-[10px] font-medium" style={{ color: 'var(--ed-danger-text)' }}>{errors[field.key]}</p>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex gap-3" style={{ background: 'var(--ed-surface)', borderColor: 'var(--ed-border)' }}>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg text-xs font-bold transition-all hover:brightness-110"
            style={{ color: 'var(--ed-text-dim)', background: 'var(--ed-elevated)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleInsert}
            className="flex-1 px-4 py-2 rounded-lg text-xs font-bold transition-all hover:brightness-110 flex items-center justify-center gap-2"
            style={{ color: 'var(--ed-btn-active-text)', background: 'var(--ed-accent)' }}
          >
            <Check className="w-4 h-4" />
            {insertLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BlockInsertModal;
