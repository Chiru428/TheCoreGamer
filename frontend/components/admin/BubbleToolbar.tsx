import React, { useState, useEffect, memo } from 'react';
import { BubbleMenu } from '@tiptap/react/menus';
import { Editor, isTextSelection } from '@tiptap/core';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code,
  Palette, ArrowUp, ArrowDown, MoreHorizontal, X, AlignLeft,
  AlignCenter, AlignRight, AlignJustify, Target, Info, Link as LinkIcon,
  Highlighter, Sparkles, Minus, Plus, BookOpen
} from 'lucide-react';
import { TEXT_COLOR_PALETTE, getGroupedPalette, ColorEntry } from '@/config/textColors';
import { cn } from '@/lib/utils';
import { sanitizeUrl } from '@/lib/sanitize';
import { ArticlePicker, PickedArticle } from '../../extensions/gaming/shared/ArticlePicker';

interface BubbleToolbarProps {
  editor: Editor;
  addToast?: (toast: any) => void;
}

// Must be a stable reference — a fresh object literal on every render makes
// BubbleMenu's internal positioning effect (which depends on `options`) re-run
// on every render, which redispatches a transaction and re-triggers any
// onTransaction listener upstream, causing an infinite render loop.
const BUBBLE_MENU_OPTIONS = { placement: 'top' as const };

// Same stability requirement as `options` above — this replicates BubbleMenu's
// built-in shouldShow (focus/empty/editable checks) and additionally hides the
// menu for image NodeSelections, since CustomImage's own node view already
// renders a dedicated settings panel (alt text, caption, size). Without this,
// both panels show at once and visually collide.
const bubbleMenuShouldShow = ({ editor, element, view, state, from, to }: {
  editor: Editor; element: HTMLElement; view: any; state: any; from: number; to: number;
}) => {
  const { doc, selection } = state;
  const { empty } = selection;
  const isEmptyTextBlock = !doc.textBetween(from, to).length && isTextSelection(selection);
  const isChildOfMenu = element.contains(document.activeElement);
  const hasEditorFocus = view.hasFocus() || isChildOfMenu;
  if (!hasEditorFocus || empty || isEmptyTextBlock || !editor.isEditable) return false;
  if (editor.isActive('image')) return false;
  return true;
};

interface ToolBtnProps {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  title: string;
  className?: string;
  disabled?: boolean;
}

const ToolBtn = memo(({ onClick, active, children, title, className, disabled }: ToolBtnProps) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    disabled={disabled}
    aria-label={title}
    className={cn(
      'flex items-center justify-center w-7 h-7 rounded-md transition-all duration-150 shrink-0 relative',
      disabled && 'opacity-30 pointer-events-none',
      active ? 'bg-[var(--ed-accent-dim)] text-[var(--ed-accent)]' : 'hover:bg-[var(--ed-elevated)] text-[var(--ed-text-dim)]',
      className,
    )}
  >
    {children}
  </button>
));
ToolBtn.displayName = 'ToolBtn';

// --- Custom Inputs for Typography ---------------------------------------------

// Font size is normally only known when an explicit `fontSize` mark is set.
// Headings (h1-h4) get their size from CSS, not a mark, so without this the
// field would show blank/placeholder for a selected heading instead of its
// real rendered size. Falls back to reading the computed style off the DOM
// node at the selection so the field always reflects what's actually on screen.
function getEffectiveFontSize(editor: any): number | null {
  try {
    if (!editor?.view) return null;
    const { from } = editor.state.selection;
    let node: Node | null = editor.view.domAtPos(from).node;
    while (node && node.nodeType !== Node.ELEMENT_NODE) node = node.parentNode;
    if (!node) return null;
    const px = parseFloat(window.getComputedStyle(node as Element).fontSize);
    return Number.isFinite(px) ? Math.round(px) : null;
  } catch {
    return null;
  }
}

