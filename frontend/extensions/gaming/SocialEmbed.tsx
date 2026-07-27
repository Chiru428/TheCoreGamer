import { Extension, Node, mergeAttributes, Editor } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React, { useState, memo, useEffect } from 'react';
import { renderSocialEmbed, SocialEmbedAttrs, SocialPlatform } from '../../lib/gaming-block-renderers';
import { detectSocialUrl, fetchOEmbed, oembedResultToAttrs, DetectedSocialUrl } from '../../lib/oembed';
import { Share2, Settings2, Trash2, Save, X, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

const PLATFORMS = ['twitter', 'reddit', 'bluesky'] as const;

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  twitter: 'X / Twitter',
  reddit: 'Reddit',
  bluesky: 'Bluesky',
};

const HANDLE_PLACEHOLDERS: Record<SocialPlatform, string> = {
  twitter: '@handle',
  reddit: 'u/username',
  bluesky: '@handle.bsky.social',
};

// --- Node View ----------------------------------------------------------------

const SocialEmbedNodeView = memo((props: NodeViewProps) => {
  const { node, updateAttributes, selected, deleteNode } = props;
  const [isEditing, setIsEditing] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  const attrs = node.attrs as SocialEmbedAttrs;

  const [platform, setPlatform] = useState<SocialPlatform>((attrs.platform as SocialPlatform) ?? 'twitter');
  const [url, setUrl] = useState(attrs.url ?? '');
  const [authorName, setAuthorName] = useState(attrs.authorName ?? '');
  const [authorHandle, setAuthorHandle] = useState(attrs.authorHandle ?? '');
  const [authorUrl, setAuthorUrl] = useState(attrs.authorUrl ?? '');
  const [content, setContent] = useState(attrs.content ?? '');
  const [postDate, setPostDate] = useState(attrs.postDate ?? '');
  const [avatarUrl, setAvatarUrl] = useState(attrs.avatarUrl ?? '');
  const [mediaUrl, setMediaUrl] = useState(attrs.mediaUrl ?? '');
  const [embedHtml, setEmbedHtml] = useState(attrs.embedHtml ?? '');

  useEffect(() => {
    if (!attrs.authorName && !attrs.embedHtml) setIsEditing(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = () => {
    updateAttributes({ platform, url, authorName, authorHandle, authorUrl, content, postDate, avatarUrl, mediaUrl, embedHtml });
  };

  const handleDone = () => { persist(); setIsEditing(false); };

  const stopProp = (e: React.MouseEvent | React.FocusEvent) => {
    e.stopPropagation();
    if (e.type === 'mousedown' && !['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes((e.target as HTMLElement).tagName))
      e.preventDefault();
  };

  const previewAttrs: SocialEmbedAttrs = {
    platform, url, authorName, authorHandle, authorUrl, content, postDate, avatarUrl, mediaUrl, embedHtml,
  };

  const input = (lbl: string, value: string, onChange: (v: string) => void, placeholder = '') => (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 text-slate-400">{lbl}</p>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
        style={{ background: 'var(--ed-input-bg, #0a0f1e)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
        onFocus={stopProp} />
    </div>
  );

  return (
    <NodeViewWrapper className="social-embed-node-wrapper relative group" style={{ isolation: 'isolate' }}>
      {showPreview && (
        <div className={cn('transition-all duration-200', selected && !isEditing && 'ring-2 ring-blue-500/50 rounded-2xl shadow-lg')}
          dangerouslySetInnerHTML={{ __html: renderSocialEmbed(previewAttrs) }} />
      )}
      {!showPreview && (
        <div className="rounded-2xl border border-dashed px-4 py-6 text-center text-xs uppercase tracking-wider text-slate-400"
          style={{ borderColor: 'rgba(255,255,255,0.12)', background: 'var(--ed-elevated, #0d1527)' }}>
          Preview hidden — {PLATFORM_LABELS[platform]} embed
        </div>
      )}

      {/* Toolbar */}
      <div className={cn('absolute top-3 right-3 flex gap-2 z-20 transition-opacity', selected || isEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}>
        <button type="button" onClick={() => setShowPreview(v => !v)} onMouseDown={stopProp}
          title={showPreview ? 'Hide preview' : 'Show preview'}
          className="px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-500/30 shadow-xl backdrop-blur-md flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
          {showPreview ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />} Preview
        </button>
        {!isEditing ? (
          <button type="button" onClick={() => setIsEditing(true)} onMouseDown={stopProp}
            className="px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-blue-400 rounded-lg border border-blue-500/30 shadow-xl backdrop-blur-md flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
            <Settings2 className="w-3.5 h-3.5" /> Edit
          </button>
        ) : (
          <button type="button" onClick={handleDone} onMouseDown={stopProp}
            className="px-3 py-1.5 bg-green-600/90 hover:bg-green-600 text-white rounded-lg border border-green-400/30 shadow-xl backdrop-blur-md flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
            <Save className="w-3.5 h-3.5" /> Done
          </button>
        )}
        <button type="button" onClick={deleteNode} onMouseDown={stopProp}
          className="px-2 py-1.5 bg-red-600/90 hover:bg-red-600 text-white rounded-lg border border-red-400/30 shadow-xl backdrop-blur-md">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Edit panel */}
      {isEditing && (
        <div className="relative z-50 mt-3 p-6 rounded-2xl shadow-2xl backdrop-blur-xl"
          style={{ background: 'var(--ed-elevated, #0d1527)', border: '1px solid rgba(96,165,250,0.2)' }}
          onMouseDown={stopProp}>
          <div className="flex items-center justify-between mb-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-white">Social Embed</h3>
            </div>
            <button type="button" onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
          </div>

          <div className="space-y-4">
            {embedHtml && (
              <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-xs"
                style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', color: '#86efac' }}>
                <span>✓ Native embed data captured from oEmbed</span>
                <button type="button" onClick={() => setEmbedHtml('')} onMouseDown={stopProp}
                  className="font-bold uppercase tracking-wider text-red-300 hover:text-red-200">
                  Clear
                </button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 text-slate-400">Platform</p>
                <select value={platform} onChange={e => setPlatform(e.target.value as SocialPlatform)}
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={{ background: 'var(--ed-input-bg, #0a0f1e)', border: '1px solid rgba(96,165,250,0.3)', color: '#60a5fa' }}>
                  {PLATFORMS.map(p => <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>)}
                </select>
              </div>
              {input('Post URL', url, setUrl, 'https://x.com/...')}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {input('Author Name', authorName, setAuthorName, 'Display name')}
              {input('Author Handle', authorHandle, setAuthorHandle, HANDLE_PLACEHOLDERS[platform])}
            </div>
            {input('Author URL (optional)', authorUrl, setAuthorUrl, 'https://...')}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 text-slate-400">Post Content</p>
              <textarea value={content} onChange={e => setContent(e.target.value)} rows={4}
                placeholder="Copy the post text here…"
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
                style={{ background: 'var(--ed-input-bg, #0a0f1e)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                onFocus={stopProp} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {input('Post Date (ISO)', postDate, setPostDate, '2025-03-15')}
              {input('Avatar URL (optional)', avatarUrl, setAvatarUrl, 'https://...')}
            </div>
            {input('Media / Preview Image URL (optional)', mediaUrl, setMediaUrl, 'https://...')}
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
});

SocialEmbedNodeView.displayName = 'SocialEmbedNodeView';

// --- Node Definition ----------------------------------------------------------

export const SocialEmbedNode = Node.create({
  name: 'socialEmbed',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      platform: { default: 'twitter' },
      url: { default: '' },
      authorName: { default: '' },
      authorHandle: { default: '' },
      authorUrl: { default: '' },
      content: { default: '' },
      postDate: { default: '' },
      avatarUrl: { default: '' },
      mediaUrl: { default: '' },
      embedHtml: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="social-embed"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'social-embed' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SocialEmbedNodeView);
  },
});

// --- Paste-detection "embed this?" prompt --------------------------------------

const pastePromptKey = new PluginKey('socialEmbedPastePrompt');

interface PastePromptMeta {
  type: 'set';
  from: number;
  to: number;
  info: DetectedSocialUrl;
}

type PastePromptClearMeta = { type: 'clear' };

function buildPasteToast(editor: Editor, info: DetectedSocialUrl, from: number, to: number): HTMLElement {
  const clear = () => {
    const tr = editor.view.state.tr.setMeta(pastePromptKey, { type: 'clear' } as PastePromptClearMeta);
    editor.view.dispatch(tr);
  };

  const wrapper = document.createElement('span');
  wrapper.className = 'gc-social-paste-toast';
  wrapper.contentEditable = 'false';

  const label = document.createElement('span');
  label.className = 'gc-social-paste-toast-text';
  label.textContent = `${info.icon} Paste as ${info.label} embed?`;
  wrapper.appendChild(label);

  const embedBtn = document.createElement('button');
  embedBtn.type = 'button';
  embedBtn.className = 'gc-social-paste-toast-btn gc-social-paste-toast-btn--embed';
  embedBtn.textContent = 'Embed';
  embedBtn.addEventListener('mousedown', (e) => e.preventDefault());
  embedBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    embedBtn.disabled = true;
    embedBtn.textContent = 'Loading…';
    fetchOEmbed(info.url).then((result) => {
      const attrs = oembedResultToAttrs(result, info);
      clear();
      editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, { type: 'socialEmbed', attrs }).run();
    });
  });
  wrapper.appendChild(embedBtn);

  const keepBtn = document.createElement('button');
  keepBtn.type = 'button';
  keepBtn.className = 'gc-social-paste-toast-btn gc-social-paste-toast-btn--keep';
  keepBtn.textContent = 'Keep as link';
  keepBtn.addEventListener('mousedown', (e) => e.preventDefault());
  keepBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    clear();
  });
  wrapper.appendChild(keepBtn);

  return wrapper;
}

export const SocialEmbedPastePrompt = Extension.create({
  name: 'socialEmbedPastePrompt',

  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      new Plugin({
        key: pastePromptKey,
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, decorationSet) {
            const meta = tr.getMeta(pastePromptKey) as PastePromptMeta | PastePromptClearMeta | undefined;
            if (meta?.type === 'set') {
              const widget = Decoration.widget(meta.to, () => buildPasteToast(editor, meta.info, meta.from, meta.to), {
                side: 1,
                key: `social-paste-${meta.from}`,
              });
              return DecorationSet.create(tr.doc, [widget]);
            }
            if (meta?.type === 'clear') {
              return DecorationSet.empty;
            }
            return decorationSet.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations(state) {
            return pastePromptKey.getState(state);
          },
          handlePaste(view, event) {
            const text = event.clipboardData?.getData('text/plain');
            if (!text) return false;

            const info = detectSocialUrl(text);
            if (!info) return false;

            const { from } = view.state.selection;
            const to = from + text.length;

            setTimeout(() => {
              const tr = view.state.tr.setMeta(pastePromptKey, { type: 'set', from, to, info } as PastePromptMeta);
              view.dispatch(tr);
            }, 0);

            return false;
          },
        },
      }),
    ];
  },
});
