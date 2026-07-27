'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import Image from 'next/image';
import { useForm, type UseFormRegister, type UseFormHandleSubmit, type UseFormReset, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { fetchComments, createComment, searchTenorGifs } from '@/lib/api';
import type { Comment, CommentSort, TenorGif } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import CommentItem from './CommentItem';
import Button from '@/components/ui/Button';
import { MessageSquare, LogIn, Bold, Italic, Underline, Strikethrough, Code, Link as LinkIcon, EyeOff, Quote, AtSign, X, Film, Smile } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Theme as EmojiPickerTheme, EmojiStyle } from 'emoji-picker-react';
const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });
import Link from 'next/link';
import { cn } from '@/lib/utils';

const schema = z.object({
  body: z.string().min(1, 'Comment cannot be empty').max(2000),
  website: z.string().max(0).optional(),
});

const guestSchema = schema.extend({
  authorName: z.string().min(1, 'Name is required').max(50),
  authorEmail: z.string().email('A valid email is required'),
});

type GuestFormValues = z.infer<typeof guestSchema>;

interface CommentSectionProps {
  articleId: string;
}

const SORT_TABS: { label: string; value: CommentSort }[] = [
  { label: 'New', value: 'new' },
  { label: 'Best', value: 'best' },
  { label: 'Top', value: 'top' },
];

function countAllComments(comments: Comment[]): number {
  return comments.reduce((sum, c) => sum + 1 + countAllComments(c.replies || []), 0);
}

// Inserts a new reply into whichever comment it was actually replied to,
// at any nesting depth, for the optimistic UI update.
function insertReply(comments: Comment[], parentId: string, newComment: Comment): Comment[] {
  return comments.map((c) => {
    if (c.id === parentId) {
      return { ...c, replies: [...(c.replies ?? []), newComment] };
    }
    if (c.replies && c.replies.length > 0) {
      return { ...c, replies: insertReply(c.replies, parentId, newComment) };
    }
    return c;
  });
}

/** Converts the contenteditable's DOM tree to inline markdown. */
function htmlToMarkdown(el: HTMLElement): string {
  function walk(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const elem = node as HTMLElement;
    const tag = elem.tagName.toLowerCase();
    const children = Array.from(elem.childNodes).map(walk).join('');
    switch (tag) {
      case 'strong': case 'b': return children ? `**${children}**` : '';
      case 'em':     case 'i': return children ? `*${children}*`  : '';
      case 'u':    return children ? `__${children}__` : '';
      case 's':    case 'del': case 'strike': return children ? `~~${children}~~` : '';
      case 'code': return children ? `\`${children}\`` : '';
      case 'a':    return children ? `[${children}](${elem.getAttribute('href') || ''})` : '';
      case 'span': {
        if (elem.dataset.spoiler) return children ? `||${children}||` : '';
        if (elem.dataset.quote) return children ? `>>${children}<<` : '';
        return children;
      }
      case 'br':   return '\n';
      case 'div':  case 'p': return '\n' + children;
      default: return children;
    }
  }
  return Array.from(el.childNodes).map(walk).join('')
    .replace(/​/g, '') // strip the placeholder used to anchor the cursor inside an empty format wrapper
    .replace(/^\n/, '').replace(/\n$/, '');
}

// Identifies an existing wrapper element of the given format, so a second click
// on the same toolbar button removes the formatting instead of nesting another
// layer of it (the previous behavior, which corrupted the markdown on toggle-off).
const FORMAT_PREDICATES: Record<string, (elem: HTMLElement) => boolean> = {
  bold: (elem) => elem.tagName === 'STRONG' || elem.tagName === 'B',
  italic: (elem) => elem.tagName === 'EM' || elem.tagName === 'I',
  underline: (elem) => elem.tagName === 'U',
  strikethrough: (elem) => elem.tagName === 'S' || elem.tagName === 'DEL' || elem.tagName === 'STRIKE',
  code: (elem) => elem.tagName === 'CODE',
  link: (elem) => elem.tagName === 'A',
  spoiler: (elem) => elem.tagName === 'SPAN' && elem.dataset.spoiler === '1',
  blockquote: (elem) => elem.tagName === 'SPAN' && elem.dataset.quote === '1',
};