const FontSizeInput = ({ editor }: { editor: any }) => {
  const activeFontSize = editor.getAttributes('textStyle').fontSize;
  const parsedMark = parseInt(activeFontSize || '', 10);

  // Prefer the explicit mark value; only fall back to computed DOM size when no
  // mark is set (i.e. default heading/paragraph CSS size is in effect).
  const displayValue = !isNaN(parsedMark)
    ? String(parsedMark)
    : (() => {
        const effective = getEffectiveFontSize(editor);
        return effective != null ? String(effective) : '';
      })();

  const [val, setVal] = useState(displayValue);

  // Sync whenever the mark value changes (covers both +/- clicks and manual edits).
  // Using activeFontSize as the dep (not displayValue) so that going from
  // a mark→no-mark transition also resets the field.
  useEffect(() => {
    setVal(displayValue);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFontSize]);

  const applySize = (sizeStr: string) => {
    if (!sizeStr) {
      editor.commands.unsetFontSize();
    } else {
      const parsed = parseInt(sizeStr, 10);
      if (!isNaN(parsed) && parsed > 0) {
        editor.commands.setFontSize(parsed + 'px');
      }
    }
  };

  return (
    <input
      type="number"
      value={val}
      placeholder="16"
      onChange={e => setVal(e.target.value)}
      onBlur={() => applySize(val)}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          applySize(val);
          editor.commands.focus();
        }
      }}
      className="w-10 text-center text-xs bg-transparent border-b border-transparent hover:border-[var(--ed-border)] focus:border-[var(--ed-border)] focus:outline-none shrink-0 text-[var(--ed-text-primary)]"
    />
  );
};

const LetterSpacingInput = ({ editor }: { editor: any }) => {
  const activeSpacing = editor.getAttributes('textStyle').letterSpacing || '';
  const [val, setVal] = useState(activeSpacing);

  useEffect(() => {
    setVal(activeSpacing);
  }, [activeSpacing]);

  const applySpacing = (sp: string) => {
    if (!sp) {
      editor.commands.unsetLetterSpacing();
    } else {
      let finalVal = sp.trim();
      if (/^-?\d+(\.\d+)?$/.test(finalVal)) {
        const n = parseFloat(finalVal);
        if (Math.abs(n) <= 1) {
          finalVal = n + 'em';
        } else {
          finalVal = n + 'px';
        }
      }
      editor.commands.setLetterSpacing(finalVal);
    }
  };

  return (
    <input
      type="text"
      value={val}
      placeholder="Auto"
      onChange={e => setVal(e.target.value)}
      onBlur={() => applySpacing(val)}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          applySpacing(val);
          editor.commands.focus();
        }
      }}
      className="w-12 text-[11px] rounded-md px-1 py-0.5 text-center outline-none shrink-0 border border-transparent hover:border-[var(--ed-border)] focus:border-[var(--ed-border)]"
      style={{ background: 'transparent', color: 'var(--ed-text-dim)' }}
    />
  );
};

const LineHeightInput = ({ editor }: { editor: any }) => {
  const isHeading = editor.isActive('heading');
  const targetType = isHeading ? 'heading' : 'paragraph';
  const activeLineHeight = editor.getAttributes(targetType).lineHeight || '';
  const [val, setVal] = useState(activeLineHeight);

  useEffect(() => {
    setVal(activeLineHeight);
  }, [activeLineHeight]);

  const applyLineHeight = (lh: string) => {
    if (!lh) {
      editor.chain().focus().updateAttributes(targetType, { lineHeight: null }).run();
    } else {
      editor.chain().focus().updateAttributes(targetType, { lineHeight: lh }).run();
    }
  };

  return (
    <input
      type="text"
      value={val}
      placeholder="Auto"
      onChange={e => setVal(e.target.value)}
      onBlur={() => applyLineHeight(val)}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          applyLineHeight(val);
          editor.commands.focus();
        }
      }}
      className="w-12 text-[11px] rounded-md px-1 py-0.5 text-center outline-none shrink-0 border border-transparent hover:border-[var(--ed-border)] focus:border-[var(--ed-border)]"
      style={{ background: 'transparent', color: 'var(--ed-text-dim)' }}
    />
  );
};