// Formats with a native execCommand: the browser toggles them correctly for both
// an active selection and a bare cursor, so text typed right after toggling
// inherits (or drops) the format — something manual DOM wrapping can't do reliably.
const NATIVE_COMMANDS: Record<string, string> = {
  bold: 'bold',
  italic: 'italic',
  underline: 'underline',
  strikethrough: 'strikeThrough',
};

const ZERO_WIDTH_SPACE = '​';

function findFormatAncestor(node: Node, root: HTMLElement, predicate: (elem: HTMLElement) => boolean): HTMLElement | null {
  let cur: Node | null = node;
  while (cur && cur !== root) {
    if (cur.nodeType === Node.ELEMENT_NODE && predicate(cur as HTMLElement)) return cur as HTMLElement;
    cur = cur.parentNode;
  }
  return null;
}

function unwrapElement(elem: HTMLElement) {
  const parent = elem.parentNode;
  if (!parent) return;
  while (elem.firstChild) parent.insertBefore(elem.firstChild, elem);
  parent.removeChild(elem);
}

type FormatType = 'bold' | 'italic' | 'underline' | 'strikethrough' | 'code' | 'link' | 'spoiler' | 'blockquote' | 'mention';

interface CommentFormProps {
  isInline?: boolean;
  isAuthenticated: boolean;
  register: UseFormRegister<GuestFormValues>;
  errors: FieldErrors<GuestFormValues>;
  isSubmitting: boolean;
  handleSubmit: UseFormHandleSubmit<GuestFormValues>;
  onSubmit: (data: GuestFormValues) => void | Promise<void>;
  reset: UseFormReset<GuestFormValues>;
  showGifPicker: boolean;
  setShowGifPicker: React.Dispatch<React.SetStateAction<boolean>>;
  gifPickerRef: React.RefObject<HTMLDivElement | null>;
  gifQuery: string;
  setGifQuery: (q: string) => void;
  gifLoading: boolean;
  gifResults: TenorGif[];
  selectGif: (gif: TenorGif) => void;
  gifPreview: TenorGif | null;
  removeGif: () => void;
  showEmojiPicker: boolean;
  setShowEmojiPicker: React.Dispatch<React.SetStateAction<boolean>>;
  emojiPickerRef: React.RefObject<HTMLDivElement | null>;
  insertEmoji: (emoji: string) => void;
  theme: 'dark' | 'light';
  activeFormats: Set<string>;
  toolbarBtnCls: (active: boolean) => string;
  applyFormat: (type: FormatType) => void;
  editorEmpty: boolean;
  bodyRef: React.RefObject<HTMLDivElement | null>;
  handleContentEditableInput: () => void;
  updateActiveFormats: () => void;
  editorCls: string;
  setReplyTo: (id: string | null) => void;
  setGifPreview: (g: TenorGif | null) => void;
  clearEditor: () => void;
}

// A real, module-level component (not a closure defined inside CommentSection)
// so its identity is stable across re-renders — the contentEditable below holds
// live DOM state (cursor position, in-progress markup) that a fresh component
// identity on every keystroke would silently remount and wipe out.
function CommentForm({
  isInline = false,
  isAuthenticated,
  register,
  errors,
  isSubmitting,
  handleSubmit,
  onSubmit,
  reset,
  showGifPicker,
  setShowGifPicker,
  gifPickerRef,
  gifQuery,
  setGifQuery,
  gifLoading,
  gifResults,
  selectGif,
  gifPreview,
  removeGif,
  showEmojiPicker,
  setShowEmojiPicker,
  emojiPickerRef,
  insertEmoji,
  theme,
  activeFormats,
  toolbarBtnCls,
  applyFormat,
  editorEmpty,
  bodyRef,
  handleContentEditableInput,
  updateActiveFormats,
  editorCls,
  setReplyTo,
  setGifPreview,
  clearEditor,
}: CommentFormProps) {
  return (
    <form onSubmit={handleSubmit(onSubmit)} className={isInline ? 'mt-2 mb-4' : 'mb-8'}>
      <input {...register('website')} type="text" className="hidden" tabIndex={-1} autoComplete="off" />
      {/* Hidden input so react-hook-form tracks the body field */}
      <input type="hidden" {...register('body')} />

      {!isAuthenticated && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <input {...register('authorName')} aria-label="Your name" placeholder="Your name *" className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary placeholder:text-text-dim focus:border-accent outline-none" />
            {(errors as any).authorName && <p className="text-xs text-danger mt-1">{(errors as any).authorName.message}</p>}
          </div>
          <div>
            <input {...register('authorEmail')} type="email" aria-label="Email address (not published)" placeholder="Email (not published) *" className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary placeholder:text-text-dim focus:border-accent outline-none" />
            {(errors as any).authorEmail && <p className="text-xs text-danger mt-1">{(errors as any).authorEmail.message}</p>}
          </div>
        </div>
      )}

      {/* Format toolbar */}
      <div className="flex items-center gap-0.5 mb-1 relative flex-wrap border border-border rounded-lg px-2 py-1.5 bg-bg-surface">
        {/* GIF */}
        <div className="relative" ref={gifPickerRef}>
          <button type="button" onClick={() => setShowGifPicker(v => !v)} title="Add GIF" className="p-1.5 rounded hover:bg-bg-primary text-text-muted hover:text-text-primary transition-colors text-[10px] font-bold tracking-tight flex items-center justify-center" style={{ width: 28, height: 28, border: '1.5px solid currentColor', borderRadius: 4, fontSize: 10 }}>
            GIF
          </button>
          {showGifPicker && (
            <div className="absolute top-full left-0 mt-1 z-50 w-64 p-2 rounded-xl border border-border bg-bg-surface shadow-2xl">
              <input
                type="text"
                value={gifQuery}
                onChange={(e) => setGifQuery(e.target.value)}
                placeholder="Search GIFs..."
                aria-label="Search GIFs"
                autoFocus
                className="w-full px-2 py-1.5 mb-2 bg-bg-primary border border-border rounded-lg text-xs text-text-primary placeholder:text-text-dim focus:border-accent outline-none"
              />
              {gifLoading ? (
                <div className="grid grid-cols-3 gap-1">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="shimmer rounded" style={{ height: '80px' }} />
                  ))}
                </div>
              ) : gifResults.length > 0 ? (
                <div className="grid grid-cols-3 gap-1 max-h-48 overflow-y-auto">
                  {gifResults.map((gif) => (
                    <button
                      key={gif.id}
                      type="button"
                      onClick={() => selectGif(gif)}
                      className="relative overflow-hidden rounded hover:ring-2 hover:ring-accent transition-all"
                      style={{ height: '80px' }}
                    >
                      <Image src={gif.previewUrl} alt={gif.title} fill unoptimized className="object-cover" sizes="80px" />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-dim text-center py-4">No GIFs found</p>
              )}
              {/* Required by Giphy ToS: https://developers.giphy.com/docs/sdk#attribution */}
              <p className="text-[10px] text-text-dim text-right mt-1 pr-0.5 opacity-60 select-none">
                Powered by GIPHY
              </p>
            </div>
          )}
        </div>

        {/* Emoji */}
        <div className="relative" ref={emojiPickerRef}>
          <button type="button" onClick={() => setShowEmojiPicker(v => !v)} title="Add emoji" className="p-1.5 rounded hover:bg-bg-primary text-text-muted hover:text-text-primary transition-colors flex items-center justify-center" style={{ width: 28, height: 28 }}>
            <Smile className="w-3.5 h-3.5" />
          </button>
          {showEmojiPicker && (
            <div className="absolute top-full left-0 mt-1 z-50">
              <EmojiPicker
                onEmojiClick={(emojiData: { emoji: string }) => insertEmoji(emojiData.emoji)}
                theme={theme === 'dark' ? EmojiPickerTheme.DARK : EmojiPickerTheme.LIGHT}
                emojiStyle={EmojiStyle.NATIVE}
                width={300}
                height={360}
                searchDisabled={false}
                skinTonesDisabled
                lazyLoadEmojis
                previewConfig={{ showPreview: false }}
              />
            </div>
          )}
        </div>

        {/* Divider */}
        <span className="w-px h-4 bg-border mx-1" />

        {/* Bold */}
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('bold')} title="Bold" className={toolbarBtnCls(activeFormats.has('bold'))}>
          <Bold className="w-3.5 h-3.5" />
        </button>

        {/* Italic */}
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('italic')} title="Italic" className={toolbarBtnCls(activeFormats.has('italic'))}>
          <Italic className="w-3.5 h-3.5" />
        </button>

        {/* Underline */}
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('underline')} title="Underline" className={toolbarBtnCls(activeFormats.has('underline'))}>
          <Underline className="w-3.5 h-3.5" />
        </button>

        {/* Strikethrough */}
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('strikethrough')} title="Strikethrough" className={toolbarBtnCls(activeFormats.has('strikethrough'))}>
          <Strikethrough className="w-3.5 h-3.5" />
        </button>

        {/* Link */}
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('link')} title="Link" className={toolbarBtnCls(activeFormats.has('link'))}>
          <LinkIcon className="w-3.5 h-3.5" />
        </button>

        {/* Spoiler / Hide */}
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('spoiler')} title="Spoiler" className={toolbarBtnCls(activeFormats.has('spoiler'))}>
          <EyeOff className="w-3.5 h-3.5" />
        </button>

        {/* Code */}
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('code')} title="Inline Code" className={toolbarBtnCls(activeFormats.has('code'))}>
          <Code className="w-3.5 h-3.5" />
        </button>

        {/* Blockquote */}
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('blockquote')} title="Blockquote" className={toolbarBtnCls(activeFormats.has('blockquote'))}>
          <Quote className="w-3.5 h-3.5" />
        </button>

        {/* Mention */}
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('mention')} title="Mention" className="p-1.5 rounded hover:bg-bg-primary text-text-muted hover:text-text-primary transition-colors">
          <AtSign className="w-3.5 h-3.5" />
        </button>
      </div>

      {gifPreview && (
        <div className="relative inline-block mb-2">
          <Image
            src={gifPreview.previewUrl}
            alt={gifPreview.title}
            width={160}
            height={120}
            unoptimized
            className="rounded-lg object-cover border border-border"
            style={{ maxWidth: '160px', height: 'auto' }}
          />
          <button
            type="button"
            onClick={removeGif}
            className="absolute -top-2 -right-2 flex items-center justify-center w-6 h-6 rounded-full bg-bg-primary border border-border text-text-muted hover:text-danger transition-colors"
            aria-label="Remove GIF"
            title="Remove GIF"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <div className="relative">
        {editorEmpty && (
          <span className="absolute top-3 left-4 text-sm text-text-dim pointer-events-none select-none z-10">
            {isInline ? 'Add a reply...' : 'Share your thoughts...'}
          </span>
        )}
        <div
          ref={bodyRef}
          id={isInline ? 'reply-textarea' : 'main-textarea'}
          contentEditable
          suppressContentEditableWarning
          onInput={handleContentEditableInput}
          onKeyUp={updateActiveFormats}
          onMouseUp={updateActiveFormats}
          onFocus={updateActiveFormats}
          className={editorCls}
          style={{ minHeight: isInline ? '60px' : '80px' }}
        />
      </div>

      {errors.body && <p className="text-xs text-danger mt-1">{String(errors.body.message)}</p>}

      <div className="flex items-center justify-end gap-2 mt-2">
        {isInline && (
          <Button type="button" variant="ghost" size="sm" onClick={() => { setReplyTo(null); reset({ body: '' }); setGifPreview(null); clearEditor(); }}>Cancel</Button>
        )}
        <Button type="submit" size="sm" loading={isSubmitting}>{isInline ? 'Reply' : 'Post Comment'}</Button>
      </div>
    </form>
  );
}