export const BubbleToolbar = ({ editor, addToast }: BubbleToolbarProps) => {
  const [showRow2, setShowRow2] = useState(false);
  const [showRow3, setShowRow3] = useState(false);
  const [showLinkPanel, setShowLinkPanel] = useState(false);
  const [showArticleLinkPanel, setShowArticleLinkPanel] = useState(false);
  const [showCalloutMenu, setShowCalloutMenu] = useState(false);
  const [showBadgeMenu, setShowBadgeMenu] = useState(false);
  const [showLineHeightMenu, setShowLineHeightMenu] = useState(false);
  const [linkHref, setLinkHref] = useState('');
  const [customColors, setCustomColors] = useState<ColorEntry[]>([]);

  const loadCustomColors = () => {
    try {
      const stored = localStorage.getItem('rte-custom-colors');
      if (stored) setCustomColors(JSON.parse(stored));
    } catch (e) {
      console.error('Failed to load custom colors', e);
    }
  };

  useEffect(() => {
    loadCustomColors();
  }, []);

  useEffect(() => {
    if (showRow2) loadCustomColors();
  }, [showRow2]);

  useEffect(() => {
    const handleSelectionUpdate = () => {
      if (editor.state.selection.empty) {
        setShowRow2(false);
        setShowRow3(false);
        setShowLinkPanel(false);
        setShowArticleLinkPanel(false);
        setShowCalloutMenu(false);
        setShowBadgeMenu(false);
        setShowLineHeightMenu(false);
      }
    };
    editor.on('selectionUpdate', handleSelectionUpdate);
    return () => { editor.off('selectionUpdate', handleSelectionUpdate); };
  }, [editor]);

  if (!editor) return null;

  const groupedPalette = getGroupedPalette();
  if (customColors.length > 0) {
    groupedPalette['Custom'] = customColors;
  }
  
  const currentColor = editor.getAttributes('textStyle').colorName || editor.getAttributes('textStyle').color || editor.getAttributes('textStyle').themeColor;
  
  const handleApplyLink = () => {
    if (linkHref) {
      // Validate through the shared allowlist — BubbleToolbar's setLink() call
      // bypasses DOMPurify just like RichTextEditor's, so we need the same guard.
      const safe = sanitizeUrl(linkHref);
      if (safe === null) {
        addToast?.({
          type: 'error',
          message: 'Link blocked: only http, https, mailto, and tel URLs are allowed.',
        });
        setShowLinkPanel(false);
        return;
      }
      editor.chain().focus().extendMarkRange('link').setLink({ href: safe }).run();
    } else {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    }
    setShowLinkPanel(false);
  };

  const handleApplyArticleLink = (article: PickedArticle) => {
    const contentTypeToPath: Record<string, string> = {
      REVIEW: 'reviews',
      MOD_GUIDE: 'mod-guides',
    };
    const path = contentTypeToPath[article.contentType] ?? 'articles';
    const href = `/${path}/${article.slug}`;
    editor.chain().focus().extendMarkRange('link').setLink({ href, target: null, rel: null }).run();
    setShowArticleLinkPanel(false);
  };

  const handleFontSize = (delta: number) => {
    // Read from the explicit textStyle mark first — this is the "real" current
    // size we should delta from. Only fall back to computed DOM size when no
    // mark is set yet (first click on a heading that still has its CSS-only size).
    const explicit = parseInt(editor.getAttributes('textStyle').fontSize || '', 10);
    const currentSize = !isNaN(explicit) ? explicit : (getEffectiveFontSize(editor) ?? 16);
    const newSize = Math.max(8, Math.min(96, currentSize + delta));
    editor.chain().focus().setFontSize(`${newSize}px`).run();
  };

  const insertCallout = (type: string) => {
    editor.chain().focus().insertContent({
      type: 'callout',
      attrs: { type },
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Write your content here…' }] }]
    }).run();
    setShowCalloutMenu(false);
    setShowRow3(false);
  };

  const insertBadge = (label: string, variant: string) => {
    editor.chain().focus().insertContent({ type: 'gamingBadge', attrs: { label, variant } }).run();
    setShowBadgeMenu(false);
    setShowRow3(false);
  };

  const activeColor = [...TEXT_COLOR_PALETTE, ...customColors].find(c => {
    if (c.isCustom) return currentColor === `custom:${c.light}:${c.dark}`;
    return currentColor && (
      currentColor.toLowerCase() === c.name.toLowerCase() ||
      `theme-color-${c.name.toLowerCase().replace(/\s+/g, '-')}` === currentColor || 
      c.light === currentColor || 
      c.dark === currentColor
    );
  });

  const Row3Tools = (
    <>
      {/* Align */}
      <div className="flex items-center gap-0.5 shrink-0">
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align Left">
          <AlignLeft className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Align Center">
          <AlignCenter className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align Right">
          <AlignRight className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} title="Align Justify">
          <AlignJustify className="w-3.5 h-3.5" />
        </ToolBtn>
      </div>

      <div className="w-px h-4 bg-[var(--ed-border)] mx-1 shrink-0" />

      {/* Spacing */}
      <div className="flex items-center gap-1 shrink-0 px-1">
        <span className="text-[10px] text-gray-500 cursor-help" title="Letter Spacing">↔</span>
        <LetterSpacingInput editor={editor} />
        <input 
          type="range" 
          min="-0.1" max="0.5" step="0.01" 
          value={parseFloat(editor.getAttributes('textStyle').letterSpacing || '0') || 0}
          onChange={e => editor.chain().focus().setLetterSpacing(e.target.value + 'em').run()}
          className="w-20 accent-[#00E5FF] shrink-0"
        />
      </div>

      <div className="w-px h-4 bg-[var(--ed-border)] mx-1 shrink-0" />

      {/* Line Height */}
      <div className="relative shrink-0 flex items-center gap-1">
        <span className="text-[10px] text-gray-500 cursor-help" title="Line Height">↕</span>
        <LineHeightInput editor={editor} />
        <ToolBtn onClick={() => setShowLineHeightMenu(v => !v)} active={showLineHeightMenu} title="Line Height" className="w-auto px-1">
          <span className="text-[10px]">▾</span>
        </ToolBtn>
        {showLineHeightMenu && (
          <div className="absolute top-full left-0 mt-1 rounded-lg overflow-hidden z-50 shadow-xl py-1 flex flex-col" style={{ background: 'var(--ed-surface)', border: '1px solid var(--ed-border)', minWidth: '80px' }}>
            {['default', '0.8', '0.9', '1', '1.1', '1.15', '1.25', '1.5', '1.75', '2', '2.5'].map(val => (
              <button key={val} type="button" 
                onClick={() => {
                  const targetType = editor.isActive('heading') ? 'heading' : 'paragraph';
                  if (val === 'default') editor.chain().focus().updateAttributes(targetType, { lineHeight: null }).run();
                  else editor.chain().focus().updateAttributes(targetType, { lineHeight: val }).run();
                  setShowLineHeightMenu(false);
                }}
                className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-[#00E5FF10] transition-colors">
                {val === 'default' ? 'Auto' : val}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-px h-4 bg-[var(--ed-border)] mx-1 shrink-0" />

      {/* Link */}
      <div className="relative shrink-0 flex items-center gap-0.5">
        <ToolBtn onClick={() => {
          setLinkHref(editor.isActive('link') ? (editor.getAttributes('link').href || '') : '');
          setShowLinkPanel(v => {
            if (!v) setShowArticleLinkPanel(false);
            return !v;
          });
        }} active={showLinkPanel || (editor.isActive('link') && !editor.getAttributes('link').href?.startsWith('/'))} title="Link">
          <LinkIcon className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => {
          setShowArticleLinkPanel(v => {
            if (!v) setShowLinkPanel(false);
            return !v;
          });
        }} active={showArticleLinkPanel || (editor.isActive('link') && editor.getAttributes('link').href?.startsWith('/'))} title="Article Link">
          <BookOpen className="w-3.5 h-3.5" />
        </ToolBtn>

        {showLinkPanel && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 p-2 rounded-lg z-50 shadow-xl flex gap-1" style={{ background: 'var(--ed-surface)', border: '1px solid var(--ed-border)' }}>
            <input type="url" placeholder="https://" value={linkHref} onChange={e => setLinkHref(e.target.value)} 
              className="text-xs px-2 py-1 rounded bg-[var(--ed-base)] text-[var(--ed-text-primary)] focus:outline-none w-48 shrink-0"
              style={{ border: '1px solid var(--ed-border)' }}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); handleApplyLink(); }
                if (e.key === 'Escape') { e.preventDefault(); setShowLinkPanel(false); }
              }}
              autoFocus
            />
            <button type="button" onClick={handleApplyLink} className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 shrink-0">Apply</button>
          </div>
        )}

        {showArticleLinkPanel && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 p-2 rounded-lg z-50 shadow-xl w-64" style={{ background: 'var(--ed-surface)', border: '1px solid var(--ed-border)' }}>
            <ArticlePicker 
              onSelect={handleApplyArticleLink} 
              stopProp={(e) => { e.stopPropagation(); }} 
            />
          </div>
        )}
      </div>

      <div className="w-px h-4 bg-[var(--ed-border)] mx-1 shrink-0" />

      {/* Callout */}
      <div className="relative shrink-0">
        <ToolBtn onClick={() => setShowCalloutMenu(v => !v)} active={showCalloutMenu} title="Insert Callout">
          <Info className="w-3.5 h-3.5" />
        </ToolBtn>
        {showCalloutMenu && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 rounded-lg overflow-hidden z-50 shadow-xl flex flex-col" style={{ background: 'var(--ed-surface)', border: '1px solid var(--ed-border)', minWidth: '130px' }}>
            {(['quote', 'tip', 'warning', 'hot-take', 'did-you-know', 'spoiler'] as const).map(type => (
              <button key={type} type="button" onClick={() => insertCallout(type)}
                className="w-full text-left px-3 py-2 text-xs transition-colors capitalize hover:bg-[#00E5FF08]"
                style={{ color: type === 'warning' ? '#ea580c' : type === 'tip' ? '#16a34a' : type === 'hot-take' ? '#dc2626' : type === 'quote' ? '#7c3aed' : type === 'spoiler' ? '#475569' : '#2563eb' }}>
                → {type.replace('-', ' ')}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-px h-4 bg-[var(--ed-border)] mx-1 shrink-0" />

      {/* Badge */}
      <div className="relative shrink-0">
        <ToolBtn onClick={() => setShowBadgeMenu(v => !v)} active={showBadgeMenu} title="Insert Badge">
          <Target className="w-3.5 h-3.5" />
        </ToolBtn>
        {showBadgeMenu && (
          <div className="absolute top-full right-0 mt-1 p-2 rounded-lg z-50 shadow-xl w-[220px]" style={{ background: 'var(--ed-surface)', border: '1px solid var(--ed-border)' }}>
            <div className="text-[10px] text-gray-400 mb-1">Presets</div>
            <div className="flex flex-wrap gap-1">
              {[
                { label: 'PC', variant: 'platform' }, { label: 'PS5', variant: 'platform' }, { label: 'Xbox', variant: 'platform' },
                { label: 'Switch', variant: 'platform' }, { label: 'Mobile', variant: 'platform' },
                { label: '18+', variant: 'rating' }, { label: 'Mature', variant: 'rating' },
                { label: 'Multiplayer', variant: 'genre' }, { label: 'Co-op', variant: 'genre' },
                { label: 'Free to Play', variant: 'status' }, { label: 'Early Access', variant: 'status' }
              ].map(b => (
                <button key={b.label} type="button" onClick={() => insertBadge(b.label, b.variant)}
                  className={`text-[10px] px-1.5 py-0.5 rounded gaming-badge-${b.variant} opacity-80 hover:opacity-100 border`}>
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );

  return (
    <BubbleMenu editor={editor} options={BUBBLE_MENU_OPTIONS} shouldShow={bubbleMenuShouldShow}
      className="flex flex-col rounded-xl pointer-events-auto shadow-2xl w-max max-w-[calc(100vw-1rem)]"
      style={{ background: 'var(--ed-surface)', border: '1px solid var(--ed-border)' }}>

      {/* ROW 1 */}
      <div className="flex items-center gap-1 px-2 py-1 max-w-full overflow-x-auto no-scrollbar relative">
        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
          <Bold className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
          <Italic className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline">
          <UnderlineIcon className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strike">
          <Strikethrough className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Code">
          <Code className="w-3.5 h-3.5" />
        </ToolBtn>

        <div className="w-px h-4 bg-[var(--ed-border)] mx-1 shrink-0" />

        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1" className="text-[11px] font-bold">
          H1
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2" className="text-[11px] font-bold">
          H2
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3" className="text-[11px] font-bold">
          H3
        </ToolBtn>

        <div className="w-px h-4 bg-[var(--ed-border)] mx-1 shrink-0" />

        <ToolBtn onClick={() => setShowRow2(v => !v)} active={showRow2} title="Theme Color">
          <div className="w-5 h-5 rounded-full border border-white/20 shrink-0" style={{ background: activeColor?.light || 'transparent', display: 'flex', alignItems: 'center', justifyItems: 'center' }}>
            {!activeColor && <Palette className="w-3 h-3 opacity-50 m-auto" />}
          </div>
        </ToolBtn>

        <div className="w-px h-4 bg-[var(--ed-border)] mx-1 shrink-0" />

        <div className="flex items-center gap-0.5 shrink-0">
          <ToolBtn onClick={() => handleFontSize(-2)} title="Decrease Font Size" className="w-6 h-6"><Minus className="w-3 h-3" /></ToolBtn>
          <FontSizeInput editor={editor} />
          <ToolBtn onClick={() => handleFontSize(2)} title="Increase Font Size" className="w-6 h-6"><Plus className="w-3 h-3" /></ToolBtn>
        </div>

        <div className="w-px h-4 bg-[var(--ed-border)] mx-1 shrink-0" />

        <ToolBtn onClick={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive('superscript')} title="Superscript">
          <ArrowUp className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleSubscript().run()} active={editor.isActive('subscript')} title="Subscript">
          <ArrowDown className="w-3.5 h-3.5" />
        </ToolBtn>

        <div className="w-px h-4 bg-[var(--ed-border)] mx-1 shrink-0" />

        <ToolBtn onClick={() => editor.chain().focus().toggleHighlight({ color: '#00E5FF22' }).run()} active={editor.isActive('highlight')} title="Highlight">
          <Highlighter className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => addToast?.({ type: 'info', message: 'Connect AI provider to enable rewrite' })} title="AI Rewrite" className="text-[var(--ed-accent)] bg-[#00E5FF12] w-auto px-2">
          <Sparkles className="w-3 h-3 mr-1" /> AI
        </ToolBtn>

        {/* Desktop overflow toggle */}
        <ToolBtn onClick={() => setShowRow3(v => !v)} active={showRow3} title="More Options" className="hidden md:flex ml-1">
          <MoreHorizontal className="w-3.5 h-3.5" />
        </ToolBtn>

        {/* Mobile inline Row 3 continuation */}
        <div className="flex md:hidden items-center gap-1 shrink-0 ml-1">
          <div className="w-px h-4 bg-[var(--ed-border)] mx-1 shrink-0" />
          {Row3Tools}
        </div>
      </div>

      {/* ROW 2: Color Palette */}
      <div 
        className={cn(
          "flex items-center gap-2 max-w-full sm:max-w-[400px] md:max-w-[600px] overflow-x-auto no-scrollbar border-t border-[var(--ed-border)] transition-all duration-150 ease-out origin-top",
          showRow2 ? "max-h-20 opacity-100 py-1 px-2" : "max-h-0 opacity-0 overflow-hidden py-0 border-t-0"
        )}
      >
        <button type="button" onClick={() => { editor.chain().focus().unsetThemeColor().run(); setShowRow2(false); }}
          className="flex items-center gap-1 text-[10px] text-[var(--ed-text-dim)] hover:text-white px-1 shrink-0">
          <X className="w-3 h-3" /> Clear
        </button>
        <div className="w-px h-4 bg-[var(--ed-border)] shrink-0 mx-1" />
        
        {Object.entries(groupedPalette).map(([group, colors], idx, arr) => (
          <React.Fragment key={group}>
            {colors.map(color => (
              <div 
                key={color.name}
                onClick={() => {
                  if (color.isCustom) {
                    editor.chain().focus().setCustomThemeColor(color.light, color.dark).run();
                  } else {
                    const slug = color.name.toLowerCase().replace(/\s+/g, '-');
                    editor.chain().focus().setThemeColor(slug).run();
                  }
                  setShowRow2(false);
                }}
                className={`w-5 h-5 rounded-full cursor-pointer hover:scale-110 transition-transform shrink-0 relative flex items-end justify-end p-[1px] ${activeColor?.name === color.name ? 'ring-2 ring-white ring-offset-1 ring-offset-[var(--ed-surface)]' : ''}`}
                style={{ background: color.light }}
                title={color.name}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: color.dark }} />
              </div>
            ))}
            {idx < arr.length - 1 && (
              <div className="w-px h-4 shrink-0 mx-1 opacity-50" style={{ background: colors[0].light }} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* ROW 3: More Tools (Desktop) */}
      <div 
        className={cn(
          "hidden md:flex items-center gap-1 max-w-full overflow-x-auto no-scrollbar border-t border-[var(--ed-border)] transition-all duration-150 ease-out origin-top",
          showRow3 ? "max-h-20 opacity-100 py-1 px-2" : "max-h-0 opacity-0 overflow-hidden py-0 border-t-0"
        )}
      >
        {Row3Tools}
      </div>

    </BubbleMenu>
  );
};