export default function CommentSection({ articleId }: CommentSectionProps) {
  const { isAuthenticated, user } = useAuthStore();
  const { addToast, theme } = useUIStore();
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [sort, setSort] = useState<CommentSort>('new');
  const [editorEmpty, setEditorEmpty] = useState(true);

  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifQuery, setGifQuery] = useState('');
  const [gifResults, setGifResults] = useState<TenorGif[]>([]);
  const [gifLoading, setGifLoading] = useState(false);
  const [gifPreview, setGifPreview] = useState<TenorGif | null>(null);
  const gifPickerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  // Last known cursor position inside the editor — clicking an emoji in the
  // picker blurs the contentEditable, so window.getSelection() alone would
  // lose track of where to insert it.
  const lastRangeRef = useRef<Range | null>(null);

  const cacheKey = `comments-${articleId}-${sort}`;
  const { data, mutate, isLoading } = useSWR(
    cacheKey,
    () => fetchComments(articleId, { sort }).then(r => r.data || [])
  );

  const comments = data || [];
  const topLevelComments = comments.filter(c => !c.parentId);
  const totalCount = countAllComments(topLevelComments);

  const activeSchema = isAuthenticated ? schema : guestSchema;
  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<z.infer<typeof guestSchema>>({
    resolver: zodResolver(activeSchema) as any,
  });

  useEffect(() => {
    if (!showGifPicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (gifPickerRef.current && !gifPickerRef.current.contains(e.target as Node)) {
        setShowGifPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showGifPicker]);

  useEffect(() => {
    if (!showEmojiPicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  useEffect(() => {
    if (!showGifPicker) return;
    setGifLoading(true);
    const timeout = setTimeout(() => {
      searchTenorGifs(gifQuery || 'trending').then(res => {
        setGifResults(res.data?.results || []);
        setGifLoading(false);
      });
    }, 400);
    return () => clearTimeout(timeout);
  }, [gifQuery, showGifPicker]);

  const clearEditor = () => {
    if (bodyRef.current) bodyRef.current.innerHTML = '';
    setEditorEmpty(true);
  };

  const selectGif = (gif: TenorGif) => {
    setGifPreview(gif);
    setShowGifPicker(false);
    // A GIF with no caption still needs a non-empty body to pass validation —
    // a lone space renders as nothing once a caption is typed it's overwritten.
    if (editorEmpty) setValue('body', ' ');
  };

  const removeGif = () => {
    setGifPreview(null);
    const markdown = bodyRef.current ? htmlToMarkdown(bodyRef.current) : '';
    if (!markdown.trim()) setValue('body', '');
  };

  const handleContentEditableInput = () => {
    const el = bodyRef.current;
    if (!el) return;
    const markdown = htmlToMarkdown(el);
    const empty = !markdown.trim();
    setEditorEmpty(empty);
    setValue('body', empty && gifPreview ? ' ' : markdown, { shouldValidate: false });
  };

  const insertEmoji = (emoji: string) => {
    const el = bodyRef.current;
    if (!el) return;

    // Restore the saved range BEFORE focusing — calling el.focus() first resets
    // the browser's selection to offset 0 (start of div), which is why emojis
    // were always landing at the beginning. We set the selection first, then
    // focus so the browser keeps our programmatic range intact.
    const sel = window.getSelection();
    if (!sel) return;

    const savedRange = lastRangeRef.current;
    if (savedRange && el.contains(savedRange.startContainer)) {
      sel.removeAllRanges();
      sel.addRange(savedRange);
    } else {
      // No saved range (editor never focused) — collapse to end as fallback.
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }

    el.focus();

    const range = sel.getRangeAt(0);
    const node = document.createTextNode(emoji);
    range.deleteContents();
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    lastRangeRef.current = range.cloneRange();

    handleContentEditableInput();
    setShowEmojiPicker(false);
  };

  // Tracks which formats apply at the current cursor position, so toolbar buttons
  // can show whether a format is "on" for text about to be typed.
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());

  const updateActiveFormats = useCallback(() => {
    const el = bodyRef.current;
    const sel = window.getSelection();
    if (!el || !sel || sel.rangeCount === 0 || !sel.anchorNode || !el.contains(sel.anchorNode)) {
      setActiveFormats(new Set());
      return;
    }
    lastRangeRef.current = sel.getRangeAt(0).cloneRange();
    const next = new Set<string>();
    for (const [format, predicate] of Object.entries(FORMAT_PREDICATES)) {
      const nativeCommand = NATIVE_COMMANDS[format];
      // Native commands toggle a "sticky" format for a bare cursor before any
      // character (and thus any wrapper element) exists — queryCommandState
      // reflects that, where walking the DOM for a wrapper would not.
      const isActive = nativeCommand
        ? document.queryCommandState(nativeCommand)
        : !!findFormatAncestor(sel.anchorNode, el, predicate);
      if (isActive) next.add(format);
    }
    setActiveFormats(next);
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', updateActiveFormats);
    return () => document.removeEventListener('selectionchange', updateActiveFormats);
  }, [updateActiveFormats]);

  const applyFormat = (type: 'bold' | 'italic' | 'underline' | 'strikethrough' | 'code' | 'link' | 'spoiler' | 'blockquote' | 'mention') => {
    const el = bodyRef.current;
    if (!el) return;
    el.focus();

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    if (type === 'mention') {
      const range = sel.getRangeAt(0);
      const name = window.prompt('Enter username to mention:');
      if (!name) return;
      const mention = document.createTextNode(`@${name} `);
      range.deleteContents();
      range.insertNode(mention);
      sel.collapse(mention, mention.length);
      const markdown = htmlToMarkdown(el);
      setEditorEmpty(!markdown.trim());
      setValue('body', markdown, { shouldValidate: false });
      return;
    }

    const nativeCommand = NATIVE_COMMANDS[type];
    if (nativeCommand) {
      document.execCommand('styleWithCSS', false, 'false');
      document.execCommand(nativeCommand);
      const markdown = htmlToMarkdown(el);
      setEditorEmpty(!markdown.trim());
      setValue('body', markdown, { shouldValidate: false });
      updateActiveFormats();
      return;
    }

    const range = sel.getRangeAt(0);
    const selectedText = range.toString();

    // Toggle off: cursor/selection sits inside an existing run of this format —
    // unwrap the whole run rather than wrapping it again.
    const existing = findFormatAncestor(range.startContainer, el, FORMAT_PREDICATES[type]);
    if (existing) {
      unwrapElement(existing);
      sel.removeAllRanges();
      const markdown = htmlToMarkdown(el);
      setEditorEmpty(!markdown.trim());
      setValue('body', markdown, { shouldValidate: false });
      updateActiveFormats();
      return;
    }

    let wrapper: HTMLElement;
    if (type === 'link') {
      const url = window.prompt('Enter URL:');
      if (!url) return;
      wrapper = document.createElement('a');
      (wrapper as HTMLAnchorElement).href = url;
      wrapper.setAttribute('target', '_blank');
      wrapper.setAttribute('rel', 'noopener noreferrer nofollow');
      wrapper.className = 'text-accent underline cursor-pointer';
    } else if (type === 'code') {
      wrapper = document.createElement('code');
      wrapper.className = 'px-1 py-0.5 rounded bg-bg-surface text-[0.85em] font-mono';
    } else if (type === 'spoiler') {
      wrapper = document.createElement('span');
      wrapper.dataset.spoiler = '1';
      wrapper.className = 'bg-text-primary text-text-primary rounded px-0.5 cursor-pointer hover:bg-transparent transition-colors select-none';
      wrapper.title = 'Spoiler — click to reveal';
    } else {
      wrapper = document.createElement('span');
      wrapper.dataset.quote = '1';
      wrapper.className = 'inline-block border-l-2 border-border pl-2 text-text-muted italic';
    }

    if (range.collapsed) {
      // No selection — insert a zero-width placeholder so the cursor lands inside
      // the wrapper and subsequently typed characters land inside it too.
      const placeholder = document.createTextNode(ZERO_WIDTH_SPACE);
      wrapper.appendChild(placeholder);
      range.insertNode(wrapper);
      const newRange = document.createRange();
      newRange.setStart(placeholder, placeholder.length);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    } else {
      try {
        range.surroundContents(wrapper);
      } catch {
        range.deleteContents();
        wrapper.textContent = selectedText || (type === 'link' ? 'link text' : '');
        range.insertNode(wrapper);
      }
      sel.collapse(wrapper, wrapper.childNodes.length);
    }

    const markdown = htmlToMarkdown(el);
    setEditorEmpty(!markdown.trim());
    setValue('body', markdown, { shouldValidate: false });
    updateActiveFormats();
  };

  const onSubmit = async (formData: z.infer<typeof guestSchema>) => {
    const payload: Record<string, unknown> = {
      articleId,
      body: formData.body,
      parentId: replyTo || undefined,
      website: (formData as { website?: string }).website || '',
    };

    if (gifPreview) {
      payload.gifUrl = gifPreview.url;
      payload.gifId = gifPreview.id;
    }

    if (!isAuthenticated) {
      payload.authorName = (formData as { authorName?: string }).authorName;
      payload.authorEmail = (formData as { authorEmail?: string }).authorEmail;
    }

    const res = await createComment(payload);

    if (res.success) {
      const returnedComment = res.data as Comment;
      const isPending = returnedComment?.status === 'PENDING';

      if (!isPending) {
        const newComment = {
          ...returnedComment,
          id: returnedComment?.id || Date.now().toString(),
          body: payload.body as string,
          gifUrl: gifPreview?.url ?? null,
          gifId: gifPreview?.id ?? null,
          parentId: replyTo,
          articleId,
          authorId: user?.id || '',
          authorName: user?.displayName || (payload.authorName as string) || 'Guest',
          authorEmail: user?.email || (payload.authorEmail as string) || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'APPROVED',
          upvotes: 0,
          downvotes: 0,
          isPinned: false,
          author: user ? { id: user.id, displayName: user.displayName, avatarUrl: user.avatarUrl || null, username: user.username || '', isStaff: ['AUTHOR', 'EDITOR', 'ADMIN'].includes(user.role) } : undefined,
          replies: [],
          reactions: {},
          userReactions: [],
          _count: { replies: 0 },
        } as Comment;

        mutate(
          (currentComments: Comment[] = []) => {
            if (!replyTo) {
              // New top-level comment. Newest-first is the default sort, so put it
              // at the top to match — otherwise it'd flash at the bottom and then
              // jump to the top once the revalidated, server-sorted data lands.
              return sort === 'new' ? [newComment, ...currentComments] : [...currentComments, newComment];
            }
            // New reply: insert into whichever comment (at any nesting depth)
            // was actually replied to.
            return insertReply(currentComments, replyTo, newComment);
          },
          { revalidate: true }
        );
        addToast({ type: 'success', message: 'Comment posted!' });
      } else {
        mutate(comments, { revalidate: false });
        addToast({ type: 'info', message: 'Your comment has been submitted and is awaiting moderation.' });
      }

      reset({ body: '' });
      clearEditor();
      setReplyTo(null);
      setGifPreview(null);
    } else {
      addToast({ type: 'error', message: res.error || 'Failed to post comment' });
    }
  };

  const handleReplyClick = (id: string, authorName: string) => {
    setReplyTo(id);
    const mention = `@${authorName} `;
    setValue('body', mention);
    setEditorEmpty(false);
    setTimeout(() => {
      const el = bodyRef.current;
      if (!el) return;
      el.textContent = mention;
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(el);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
      el.focus();
    }, 50);
  };

  const editorCls = 'w-full px-4 py-3 bg-bg-primary border border-border rounded-xl text-sm text-text-primary focus:border-accent outline-none [&_strong]:font-bold [&_em]:italic [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:bg-bg-surface [&_code]:text-[0.85em] [&_code]:font-mono [&_a]:text-accent [&_a]:underline';

  const toolbarBtnCls = (active: boolean) => cn(
    'p-1.5 rounded hover:bg-bg-primary transition-colors',
    active ? 'text-accent bg-bg-primary' : 'text-text-muted hover:text-text-primary'
  );

  const formProps = {
    isAuthenticated,
    register,
    errors,
    isSubmitting,
    handleSubmit,
    onSubmit,
    reset,
    showGifPicker,
    setShowGifPicker,
    gifPickerRef,
    gifQuery,
    setGifQuery,
    gifLoading,
    gifResults,
    selectGif,
    gifPreview,
    removeGif,
    showEmojiPicker,
    setShowEmojiPicker,
    emojiPickerRef,
    insertEmoji,
    theme,
    activeFormats,
    toolbarBtnCls,
    applyFormat,
    editorEmpty,
    bodyRef,
    handleContentEditableInput,
    updateActiveFormats,
    editorCls,
    setReplyTo,
    setGifPreview,
    clearEditor,
  };

  return (
    <section className="mt-8 pt-8 border-t border-border" id="comments">
      <h3 className="text-lg font-bold text-text-primary mb-6 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-accent-light" />
        Comments ({totalCount})
      </h3>

      {!replyTo && (
        isAuthenticated ? <CommentForm isInline={false} {...formProps} /> : (
          <div className="mb-8 space-y-4">
            <CommentForm isInline={false} {...formProps} />
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-text-dim">OR</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="p-4 rounded-xl bg-bg-surface border border-border text-center">
              <p className="text-sm text-text-muted mb-3">Sign in to get notified of replies</p>
              <Link href="/auth/login">
                <Button size="sm" variant="outline" icon={<LogIn className="w-4 h-4" />}>Sign In</Button>
              </Link>
            </div>
          </div>
        )
      )}

      {topLevelComments.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-text-dim">Sort by:</span>
          {SORT_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setSort(tab.value)}
              className={`genre-tag ${sort === tab.value ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="shimmer h-20 rounded-xl" />
          ))}
        </div>
      ) : topLevelComments.length > 0 ? (
        <div className="divide-y divide-border">
          {topLevelComments.map(comment => (
            <div key={comment.id} className="py-6 first:pt-0 last:pb-0">
              <CommentItem
                comment={comment}
                onReply={handleReplyClick}
                depth={0}
                replyToId={replyTo}
                renderReplyForm={(isInline) => <CommentForm isInline={isInline} {...formProps} />}
                cacheKey={cacheKey}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <MessageSquare className="w-10 h-10 text-border mx-auto mb-3" />
          <p className="text-sm text-text-muted">No comments yet. Be the first to share your thoughts!</p>
        </div>
      )}
    </section>
  );
}
