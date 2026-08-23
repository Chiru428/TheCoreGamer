/**
 * RichTextEditor v2.4 — AAA Gaming CMS Editor
 *
 * v2.4 BUG FIXES (audit pass):
 * - Fix #1: Added SpoilerBlockNode, CorrectionNoticeNode, PullQuoteNode to extensions array
 *   (they had slash commands registered but TipTap couldn't parse/save their content)
 * - Fix #2: Twitch Clip embed now uses window.location.hostname (was hardcoded 'localhost')
 * - Fix #3: findNext() now uses ProseMirror node-walking with proper positions + wrap-around
 * - Fix #4: Custom badge inputs use controlled React state instead of document.getElementById
 * - Fix #5: H5 and H6 added to toolbar block-type dropdown
 * - Fix #6: H4, H5, H6 and Task List added to slash command menu
 * - Fix #7: LineHeightInput now reads/writes line-height on headings as well as paragraphs
 * - Fix #11: Duplicate InlineProsConsSlashCommand removed (kept atomic ProsConsNode version)
 * - Fix #12: postTitle added to SEO Panel useEffect dep array (slug now updates on async title)
 * - Fix #13: .twitch-embed and .youtube-embed CSS moved to shared gaming-content.css
 * - Fix #16: Horizontal Rule button added to toolbar
 * - Fix #20: Insert Image by URL button added to toolbar
 * - Fix #21: addToast removed from filteredSlash useMemo deps
 * - Fix #22: replaceAll() now walks ProseMirror text nodes (was corrupting href/alt via raw HTML replace)
 * - Fix #23: Version label updated to v2.4
 *
 * v2.2 CHANGES:
 * - Extracted DOMPurify config to shared @/lib/sanitize
 * - Added gaming-content.css as shared stylesheet (editor + frontend)
 * - Added TypographyEngine extension (presets, gradients, text effects)
 * - Added LayoutNodes (columns, comparison, feature grid, tabs, accordion, hero)
 * - Added KeyboardShortcuts extension
 * - Added 30+ new slash commands (Typography, Layout, Gaming, Media)
 * - Added gaming block builders (benchmark, patch notes, system req, timeline, FAQ, etc.)
 * - Wrapped EditorContent in ErrorBoundary
 * - Preview mode now uses gaming-content class (shared with frontend)
 * - Removed duplicate gaming-preview CSS
 *
 * FIXED in v2.1:
 * - Removed tiptap-markdown (was escaping HTML into code blocks)
 * - Fixed StarterKit codeBlock conflict with CodeBlockLowlight
 * - Fixed insertContent() HTML rendering via parseOptions
 * - Fixed setContent() to use proper HTML parsing
 * - Installed DOMPurify for real XSS sanitization
 * - Added HTML node support: div, section, article, figure, figcaption
 * - Fixed paste handling to render HTML visually
 * - Fixed HTML source mode round-trip (preserve classes/styles/layouts)
 */

import { Spinner } from '@/components/ui/Spinner';
import {
  useMemo, useState, useRef, useEffect, useCallback, memo,
} from 'react';
import {
  useEditor, EditorContent, Extension, Node as TiptapNode, Mark as TiptapMark,
  JSONContent, type Editor,
} from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import { BulletList } from '@tiptap/extension-list/bullet-list';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { TextStyle } from '@tiptap/extension-text-style';
import { ThemeColor } from '@/extensions/ThemeColor';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import FontSize from '@/extensions/FontSize';
import FontWeight from '@/extensions/FontWeight';
import LetterSpacing from '@/extensions/LetterSpacing';
import CustomParagraph from '@/extensions/CustomParagraph';
import ImageGrid from '@/extensions/ImageGrid';
import Callout from '@/extensions/Callout';
import ImageGallery from '@/extensions/ImageGallery';
import GamingBadge from '@/extensions/GamingBadge';
import CollapsibleSection from '@/extensions/CollapsibleSection';
import { ThemeColorPicker } from './ThemeColorPicker';
import { BubbleToolbar } from './BubbleToolbar';
import { TEXT_COLOR_PALETTE } from '@/config/textColors';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CharacterCount from '@tiptap/extension-character-count';
import Youtube from '@tiptap/extension-youtube';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { Markdown } from 'tiptap-markdown';
import { common, createLowlight } from 'lowlight';
import { sanitizeHTML, flattenRedundantSpans, convertMarkdownTaskLists, sanitizeUrl } from '@/lib/sanitize';
import { marked } from 'marked';
import { generateHeadingId, markedHeadingIdExtension } from '../../lib/heading-id';
import customHeadingId from 'marked-custom-heading-id';
import Heading from '@tiptap/extension-heading';
import AdSlotNode from '@/extensions/monetization/AdSlotNode';
import { useAuthStore } from '@/store/authStore';

marked.use(markedHeadingIdExtension());
marked.use(customHeadingId());

const CustomLink = Link.extend({
  addAttributes() {
    return {
      href: { default: null },
      target: {
        default: this.options.HTMLAttributes.target,
        parseHTML: element => element.getAttribute('target'),
        renderHTML: attributes => {
          const href = attributes.href || '';
          if (href.startsWith('#') || href.startsWith('/')) return { target: null };
          return { target: attributes.target || '_blank' };
        },
      },
      rel: {
        default: this.options.HTMLAttributes.rel,
        parseHTML: element => element.getAttribute('rel'),
        renderHTML: attributes => {
          const href = attributes.href || '';
          if (href.startsWith('#') || href.startsWith('/')) return { rel: null };
          return { rel: attributes.rel || 'noopener noreferrer nofollow' };
        },
      },
      class: { default: null },
    };
  },
});

const CustomHeading = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      id: {
        default: null,
        parseHTML: element => element.getAttribute('id'),
        renderHTML: attributes => {
          if (!attributes.id) return {};
          return { id: attributes.id };
        },
      },
    };
  },
});

// Adds an opt-in "stacked card" mobile layout flag to tables. When enabled, the
// published page collapses the table into label/value cards on narrow screens
// (see ArticleBody + gaming-content.css). Desktop rendering is unchanged.
const CustomTable = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      mobileStacked: {
        default: false,
        parseHTML: element => element.getAttribute('data-mobile-stacked') === 'true',
        renderHTML: attributes => (attributes.mobileStacked ? { 'data-mobile-stacked': 'true' } : {}),
      },
    };
  },
});

import '@/extensions/coreSlashCommands';
import '@/extensions/mediaSlashCommands';
import { TypographyEngine, TYPOGRAPHY_PRESETS, applyTypographyPreset } from '@/extensions/TypographyEngine';
import { ColumnLayout, ColumnItem, ComparisonLayout, FeatureGrid, FeatureCard, TabsBlock, AccordionBlock, HeroSection } from '@/extensions/LayoutNodes';
import { 
  ReviewCardNode, ReviewCardSlashCommand,
  MentionedGameNode,
  BenchmarkCardNode, BenchmarkCardSlashCommand,
  PatchNotesNode, PatchNotesSlashCommand,
  SystemRequirementsNode, SystemRequirementsSlashCommand,
  ProsConsNode, ProsConsSlashCommand,
  DealCardNode, DealCardSlashCommand,
  TimelineNode, TimelineSlashCommand,
  FAQNode, FAQSlashCommand,
  ChangelogNode, ChangelogSlashCommand,
  VersionCompareNode, VersionCompareSlashCommand,
  BossCardNode, BossCardSlashCommand,
  BuildCardNode, BuildCardSlashCommand,
  // Fix #1: These three nodes were exported but never added to extensions[]
  SpoilerBlockNode,
  CorrectionNoticeNode,
  PullQuoteNode,
  VideoEmbed,
  AwardBadgeNode,
  StatCompareNode,
  LootTableNode,
  InlinePollNode,
  ModCardNode,
  VideoTimestampNode,
  SocialEmbedNode,
  SocialEmbedPastePrompt,
  NewsletterCtaNode,
  RelatedArticlesNode,
  HardwareSpecNode,
  PriceHistoryNode,
  ModLoadOrderNode,
  ControversyBlockNode,
  TierListNode,
  InteractiveMapNode,
  MapGenieEmbedNode,
  ComparisonTableNode,
  AchievementBlockNode,
  PriceCompareTableNode,
} from '@/extensions/gaming';
import { KeyboardShortcutsExtension } from '@/extensions/KeyboardShortcuts';
import { MarkdownPaste } from '@/extensions/MarkdownPaste';

import { WalkthroughContainerNode, WalkthroughStepNode, WalkthroughSlashCommand } from '@/extensions/WalkthroughNodes';
import { CustomImage } from '@/extensions/CustomImage';
import { ImagePlaceholderNode } from '@/extensions/ImagePlaceholder';
import BlockInsertModal, { BlockInsertModalConfig } from './BlockInsertModal';
import DragHandleOverlay from './DragHandleOverlay';
import ErrorBoundary from '@/components/ErrorBoundary';
import VideoUploader from './VideoUploader';
import '@/styles/gaming-content.css';
import { fetchAutosave, updateAutosave, deleteAutosave } from '@/lib/api';
import { buildImageInsertConfig } from '@/lib/image-insert-config';
import { slashRegistry, SlashItem } from '@/lib/slash-registry';
import { AD_ZONES } from '@/lib/constants';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';
import useSWR from 'swr';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Minus, Image as ImageIcon, Link as LinkIcon, Table as TableIcon,
  AlignLeft, AlignCenter, AlignRight, Undo, Redo, Highlighter, Palette,
  CheckSquare, Video as VideoIcon, Search, Maximize2, Minimize2, Terminal,
  ListTree, Subscript as SubscriptIcon, Superscript as SuperscriptIcon,
  BarChart2, Plus, X, AlertTriangle, Info, Code2,
  Eye, Monitor, Tablet, Smartphone, Download, FileText, Copy, Sparkles,
  Star, FileCode, Zap, Globe, EyeOff, History, Type, RotateCcw,
  Target, Columns, ShieldAlert, ChevronDown, Tag, BookOpen, Gamepad2,
} from 'lucide-react';
import { ArticlePicker, PickedArticle } from '../../extensions/gaming/shared/ArticlePicker';
import { GamePicker, PickedGame } from '../../extensions/gaming/shared/GamePicker';

const lowlight = createLowlight(common);

// --- Google Fonts -------------------------------------------------------------

const GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?' +
  'family=Rajdhani:wght@400;500;600;700' +
  '&family=Orbitron:wght@400;500;700' +
  '&family=Bebas+Neue' +
  '&family=Poppins:ital,wght@0,400;0,500;0,600;0,700;1,400' +
  '&family=Exo+2:wght@400;500;600;700' +
  '&family=Oxanium:wght@400;600;700' +
  '&family=Manrope:wght@400;500;600;700' +
  '&family=JetBrains+Mono:wght@400;500;600' +
  '&family=Share+Tech+Mono' +
  '&family=Audiowide' +
  '&family=Chakra+Petch:wght@400;500;600;700' +
  '&family=Teko:wght@400;500;600' +
  '&family=Russo+One' +
  '&family=Titillium+Web:wght@400;600;700' +
  '&family=Space+Grotesk:wght@400;500;600;700' +
  '&family=Sora:wght@400;500;600;700' +
  '&family=Barlow+Condensed:wght@400;500;600;700' +
  '&family=Michroma' +
  '&family=Kanit:wght@400;500;600;700' +
  '&family=Gibson:wght@400;500;600;700' +
  '&family=Archivo+Black' +
  '&family=Montserrat:wght@400;500;600;700' +
  '&family=Anton' +
  '&family=Oswald:wght@400;500;600;700' +
  '&family=Geist:wght@400;500;600;700' +
  '&family=Outfit:wght@400;500;600;700' +
  '&family=Urbanist:wght@400;500;600;700' +
  '&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400' +
  '&family=DM+Sans:wght@400;500;600;700' +
  '&family=Prompt:wght@400;500;600;700' +
  '&family=Syncopate:wght@400;700' +
  '&family=Aldrich' +
  '&family=Tomorrow:wght@400;500;600;700' +
  '&family=Quantico:wght@400;700' +
  '&family=Righteous' +
  '&family=Orbit' +
  '&family=Archivo:wght@400;500;600;700' +
  '&family=Work+Sans:wght@400;500;600;700' +
  '&family=Red+Hat+Display:wght@400;500;600;700' +
  '&family=League+Spartan:wght@400;500;600;700' +
  '&family=Fjalla+One' +
  '&family=Barlow:wght@400;500;600;700' +
  '&family=Noto+Sans:wght@400;500;600;700' +
  '&family=Inter:wght@400;500;600;700' +
  '&family=Big+Shoulders+Display:wght@400;700' +
  '&family=Black+Ops+One' +
  '&family=Source+Sans+3:ital,wght@0,400;0,600;1,400' +
  '&family=Hind:wght@400;600' +
  '&family=Plus+Jakarta+Sans:wght@400;600;700' +
  '&family=Nunito+Sans:wght@400;600;700' +
  '&family=Figtree:wght@400;600;700' +
  '&family=Mulish:wght@400;600;700' +
  '&family=Atkinson+Hyperlegible:wght@400;700' +
  '&family=Merriweather:ital,wght@0,400;0,700;1,400' +
  '&family=Lora:ital,wght@0,400;0,600;1,400' +
  '&family=Playfair+Display:ital,wght@0,400;0,700;1,400' +
  '&family=IBM+Plex+Serif:ital,wght@0,400;0,600;1,400' +
  '&family=Newsreader:ital,wght@0,400;0,600;1,400' +
  '&family=Spectral:ital,wght@0,400;0,600;1,400' +
  '&family=Fira+Code:wght@400;600' +
  '&family=IBM+Plex+Mono:wght@400;600' +
  '&display=swap';

// --- Color palette -------------------------------------------------------------

const COLOR_PALETTE = [
  '#ffffff', '#e8e8e8', '#c0c0c0', '#969696', '#646464', '#323232', '#1a1a1a', '#000000',
  '#ff0000', '#ff3333', '#ff6666', '#ff4500', '#ff7043', '#ff9800', '#ffb300', '#ffd600',
  '#ffff00', '#ccff00', '#66ff00', '#00e676', '#00c853', '#00bfa5', '#00acc1', '#0288d1',
  '#0000ff', '#1565c0', '#283593', '#4a148c', '#6a1b9a', '#8e24aa', '#c0ca33', '#f06292',
  '#00ffff', '#00ff9f', '#39ff14', '#ff00ff', '#ff1744', '#ff6d00', '#ffea00', '#76ff03',
  'var(--ed-accent)', '#00B8D9', '#0097A7', '#006978', '#6C63FF', '#E040FB', '#FF6B9D', '#FF9A3C',
];

// --- Font groups --------------------------------------------------------------

const FONT_GROUPS = [
  {
    label: 'Gaming & Display Stacks',
    fonts: [
      { label: 'Barlow Condensed (Oswald)', value: '"Barlow Condensed", "Oswald", sans-serif' },
      { label: 'Oswald (Barlow Condensed)', value: '"Oswald", "Barlow Condensed", sans-serif' },
      { label: 'Rajdhani (Teko)', value: '"Rajdhani", "Teko", sans-serif' },
      { label: 'Orbitron (Audiowide)', value: '"Orbitron", "Audiowide", sans-serif' },
      { label: 'Big Shoulders Display', value: '"Big Shoulders Display", "Barlow Condensed", sans-serif' },
      { label: 'Bebas Neue (Anton)', value: '"Bebas Neue", "Anton", sans-serif' },
      { label: 'Black Ops One', value: '"Black Ops One", sans-serif' },
      { label: 'Chakra Petch (Quantico)', value: '"Chakra Petch", "Quantico", sans-serif' },
      { label: 'Titillium Web (Exo 2)', value: '"Titillium Web", "Exo 2", sans-serif' },
    ],
  },
  {
    label: 'Modern Clean Body & UI Stacks',
    fonts: [
      { label: 'Acumin Pro', value: '"acumin-pro", system-ui, sans-serif' },
      { label: 'Acumin Pro Condensed', value: '"acumin-pro-condensed", sans-serif' },
      { label: 'Gibson', value: '"Gibson", sans-serif' },
      { label: 'Inter (DM Sans)', value: '"Inter", "DM Sans", sans-serif' },
      { label: 'Manrope (Outfit)', value: '"Manrope", "Outfit", sans-serif' },
      { label: 'IBM Plex Sans (Source Sans 3)', value: '"IBM Plex Sans", "Source Sans 3", sans-serif' },
      { label: 'Barlow (Hind)', value: '"Barlow", "Hind", sans-serif' },
      { label: 'Plus Jakarta Sans (Nunito)', value: '"Plus Jakarta Sans", "Nunito Sans", sans-serif' },
      { label: 'Source Sans 3 (System UI)', value: '"Source Sans 3", system-ui, sans-serif' },
      { label: 'Figtree (Mulish)', value: '"Figtree", "Mulish", sans-serif' },
      { label: 'Atkinson Hyperlegible', value: '"Atkinson Hyperlegible", sans-serif' },
      { label: 'Space Grotesk (Sora)', value: '"Space Grotesk", "Sora", sans-serif' },
    ],
  },
  {
    label: 'Classic Editorial Serif Stacks',
    fonts: [
      { label: 'Merriweather (Georgia)', value: '"Merriweather", Georgia, serif' },
      { label: 'Lora (Playfair Display)', value: '"Lora", "Playfair Display", serif' },
      { label: 'IBM Plex Serif', value: '"IBM Plex Serif", serif' },
      { label: 'Newsreader (Spectral)', value: '"Newsreader", "Spectral", serif' },
    ],
  },
  {
    label: 'Monospace, Terminal & Code Stacks',
    fonts: [
      { label: 'JetBrains Mono', value: '"JetBrains Mono", monospace' },
      { label: 'Fira Code', value: '"Fira Code", monospace' },
      { label: 'IBM Plex Mono', value: '"IBM Plex Mono", monospace' },
    ],
  },
  {
    label: 'System / Web Safe',
    fonts: [
      { label: 'Lucida Grande', value: '"Lucida Grande", "Trebuchet MS", Verdana, Arial, sans-serif' },
      { label: 'Trebuchet MS', value: '"Trebuchet MS", "Lucida Grande", Verdana, Arial, sans-serif' },
      { label: 'Verdana', value: 'Verdana, "Lucida Grande", "Trebuchet MS", Arial, sans-serif' },
      { label: 'Arial', value: 'Arial, "Lucida Grande", "Trebuchet MS", Verdana, sans-serif' },
    ],
  },
];

// --- Accent colour — CSS var() refs so both dark and light theme work ---------
// These map to --ed-* custom properties defined in globals.css.
// Dark values are the defaults; [data-theme="light"] .gaming-editor overrides them.

const ACCENT = 'var(--ed-accent)';
const ACCENT_DIM = 'var(--ed-accent-dim)';
const BG_BASE = 'var(--ed-bg)';
const BG_SURFACE = 'var(--ed-surface)';
const BG_ELEVATED = 'var(--ed-elevated)';
const BORDER = 'var(--ed-border)';

// --- sanitizeHTML imported from @/lib/sanitize -------------------------------

// --- TipTap custom extensions -------------------------------------------------

const FontFamily = Extension.create({
  name: 'fontFamily',
  addOptions() { return { types: ['textStyle'] }; },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        fontFamily: {
          default: null,
          parseHTML: (el: HTMLElement) => el.style.fontFamily || null,
          renderHTML: (attrs: any) => attrs.fontFamily ? { style: `font-family: ${attrs.fontFamily}` } : {},
        },
      },
    }];
  },
  addCommands() {
    return {
      setFontFamily: (fontFamily: string) => ({ chain }: any) =>
        chain().setMark('textStyle', { fontFamily }).run(),
      unsetFontFamily: () => ({ chain }: any) =>
        chain().setMark('textStyle', { fontFamily: null }).removeEmptyTextStyle().run(),
    };
  },
});

const CustomBulletList = BulletList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      bullet: {
        default: null,
        parseHTML: element => element.getAttribute('data-bullet') || null,
        renderHTML: attributes => {
          if (!attributes.bullet) {
            return {};
          }
          return {
            'data-bullet': attributes.bullet,
            style: `--list-bullet: "${attributes.bullet}"`,
          };
        },
      },
    };
  },
});

const CustomStyles = Extension.create({
  name: 'customStyles',
  addGlobalAttributes() {
    return [{
      types: ['blockquote', 'paragraph', 'heading', 'horizontalRule'],
      attributes: {
        class: {
          default: null,
          parseHTML: (el: HTMLElement) => el.getAttribute('class'),
          renderHTML: (attrs: any) => attrs.class ? { class: attrs.class } : {},
        },
        // Preserve inline style (e.g. margin-left from indentation) so it
        // round-trips through TipTap JSON and renders on the public page.
        style: {
          default: null,
          parseHTML: (el: HTMLElement) => {
            let style = el.getAttribute('style');
            if (style && ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(el.tagName.toUpperCase())) {
              style = style.replace(/line-height\s*:[^;]+;?/gi, '').trim();
            }
            return style || null;
          },
          renderHTML: (attrs: any) => attrs.style ? { style: attrs.style } : {},
        },
      },
    }];
  },
});

// ✅ FIX 9: Comprehensive HTML container nodes so TipTap parses them as DOM
// instead of falling back to text nodes

/** Generic block wrapper that round-trips class + style attributes */
function makeBlockNode(name: string, tag: string) {
  return TiptapNode.create({
    name,
    group: 'block',
    content: 'block+',
    defining: true,
    addAttributes() {
      return {
        class: { default: null, parseHTML: (el: HTMLElement) => el.getAttribute('class'), renderHTML: (a: any) => a.class ? { class: a.class } : {} },
        style: { default: null, parseHTML: (el: HTMLElement) => el.getAttribute('style'), renderHTML: (a: any) => a.style ? { style: a.style } : {} },
        'data-type': { default: null, parseHTML: (el: HTMLElement) => el.getAttribute('data-type'), renderHTML: (a: any) => a['data-type'] ? { 'data-type': a['data-type'] } : {} },
      };
    },
    parseHTML() { return [{ tag }]; },
    renderHTML({ HTMLAttributes }: any) { return [tag, HTMLAttributes, 0]; },
  });
}

const CustomDiv = makeBlockNode('customDiv', 'div');
const CustomSection = makeBlockNode('customSection', 'section');
const CustomArticle = makeBlockNode('customArticle', 'article');
const CustomFigure = makeBlockNode('customFigure', 'figure');

const CustomIframe = TiptapNode.create({
  name: 'customIframe',
  group: 'block',
  content: '',
  defining: true,
  addAttributes() {
    return {
      src: { default: null, parseHTML: (el: HTMLElement) => el.getAttribute('src'), renderHTML: (a: any) => a.src ? { src: a.src } : {} },
      frameborder: { default: null, parseHTML: (el: HTMLElement) => el.getAttribute('frameborder'), renderHTML: (a: any) => a.frameborder ? { frameborder: a.frameborder } : {} },
      allowfullscreen: { default: null, parseHTML: (el: HTMLElement) => el.getAttribute('allowfullscreen'), renderHTML: (a: any) => a.allowfullscreen ? { allowfullscreen: a.allowfullscreen } : {} },
      scrolling: { default: null, parseHTML: (el: HTMLElement) => el.getAttribute('scrolling'), renderHTML: (a: any) => a.scrolling ? { scrolling: a.scrolling } : {} },
      height: { default: null, parseHTML: (el: HTMLElement) => el.getAttribute('height'), renderHTML: (a: any) => a.height ? { height: a.height } : {} },
      width: { default: null, parseHTML: (el: HTMLElement) => el.getAttribute('width'), renderHTML: (a: any) => a.width ? { width: a.width } : {} },
      class: { default: null, parseHTML: (el: HTMLElement) => el.getAttribute('class'), renderHTML: (a: any) => a.class ? { class: a.class } : {} }
    }
  },
  parseHTML() {
    return [{ tag: 'iframe' }]
  },
  renderHTML({ HTMLAttributes }: any) {
    return ['iframe', HTMLAttributes]
  }
});

/** Inline span that preserves style/class (needed for review card inline spans) */
const CustomSpan = TiptapNode.create({
  name: 'customSpan',
  group: 'inline',
  inline: true,
  content: 'inline*',
  addAttributes() {
    return {
      class: { default: null, parseHTML: (el: HTMLElement) => el.getAttribute('class'), renderHTML: (a: any) => a.class ? { class: a.class } : {} },
      style: { default: null, parseHTML: (el: HTMLElement) => el.getAttribute('style'), renderHTML: (a: any) => a.style ? { style: a.style } : {} },
    };
  },
  parseHTML() { return [{ tag: 'span' }]; },
  renderHTML({ HTMLAttributes }: any) { return ['span', HTMLAttributes, 0]; },
});

/** Details/summary for spoiler blocks */
const Details = TiptapNode.create({
  name: 'details',
  group: 'block',
  content: 'summary block+',
  addAttributes() {
    return {
      class: { default: null, parseHTML: (el: HTMLElement) => el.getAttribute('class'), renderHTML: (a: any) => a.class ? { class: a.class } : {} },
      open: { default: null, parseHTML: (el: HTMLElement) => el.hasAttribute('open') ? '' : null, renderHTML: (a: any) => a.open !== null ? { open: '' } : {} },
    };
  },
  parseHTML() { return [{ tag: 'details' }]; },
  renderHTML({ HTMLAttributes }: any) { return ['details', HTMLAttributes, 0]; },
});

const Summary = TiptapNode.create({
  name: 'summary',
  content: 'inline*',
  parseHTML() { return [{ tag: 'summary' }]; },
  renderHTML() { return ['summary', 0]; },
});

// --- Types --------------------------------------------------------------------

interface Section {
  id: string;
  label: string;
  content: unknown;
}

interface RichTextEditorProps {
  content?: unknown;
  onChange?: (content: unknown) => void;
  placeholder?: string;
  multiSection?: boolean;
  postTitle?: string;
  /** Article slug — used to scope the autosave localStorage key so different articles don't share recovery data. */
  slug?: string;
  /** Session/temp ID for autosaving new articles that don't have a slug yet. */
  pendingDraftId?: string;
  onMetaChange?: (meta: any) => void;
  modMeta?: {
    gameName?: string;
    modName?: string;
    difficulty?: string;
    estimatedInstallMinutes?: number;
    prerequisiteList?: Array<{ name: string; required: boolean; url?: string }>;
  };
  /** Exposes the underlying TipTap editor instance to the parent (e.g. for the AI assistant sidebar). */
  onEditorReady?: (editor: Editor | null) => void;
}

type EditorMode = 'visual' | 'html' | 'markdown' | 'preview' | 'split';
type PreviewDevice = 'desktop' | 'tablet' | 'mobile';
type ActivePanel = 'insights' | 'seo' | 'export' | 'history' | null;

// --- Utility functions --------------------------------------------------------

function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function estimateReadTime(words: number): number {
  return Math.max(1, Math.round(words / 200));
}

function fleschReadability(text: string): number {
  const sentences = text.split(/[.!?]+/).filter(Boolean).length || 1;
  const words = countWords(text) || 1;
  const syllables = text.toLowerCase().replace(/[^a-z]/g, ' ').split(/\s+/).reduce((acc, w) => {
    return acc + (w.replace(/[^aeiouy]/g, '').length || 1);
  }, 0);
  return Math.min(100, Math.max(0, Math.round(206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words))));
}

function readabilityLabel(score: number): { label: string; color: string } {
  if (score >= 70) return { label: 'Easy', color: '#00E676' };
  if (score >= 50) return { label: 'Moderate', color: '#FFB300' };
  return { label: 'Complex', color: '#FF4D4D' };
}

function slugify(str: string): string {
  return str.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/^-+|-+$/g, '');
}

// --- Sub-components -----------------------------------------------------------

function getIconColor(label: string): string | undefined {
  if (typeof label !== 'string') return undefined;
  const l = label.toLowerCase();
  if (l.includes('undo') || l.includes('redo')) return '#90A4AE'; // Blue Grey
  if (l.includes('bold') || l.includes('italic') || l.includes('underline') || l.includes('strike')) return '#FFB300'; // Amber
  if (l.includes('code')) return '#FF4081'; // Pink
  if (l.includes('subscript') || l.includes('superscript')) return '#E040FB'; // Purple
  if (l.includes('align') || l.includes('justify')) return '#40C4FF'; // Light Blue
  if (l.includes('list') || l.includes('indent') || l.includes('outdent') || l.includes('task')) return '#00E676'; // Green
  if (l.includes('image') || l.includes('youtube') || l.includes('video') || l.includes('link') || l.includes('table')) return '#7C4DFF'; // Deep Purple
  if (l.includes('callout') || l.includes('badge') || l.includes('collapsible') || l.includes('horizontal') || l.includes('divider')) return '#FF6D00'; // Orange
  if (l.includes('clear') || l.includes('delete') || l.includes('remove')) return '#FF1744'; // Red
  if (l.includes('find') || l.includes('search')) return '#00B0FF'; // Blue
  if (l.includes('history') || l.includes('shortcut')) return '#536DFE'; // Indigo
  if (l.includes('paragraph') || l.includes('heading')) return '#FBC02D'; // Yellow
  if (l.includes('blockquote') || l.includes('quote')) return '#FF5252'; // Red-ish
  return undefined;
}

interface ToolBtnProps {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  label: string;
  className?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}

const ToolBtn = memo(({ onClick, active, children, label, className, disabled, style }: ToolBtnProps) => (
  <button
    type="button"
    onClick={onClick}
    title={label}
    disabled={disabled}
    className={cn(
      'p-1.5 min-w-[30px] min-h-[30px] flex items-center justify-center rounded-md border transition-all duration-150 shrink-0 relative hover:border-[var(--ed-accent-dim)]',
      disabled && 'opacity-30 pointer-events-none',
      className,
    )}
    style={{
      color: active ? 'var(--ed-accent)' : 'var(--ed-text)',
      background: active ? 'var(--ed-accent-dim)' : 'var(--ed-surface)',
      borderColor: active ? 'var(--ed-accent-dim)' : 'var(--ed-border)',
      ...style,
    }}
  >
    {children}
  </button>
));
ToolBtn.displayName = 'ToolBtn';

const Divider = () => (
  <div className="w-1.5 shrink-0" />
);

interface ToolRowProps {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  onClick: () => void;
  active?: boolean;
}

const ToolRow = memo(({ icon: Icon, label, onClick, active }: ToolRowProps) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left"
    style={{
      background: active ? 'var(--ed-accent-dim)' : 'var(--ed-elevated)',
      color: active ? 'var(--ed-accent)' : 'var(--ed-text-dim)',
    }}
  >
    <Icon className="w-4 h-4 shrink-0" style={{ color: active ? 'var(--ed-accent)' : getIconColor(label) }} />
    <span className="truncate">{label}</span>
  </button>
));
ToolRow.displayName = 'ToolRow';

const ToolSectionLabel = ({ children, first }: { children: React.ReactNode; first?: boolean }) => (
  <div
    className={cn('px-1 pb-1.5 text-[10px] font-bold uppercase tracking-[0.12em]', !first && 'pt-3 mt-1 border-t')}
    style={{ color: 'var(--ed-text-muted)', borderColor: !first ? 'var(--ed-border)' : undefined }}
  >
    {children}
  </div>
);

const JustifyIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 16 16"><path d="M1 2h14v1.5H1zm0 4h14v1.5H1zm0 4h14v1.5H1zm0 4h9v1.5H1z" /></svg>
);
const IndentIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 8 7 12 3 16" /><line x1="21" y1="12" x2="11" y2="12" /><line x1="21" y1="6" x2="11" y2="6" /><line x1="21" y1="18" x2="11" y2="18" />
  </svg>
);
const OutdentIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="11 8 7 12 11 16" /><line x1="21" y1="12" x2="7" y2="12" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="18" x2="3" y2="18" />
  </svg>
);
const HorizontalRuleIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>
);
const CollapsibleIcon = ({ className }: { className?: string }) => (
  <span className={cn('inline-flex items-center justify-center', className)} style={{ fontSize: '14px', lineHeight: 1 }}>⊟</span>
);
const KeyboardGlyphIcon = ({ className }: { className?: string }) => (
  <span className={cn('inline-flex items-center justify-center', className)} style={{ fontSize: '14px', lineHeight: 1 }}>⌨</span>
);

// --- Color Picker -------------------------------------------------------------

interface ColorPickerProps {
  onSelect: (color: string) => void;
  onClose: () => void;
}

const ColorPickerPopup = ({ onSelect, onClose }: ColorPickerProps) => {
  const [hex, setHex] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  useEffect(() => {
    if (ref.current && ref.current.parentElement) {
      const parentRect = ref.current.parentElement.getBoundingClientRect();
      const popupWidth = 232;
      ref.current.style.position = 'fixed';
      ref.current.style.top = `${parentRect.bottom + 8}px`;
      if (parentRect.left + popupWidth > window.innerWidth) {
        ref.current.style.left = 'auto';
        ref.current.style.right = `${Math.max(8, window.innerWidth - parentRect.right)}px`;
      } else {
        ref.current.style.left = `${parentRect.left}px`;
        ref.current.style.right = 'auto';
      }
    }
  }, []);

  return (
    <div ref={ref} className="mt-2 p-3 rounded-xl z-[999] shadow-2xl w-[232px]"
      style={{ background: BG_SURFACE, border: `1px solid ${BORDER}`, boxShadow: '0 20px 60px var(--ed-bg), 0 0 0 1px var(--ed-accent-dim)' }}>
      <div className="grid grid-cols-8 gap-1 mb-3">
        {COLOR_PALETTE.map(c => (
          <button type="button" key={c} onClick={() => { onSelect(c); onClose(); }} title={c}
            className="w-5 h-5 rounded transition-transform hover:scale-110 hover:z-10 relative"
            style={{ backgroundColor: c, border: c === '#ffffff' ? '1px solid var(--ed-border)' : 'none' }} />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input type="text" value={hex} onChange={e => setHex(e.target.value)}
          placeholder="var(--ed-accent)" maxLength={7}
          className="flex-1 rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none"
          style={{ background: BG_ELEVATED, border: `1px solid ${BORDER}`, color: 'var(--ed-text)' }} />
        <button type="button" onClick={() => { if (/^#[0-9a-fA-F]{3,6}$/.test(hex)) { onSelect(hex); onClose(); } }}
          className="px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors"
          style={{ background: 'var(--ed-accent-dim)', color: ACCENT, border: `1px solid ${ACCENT_DIM}` }}>
          Apply
        </button>
      </div>
    </div>
  );
};

// --- Font Family Dropdown -----------------------------------------------------

const FONT_OPTIONS = [
  { label: 'Default Font', value: '' },

  // -- Gaming & Display Stacks ----------------------------------------------
  { label: 'Gaming & Display Stacks', isGroup: true },
  { label: 'Barlow Condensed (Oswald)', value: '"Barlow Condensed", "Oswald", sans-serif' },
  { label: 'Oswald (Barlow Condensed)', value: '"Oswald", "Barlow Condensed", sans-serif' },
  { label: 'Rajdhani (Teko)', value: '"Rajdhani", "Teko", sans-serif' },
  { label: 'Orbitron (Audiowide)', value: '"Orbitron", "Audiowide", sans-serif' },
  { label: 'Big Shoulders Display', value: '"Big Shoulders Display", "Barlow Condensed", sans-serif' },
  { label: 'Bebas Neue (Anton)', value: '"Bebas Neue", "Anton", sans-serif' },
  { label: 'Black Ops One', value: '"Black Ops One", sans-serif' },
  { label: 'Chakra Petch (Quantico)', value: '"Chakra Petch", "Quantico", sans-serif' },
  { label: 'Titillium Web (Exo 2)', value: '"Titillium Web", "Exo 2", sans-serif' },

  // -- Modern Clean Body & UI Stacks ----------------------------------------
  { label: 'Modern Clean Body & UI Stacks', isGroup: true },
  { label: 'Acumin Pro', value: '"acumin-pro", system-ui, sans-serif' },
  { label: 'Acumin Pro Condensed', value: '"acumin-pro-condensed", sans-serif' },
  { label: 'Gibson', value: '"Gibson", sans-serif' },
  { label: 'Inter (DM Sans)', value: '"Inter", "DM Sans", sans-serif' },
  { label: 'Manrope (Outfit)', value: '"Manrope", "Outfit", sans-serif' },
  { label: 'IBM Plex Sans (Source Sans 3)', value: '"IBM Plex Sans", "Source Sans 3", sans-serif' },
  { label: 'Barlow (Hind)', value: '"Barlow", "Hind", sans-serif' },
  { label: 'Plus Jakarta Sans (Nunito)', value: '"Plus Jakarta Sans", "Nunito Sans", sans-serif' },
  { label: 'Source Sans 3 (System UI)', value: '"Source Sans 3", system-ui, sans-serif' },
  { label: 'Figtree (Mulish)', value: '"Figtree", "Mulish", sans-serif' },
  { label: 'Atkinson Hyperlegible', value: '"Atkinson Hyperlegible", sans-serif' },
  { label: 'Space Grotesk (Sora)', value: '"Space Grotesk", "Sora", sans-serif' },

  // -- Classic Editorial Serif Stacks ---------------------------------------
  { label: 'Classic Editorial Serif Stacks', isGroup: true },
  { label: 'Merriweather (Georgia)', value: '"Merriweather", Georgia, serif' },
  { label: 'Lora (Playfair Display)', value: '"Lora", "Playfair Display", serif' },
  { label: 'IBM Plex Serif', value: '"IBM Plex Serif", serif' },
  { label: 'Newsreader (Spectral)', value: '"Newsreader", "Spectral", serif' },

  // -- Monospace, Terminal & Code Stacks ------------------------------------
  { label: 'Monospace, Terminal & Code Stacks', isGroup: true },
  { label: 'JetBrains Mono', value: '"JetBrains Mono", monospace' },
  { label: 'Fira Code', value: '"Fira Code", monospace' },
  { label: 'IBM Plex Mono', value: '"IBM Plex Mono", monospace' },

  // -- System / Web Safe ----------------------------------------------------
  { label: 'System / Web Safe', isGroup: true },
  { label: 'Lucida Grande', value: '"Lucida Grande", "Trebuchet MS", Verdana, Arial, sans-serif' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", "Lucida Grande", Verdana, Arial, sans-serif' },
  { label: 'Verdana', value: 'Verdana, "Lucida Grande", "Trebuchet MS", Arial, sans-serif' },
  { label: 'Arial', value: 'Arial, "Lucida Grande", "Trebuchet MS", Verdana, sans-serif' },
];

const FontFamilyDropdown = ({ editor }: { editor: any }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (isOpen && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const currentFont = editor.getAttributes('textStyle').fontFamily || '';
  const currentLabel = FONT_OPTIONS.find(o => !o.isGroup && o.value === currentFont)?.label || 'Default Font';

  const filteredOptions = search.trim()
    ? FONT_OPTIONS.filter(o => o.isGroup ? false : o.label.toLowerCase().includes(search.toLowerCase()))
    : FONT_OPTIONS;

  return (
    <div ref={ref} className="relative w-full flex items-center">
      <button
        type="button"
        onClick={() => setIsOpen(v => !v)}
        className="ed-field-input flex items-center justify-between gap-1.5 text-[11px] rounded-lg px-2.5 py-2 outline-none transition-colors w-full"
        style={{ color: 'var(--ed-text-primary)', background: 'var(--ed-elevated)' }}
        title="Font Family"
      >
        <span className="truncate flex-1 text-left" style={{ fontFamily: currentFont || 'inherit' }}>{currentLabel}</span>
        <ChevronDown className="w-3.5 h-3.5 opacity-50 shrink-0" />
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 rounded-xl z-30 shadow-2xl w-56 flex flex-col"
          style={{
            background: BG_SURFACE,
            border: `1px solid ${BORDER}`,
            boxShadow: '0 20px 60px var(--ed-bg), 0 0 0 1px var(--ed-accent-dim)',
            maxHeight: '320px',
          }}
        >
          {/* Search */}
          <div className="p-2 shrink-0" style={{ borderBottom: `1px solid ${BORDER}` }}>
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search fonts…"
              className="w-full rounded-lg px-2.5 py-1.5 text-[11px] focus:outline-none"
              style={{ background: BG_ELEVATED, border: `1px solid ${BORDER}`, color: 'var(--ed-text)' }}
            />
          </div>

          {/* Options */}
          <div className="overflow-y-auto custom-scrollbar py-1">
            {/* Default reset option */}
            {!search && (
              <button
                type="button"
                onClick={() => { editor.chain().focus().unsetFontFamily().run(); setIsOpen(false); setSearch(''); }}
                className="w-full text-left px-3 py-1.5 text-[11px] transition-colors hover:bg-[var(--ed-elevated)]"
                style={{
                  color: !currentFont ? ACCENT : 'var(--ed-text-primary)',
                  background: !currentFont ? 'var(--ed-accent-dim)' : 'transparent',
                }}
              >
                Default Font
              </button>
            )}

            {filteredOptions.map((opt, i) => {
              if (opt.isGroup) {
                return (
                  <div key={i} className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider mt-1 first:mt-0 flex items-center gap-2"
                    style={{ color: `${ACCENT}55` }}>
                    <span>{opt.label}</span>
                    <div className="flex-1 h-px" style={{ background: `${ACCENT}20` }} />
                  </div>
                );
              }
              const isActive = currentFont === opt.value;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    if (opt.value) editor.chain().focus().setFontFamily(opt.value).run();
                    else editor.chain().focus().unsetFontFamily().run();
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className="w-full text-left px-3 py-1.5 text-[12px] transition-colors hover:bg-[var(--ed-elevated)] flex items-center justify-between gap-2"
                  style={{
                    color: isActive ? ACCENT : 'var(--ed-text-primary)',
                    background: isActive ? 'var(--ed-accent-dim)' : 'transparent',
                    fontFamily: opt.value || 'inherit',
                  }}
                >
                  <span className="truncate">{opt.label}</span>
                  {isActive && <span className="text-[8px] shrink-0" style={{ color: ACCENT }}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Insights Panel -----------------------------------------------------------

const InsightsPanel = memo(({ editor }: { editor: ReturnType<typeof useEditor> }) => {
  if (!editor) return null;
  const text = editor.getText();
  const words = countWords(text);
  const chars = text.length;
  const paragraphs = editor.getJSON().content?.filter((n: any) => n.type === 'paragraph' && n.content?.length).length ?? 0;
  const readTime = estimateReadTime(words);
  const score = fleschReadability(text);
  const { label: readLabel, color: readColor } = readabilityLabel(score);

  let headings = 0, links = 0, images = 0, missingAlt = 0;
  const walk = (nodes: JSONContent[] = []) => {
    for (const node of nodes) {
      if (node.type === 'heading') headings++;
      if (node.type === 'image') {
        images++;
        if (!node.attrs?.alt && node.attrs?.alt !== '') missingAlt++;
      }
      if (node.marks?.some((m: any) => m.type === 'link')) links++;
      if (node.content) walk(node.content as JSONContent[]);
    }
  };
  walk(editor.getJSON().content);

  const metrics = [
    { label: 'Words', value: words.toLocaleString() },
    { label: 'Characters', value: chars.toLocaleString() },
    { label: 'Paragraphs', value: paragraphs },
    { label: 'Headings', value: headings },
    { label: 'Links', value: links },
    { label: 'Images', value: images },
    { label: 'Missing Alt Text', value: missingAlt, warning: missingAlt > 0 },
    { label: 'Read Time', value: `~${readTime} min` },
  ];

  return (
    <div className="w-60 shrink-0 overflow-y-auto custom-scrollbar p-4 space-y-4"
      style={{ borderLeft: `1px solid ${BORDER}`, background: `${BG_BASE}cc` }}>
      <h3 className="text-[9px] font-bold uppercase tracking-[0.25em]" style={{ color: `${ACCENT}60` }}>
        Post Analytics
      </h3>
      <div className="space-y-0">
        {metrics.map(({ label, value, warning }: any) => (
          <div key={label} className="flex items-center justify-between py-2" style={{ borderBottom: `1px solid ${BORDER}50` }}>
            <span className="text-[11px]" style={{ color: '#5a7090' }}>{label}</span>
            <span className={cn("text-[11px] font-bold tabular-nums", warning ? "text-amber-500" : "text-[var(--ed-text)]")}>
              {value}
              {warning && <AlertTriangle className="w-3 h-3 inline ml-1" />}
            </span>
          </div>
        ))}
      </div>
      <div>
        <div className="text-[9px] font-bold uppercase tracking-[0.25em] mb-2" style={{ color: `${ACCENT}60` }}>
          Readability
        </div>
        <div className="flex items-center gap-2 mb-1.5">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--ed-border)' }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${score}%`, background: readColor, boxShadow: `0 0 6px ${readColor}60` }} />
          </div>
          <span className="text-[10px] font-bold" style={{ color: readColor }}>{readLabel}</span>
        </div>
        <div className="text-[10px]" style={{ color: 'var(--ed-text-muted)' }}>Flesch score: {score}/100</div>
      </div>
      {headings === 0 && words > 200 && (
        <div className="rounded-lg p-2.5 text-[10px]" style={{ background: '#FF4D4D10', border: '1px solid #FF4D4D20', color: '#FF8080' }}>
          ⚠ No headings found. Add H2/H3 for better SEO structure.
        </div>
      )}
      {images === 0 && words > 300 && (
        <div className="rounded-lg p-2.5 text-[10px]" style={{ background: '#FFB30010', border: '1px solid #FFB30020', color: '#FFB300' }}>
          💡 Add an image to increase engagement.
        </div>
      )}
    </div>
  );
});
InsightsPanel.displayName = 'InsightsPanel';

// --- SEO Panel ----------------------------------------------------------------

const SEOPanel = memo(({ postTitle = '', onMetaChange }: { postTitle?: string; onMetaChange?: (m: any) => void }) => {
  const [slug, setSlug] = useState(() => slugify(postTitle));
  const [metaTitle, setMetaTitle] = useState(postTitle);
  const [metaDesc, setMetaDesc] = useState('');
  const [focusKw, setFocusKw] = useState('');

  const titleOk = metaTitle.length >= 30 && metaTitle.length <= 60;
  const descOk = metaDesc.length >= 120 && metaDesc.length <= 160;

  useEffect(() => {
    setSlug(slugify(metaTitle || postTitle));
    onMetaChange?.({ slug: slugify(metaTitle || postTitle), metaTitle, metaDesc, focusKw });
    // Fix #12: postTitle added to dep array \u2014 ensures slug updates if parent sets title asynchronously
  }, [metaTitle, postTitle]);

  const inputStyle = {
    background: BG_ELEVATED, border: `1px solid ${BORDER}`, color: 'var(--ed-text)',
    borderRadius: '8px', padding: '8px 12px', fontSize: '12px', width: '100%', outline: 'none',
  } as const;

  return (
    <div className="w-72 shrink-0 overflow-y-auto custom-scrollbar p-4 space-y-4"
      style={{ borderLeft: `1px solid ${BORDER}`, background: `${BG_BASE}cc` }}>
      <h3 className="text-[9px] font-bold uppercase tracking-[0.25em]" style={{ color: `${ACCENT}60` }}>SEO Settings</h3>
      <div>
        <label className="text-[11px] block mb-1.5" style={{ color: '#5a7090' }}>URL Slug</label>
        <div className="flex items-center rounded-lg overflow-hidden" style={{ border: `1px solid ${BORDER}`, background: BG_ELEVATED }}>
          <span className="text-[10px] px-2 py-2 shrink-0" style={{ color: 'var(--ed-text-muted)' }}>thecoregamer.com/articles/</span>
          <input value={slug} onChange={e => setSlug(e.target.value)}
            className="flex-1 bg-transparent focus:outline-none font-mono"
            style={{ color: ACCENT, fontSize: '12px', padding: '8px 8px 8px 0' }} />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[11px]" style={{ color: '#5a7090' }}>Meta Title</label>
          <span className="text-[10px] font-mono" style={{ color: titleOk ? '#00E676' : '#FF4D4D' }}>{metaTitle.length}/60</span>
        </div>
        <input value={metaTitle} onChange={e => setMetaTitle(e.target.value)} style={inputStyle} />
        <div className="h-0.5 rounded-full mt-1.5 overflow-hidden" style={{ background: 'var(--ed-border)' }}>
          <div className="h-full rounded-full transition-all"
            style={{ width: `${Math.min(100, (metaTitle.length / 60) * 100)}%`, background: titleOk ? '#00E676' : metaTitle.length > 60 ? '#FF4D4D' : '#FFB300' }} />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[11px]" style={{ color: '#5a7090' }}>Meta Description</label>
          <span className="text-[10px] font-mono" style={{ color: descOk ? '#00E676' : '#FF4D4D' }}>{metaDesc.length}/160</span>
        </div>
        <textarea value={metaDesc} onChange={e => setMetaDesc(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'none' }} />
      </div>
      <div>
        <label className="text-[11px] block mb-2" style={{ color: '#5a7090' }}>Google Preview</label>
        <div className="rounded-xl p-3" style={{ background: '#fff', border: '1px solid #e0e0e0' }}>
          <div className="text-[13px] leading-tight mb-0.5 truncate" style={{ color: '#1a0dab', fontFamily: 'Arial, sans-serif' }}>
            {metaTitle || 'Untitled Article'}
          </div>
          <div className="text-[11px] mb-1" style={{ color: '#006621', fontFamily: 'Arial, sans-serif' }}>
            thecoregamer.com › articles › {slug || 'article'}
          </div>
          <div className="text-[12px] leading-snug" style={{
            color: '#545454', fontFamily: 'Arial, sans-serif',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {metaDesc || 'Add a meta description to preview how your article will appear in Google search results.'}
          </div>
        </div>
      </div>
      <div>
        <label className="text-[11px] block mb-1.5" style={{ color: '#5a7090' }}>Focus Keyword</label>
        <input value={focusKw} onChange={e => setFocusKw(e.target.value)} placeholder="e.g. elden ring review 2025" style={inputStyle} />
      </div>
      <div>
        <label className="text-[11px] block mb-2" style={{ color: '#5a7090' }}>Open Graph Preview</label>
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
          <div className="h-20 flex items-center justify-center" style={{ background: BG_ELEVATED }}>
            <ImageIcon className="w-6 h-6" style={{ color: 'var(--ed-text-muted)' }} />
          </div>
          <div className="p-2.5" style={{ background: BG_SURFACE }}>
            <div className="text-[9px] uppercase tracking-widest mb-0.5" style={{ color: 'var(--ed-text-muted)' }}>thecoregamer.com</div>
            <div className="text-[12px] font-medium leading-tight" style={{ color: 'var(--ed-text)' }}>{metaTitle || 'Untitled'}</div>
            <div className="text-[10px] mt-0.5 truncate" style={{ color: '#5a7090' }}>{metaDesc || 'Add a description...'}</div>
          </div>
        </div>
      </div>
    </div>
  );
});
SEOPanel.displayName = 'SEOPanel';

// --- Export Panel -------------------------------------------------------------

const ExportPanel = ({ editor, onClose }: { editor: any; onClose: () => void }) => {
  const [copying, setCopying] = useState<string | null>(null);

  const copy = async (label: string, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopying(label);
    setTimeout(() => setCopying(null), 1500);
  };

  const downloadFile = (filename: string, content: string, mime = 'text/plain') => {
    const a = document.createElement('a');
    a.href = `data:${mime};charset=utf-8,${encodeURIComponent(content)}`;
    a.download = filename; a.click();
  };

  if (!editor) return null;

  const actions = [
    { label: 'Copy HTML', icon: Code2, onClick: () => copy('Copy HTML', sanitizeHTML(editor.getHTML())) },
    {
      label: 'Download HTML', icon: FileCode,
      onClick: () => downloadFile('article.html', `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Article</title></head><body>${sanitizeHTML(editor.getHTML())}</body></html>`, 'text/html'),
    },
    { label: 'Download JSON', icon: FileText, onClick: () => downloadFile('article.json', JSON.stringify(editor.getJSON(), null, 2), 'application/json') },
    { label: 'Copy Plain Text', icon: Copy, onClick: () => copy('Copy Plain Text', editor.getText()) },
  ];

  return (
    <div className="w-60 shrink-0 overflow-y-auto custom-scrollbar p-4 space-y-3"
      style={{ borderLeft: `1px solid ${BORDER}`, background: `${BG_BASE}cc` }}>
      <h3 className="text-[9px] font-bold uppercase tracking-[0.25em]" style={{ color: `${ACCENT}60` }}>Export</h3>
      {actions.map(({ label, icon: Icon, onClick }) => (
        <button key={label} onClick={onClick}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
          style={{ background: copying === label ? '#00E67615' : BG_ELEVATED, border: `1px solid ${copying === label ? '#00E67630' : BORDER}`, color: copying === label ? '#00E676' : 'var(--ed-text-dim)' }}>
          <Icon className="w-4 h-4 shrink-0" />
          <span className="text-xs font-medium">{copying === label ? 'Copied!' : label}</span>
        </button>
      ))}
    </div>
  );
};

interface Version {
  id: string;
  versionNumber: number;
  title: string;
  content: any;
  createdAt: string;
  editor: {
    id: string;
    displayName: string;
  };
}

const HistoryPanel = memo(({ slug, editor, onClose }: { slug: string; editor: any; onClose: () => void }) => {
  const [isRestoring, setIsRestoring] = useState<string | null>(null);
  const { addToast } = useUIStore();

  const { data: response, error, mutate } = useSWR<{ success: boolean; data: Version[] }>(
    slug ? `/api/posts/${slug}/versions` : null,
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load version history');
      return res.json();
    }
  );

  const handleRestore = async (version: Version) => {
    if (!confirm(`Are you sure you want to restore to version ${version.versionNumber}? This will save your current editor state as a new version.`)) {
      return;
    }

    setIsRestoring(version.id);
    try {
      const res = await fetch(`/api/posts/${slug}/versions/${version.id}/restore`, {
        method: 'POST',
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to restore version');

      addToast({ message: `Restored to version ${version.versionNumber}`, type: 'success' });
      
      await mutate();
      window.location.reload();
    } catch (err: any) {
      addToast({ message: err.message, type: 'error' });
    } finally {
      setIsRestoring(null);
    }
  };

  return (
    <div className="w-80 shrink-0 overflow-y-auto custom-scrollbar p-4 space-y-4 flex flex-col h-full"
      style={{ borderLeft: `1px solid ${BORDER}`, background: `${BG_BASE}cc` }}>
      <div className="flex items-center justify-between">
        <h3 className="text-[9px] font-bold uppercase tracking-[0.25em]" style={{ color: `${ACCENT}60` }}>
          Version History
        </h3>
        <button type="button" onClick={onClose} className="text-[#5a7090] hover:text-[var(--ed-text)] transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
        {!response && !error && (
          <div className="py-8 flex justify-center">
            <Spinner className="w-5 h-5 animate-spin text-[var(--ed-accent)]" />
          </div>
        )}
        {error && <p className="text-xs text-red-400 py-2">Failed to load versions.</p>}
        {response && response.data?.length === 0 && (
          <p className="text-xs text-[#5a7090] py-2 italic">No previous versions found.</p>
        )}

        {response?.data?.map((version) => (
          <div key={version.id} className="p-3 rounded-lg border flex flex-col gap-2 transition-all hover:border-[var(--ed-accent-dim)]"
            style={{ background: BG_SURFACE, borderColor: BORDER }}>
            <div className="flex justify-between items-start gap-2">
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--ed-accent-dim)] text-[var(--ed-accent)]">
                  v{version.versionNumber}
                </span>
                <p className="text-xs font-semibold text-[var(--ed-text)] mt-1.5 truncate">
                  {version.title || 'Untitled'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRestore(version)}
                disabled={isRestoring !== null}
                title="Restore this version"
                className="h-7 px-2.5 rounded text-[10px] font-bold transition-all flex items-center gap-1 shrink-0"
                style={{
                  background: isRestoring === version.id ? 'transparent' : 'var(--ed-accent-dim)',
                  color: 'var(--ed-accent)',
                  border: '1px solid var(--ed-accent-dim)',
                }}
              >
                {isRestoring === version.id ? (
                  <Spinner className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    <RotateCcw className="w-3 h-3" />
                    Restore
                  </>
                )}
              </button>
            </div>
            <div className="flex justify-between items-center text-[10px]" style={{ color: '#5a7090' }}>
              <span className="truncate max-w-[120px]">{version.editor?.displayName || 'Unknown Editor'}</span>
              <span className="shrink-0">{new Date(version.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
HistoryPanel.displayName = 'HistoryPanel';

// --- Slash Command Menu -------------------------------------------------------



interface SlashMenuState {
  visible: boolean;
  filter: string;
  selected: number;
  coords: { top: number; left: number };
}

// --- Link Panel ---------------------------------------------------------------

interface LinkPanelProps {
  onApply: (href: string, newTab: boolean) => void;
  onClose: () => void;
  initialHref?: string;
}

const LinkPanel = ({ onApply, onClose, initialHref = '' }: LinkPanelProps) => {
  const [href, setHref] = useState(initialHref);
  const [newTab, setNewTab] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  // Pull addToast from the UI store so LinkPanel can surface validation errors.
  const { addToast } = useUIStore();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  /** Validate the URL with the shared allowlist and either apply or toast an error. */
  const tryApply = () => {
    if (!href) return;
    const safe = sanitizeUrl(href);
    if (safe === null) {
      addToast({
        type: 'error',
        message: 'Link blocked: only http, https, mailto, and tel URLs are allowed.',
      });
      return;
    }
    onApply(safe, newTab);
    onClose();
  };

  return (
    <div ref={ref} className="absolute top-full left-0 mt-2 p-3 rounded-xl z-30 shadow-2xl w-[280px]"
      style={{ background: BG_SURFACE, border: `1px solid ${BORDER}`, boxShadow: '0 20px 60px var(--ed-bg), 0 0 0 1px var(--ed-accent-dim)' }}>
      <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: `${ACCENT}60` }}>Insert Link</div>
      <input
        autoFocus
        type="text"
        value={href}
        onChange={e => setHref(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { tryApply(); } if (e.key === 'Escape') onClose(); }}
        placeholder="https://nexusmods.com/..."
        className="w-full rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none mb-2"
        style={{ background: BG_ELEVATED, border: `1px solid ${BORDER}`, color: 'var(--ed-text)' }}
      />
      <label className="flex items-center gap-2 cursor-pointer mb-3 select-none">
        <div
          onClick={() => setNewTab(v => !v)}
          className="w-8 h-4 rounded-full transition-colors relative flex-shrink-0"
          style={{ background: newTab ? 'var(--ed-accent-dim)' : 'var(--ed-border)', border: `1px solid ${newTab ? ACCENT : BORDER}` }}
        >
          <div className="absolute top-0.5 w-3 h-3 rounded-full transition-all"
            style={{ background: newTab ? ACCENT : 'var(--ed-text-muted)', left: newTab ? '18px' : '2px' }} />
        </div>
        <span className="text-[11px]" style={{ color: '#5a7090' }}>Open in new tab</span>
        <span className="text-[9px] ml-auto" style={{ color: 'var(--ed-text-muted)' }}>recommended for external links</span>
      </label>
      <div className="flex gap-2">
        <button type="button" onClick={onClose} className="flex-1 py-1.5 rounded-lg text-xs transition-colors"
          style={{ background: BG_ELEVATED, border: `1px solid ${BORDER}`, color: '#5a7090' }}>Cancel</button>
        <button
          type="button"
          onClick={tryApply}
          disabled={!href}
          className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors"
          style={{ background: href ? 'var(--ed-accent-dim)' : 'var(--ed-border)', border: `1px solid ${href ? ACCENT_DIM : BORDER}`, color: href ? ACCENT : 'var(--ed-text-muted)' }}>
          Apply
        </button>
      </div>
    </div>
  );
};

// --- Autosave Recovery Banner -------------------------------------------------

interface RecoveryBannerProps {
  onRestore: () => void;
  onDismiss: () => void;
  timestamp: number;
  source: 'local' | 'server';
}

const RecoveryBanner = ({ onRestore, onDismiss, timestamp, source }: RecoveryBannerProps) => {
  const age = Math.round((Date.now() - timestamp) / 1000);
  const label = age < 60 ? `${age}s ago` : age < 3600 ? `${Math.round(age / 60)}min ago` : `${Math.round(age / 3600)}hr ago`;
  const sourceLabel = source === 'server' ? ' (on server)' : ' (local)';
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 shrink-0 text-xs"
      style={{ background: '#FFB30012', borderBottom: `1px solid #FFB30030`, color: '#907050' }}>
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#FFB300', boxShadow: '0 0 6px #FFB30060' }} />
      <span className="flex-1">Unsaved content found from <strong style={{ color: '#c8a060' }}>{label}</strong>{sourceLabel} — restore it?</span>
      <button type="button" onClick={onRestore} className="px-3 py-1 rounded-lg text-xs font-bold transition-colors"
        style={{ background: '#FFB30020', border: '1px solid #FFB30040', color: '#FFB300' }}>Restore</button>
      <button type="button" onClick={onDismiss} className="p-1 rounded transition-colors" style={{ color: '#5a4030' }}>
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

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
  const parsedValue = parseInt(activeFontSize || '', 10);
  const displayValue = !isNaN(parsedValue)
    ? String(parsedValue)
    : (() => {
        const effective = getEffectiveFontSize(editor);
        return effective != null ? String(effective) : '';
      })();

  const [val, setVal] = useState(displayValue);

  useEffect(() => {
    setVal(displayValue);
  }, [displayValue]);

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
      className="ed-field-input w-12 text-[11px] rounded-md px-1.5 py-1 text-center outline-none shrink-0"
      style={{ color: 'var(--ed-text-dim)' }}
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
      className="ed-field-input w-14 text-[11px] rounded-md px-1.5 py-1 text-center outline-none shrink-0"
      style={{ color: 'var(--ed-text-dim)' }}
    />
  );
};
function getEffectiveFontWeight(editor: any): string | null {
  try {
    if (!editor?.view) return null;
    const { from } = editor.state.selection;
    let node: Node | null = editor.view.domAtPos(from).node;
    while (node && node.nodeType !== Node.ELEMENT_NODE) node = node.parentNode;
    if (!node) return null;
    let weight = window.getComputedStyle(node as Element).fontWeight;
    if (weight === 'bold') weight = '700';
    if (weight === 'normal') weight = '400';
    return weight || null;
  } catch {
    return null;
  }
}

function getEffectiveLineHeight(editor: any): string | null {
  try {
    if (!editor?.view) return null;
    const { from } = editor.state.selection;
    let node: Node | null = editor.view.domAtPos(from).node;
    while (node && node.nodeType !== Node.ELEMENT_NODE) node = node.parentNode;
    if (!node) return null;
    return window.getComputedStyle(node as Element).lineHeight || null;
  } catch {
    return null;
  }
}

const FontWeightInput = ({ editor }: { editor: any }) => {
  const activeWeight = editor.getAttributes('textStyle').fontWeight || '';
  const displayValue = activeWeight 
    ? activeWeight 
    : (() => {
        const effective = getEffectiveFontWeight(editor);
        return effective != null ? String(effective) : '';
      })();

  const [val, setVal] = useState(displayValue);

  useEffect(() => {
    setVal(displayValue);
  }, [displayValue]);

  const applyWeight = (w: string) => {
    const trimmed = w.trim();
    if (!trimmed) {
      editor.commands.unsetFontWeight();
    } else {
      editor.commands.setFontWeight(trimmed);
    }
  };

  return (
    <input
      type="number"
      value={val}
      placeholder="400"
      min={100}
      max={900}
      step={100}
      onChange={e => setVal(e.target.value)}
      onBlur={() => applyWeight(val)}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          applyWeight(val);
          editor.commands.focus();
        }
      }}
      className="ed-field-input w-12 text-[11px] rounded-md px-1.5 py-1 text-center outline-none shrink-0"
      style={{ color: 'var(--ed-text-dim)' }}
    />
  );
};

const LineHeightInput = ({ editor }: { editor: any }) => {
  // Fix #7: Read line-height from whichever block type is active (paragraph OR heading)
  const isHeading = editor.isActive('heading');
  const targetType = isHeading ? 'heading' : 'paragraph';
  const rawLh = editor.getAttributes(targetType).lineHeight;
  const activeLineHeight = rawLh 
    ? rawLh 
    : (() => {
        const effective = getEffectiveLineHeight(editor);
        return effective != null ? String(effective) : '';
      })();
  const [val, setVal] = useState(activeLineHeight);

  useEffect(() => {
    setVal(activeLineHeight);
  }, [activeLineHeight]);

  const applyLineHeight = (lh: string) => {
    if (isHeading) {
      editor.chain().focus().updateAttributes('heading', { lineHeight: lh || null }).run();
    } else {
      editor.chain().focus().updateAttributes('paragraph', { lineHeight: lh || null }).run();
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
      className="ed-field-input w-14 text-[11px] rounded-md px-1.5 py-1 text-center outline-none shrink-0"
      style={{ color: 'var(--ed-text-dim)' }}
    />
  );
};

// --- Word Count Target Popover ------------------------------------------------

interface WordTargetPopoverProps {
  current: number;
  onClose: () => void;
  onSet: (target: number) => void;
}

const WordTargetPopover = ({ current, onClose, onSet }: WordTargetPopoverProps) => {
  const [val, setVal] = useState(String(current));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const presets = [600, 1000, 1500, 2500, 3000];

  return (
    <div ref={ref} className="absolute bottom-full mb-2 left-0 p-3 rounded-xl z-30 shadow-2xl w-[200px]"
      style={{ background: BG_SURFACE, border: `1px solid ${BORDER}`, boxShadow: '0 -20px 60px var(--ed-bg), 0 0 0 1px var(--ed-accent-dim)' }}>
      <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: `${ACCENT}60` }}>Word Target</div>
      <div className="flex gap-1 flex-wrap mb-2">
        {presets.map(p => (
          <button type="button" key={p} onClick={() => { onSet(p); onClose(); }}
            className="px-2 py-1 rounded text-[10px] transition-colors"
            style={{ background: p === current ? 'var(--ed-accent-dim)' : BG_ELEVATED, border: `1px solid ${p === current ? ACCENT_DIM : BORDER}`, color: p === current ? ACCENT : '#5a7090' }}>
            {p}
          </button>
        ))}
      </div>
      <div className="flex gap-1">
        <input type="number" value={val} onChange={e => setVal(e.target.value)} min={100} max={20000}
          className="flex-1 rounded-lg px-2 py-1 text-xs focus:outline-none"
          style={{ background: BG_ELEVATED, border: `1px solid ${BORDER}`, color: 'var(--ed-text)' }} />
        <button type="button" onClick={() => { const n = parseInt(val, 10); if (n > 0) { onSet(n); onClose(); } }}
          className="px-2.5 rounded-lg text-xs font-bold"
          style={{ background: 'var(--ed-accent-dim)', border: `1px solid ${ACCENT_DIM}`, color: ACCENT }}>Set</button>
      </div>
    </div>
  );
};

// --- Section Template Picker --------------------------------------------------

const SECTION_TEMPLATES: Record<string, { label: string; content: any }> = {
  overview: {
    label: 'Overview',
    content: {
      type: 'doc', content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Overview' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Describe what this mod does and why someone would want to install it.' }] },
        { type: 'blockquote', attrs: { class: 'callout-info' }, content: [{ type: 'paragraph', content: [{ type: 'text', text: '💡 Info: List any important notes about compatibility or game versions here.' }] }] },
      ],
    },
  },
  installation: {
    label: 'Installation',
    content: {
      type: 'doc', content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Installation' }] },
        { type: 'blockquote', attrs: { class: 'callout-warning' }, content: [{ type: 'paragraph', content: [{ type: 'text', text: '⚠️ Warning: Back up your save files before installing.' }] }] },
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Prerequisites' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'List required mods using /moddeps, then walk through installation steps using /steps.' }] },
      ],
    },
  },
  troubleshooting: {
    label: 'Troubleshooting',
    content: {
      type: 'doc', content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Troubleshooting' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Common issues and how to fix them. Use /troubleshoot to add a problem → cause → fix block.' }] },
      ],
    },
  },
  changelog: {
    label: 'Changelog',
    content: {
      type: 'doc', content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Changelog' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Use /changelog to insert a version history block.' }] },
      ],
    },
  },
  configuration: {
    label: 'Configuration',
    content: {
      type: 'doc', content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Configuration' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Explain how to configure the mod\'s INI or MCM settings.' }] },
        { type: 'blockquote', attrs: { class: 'callout-tip' }, content: [{ type: 'paragraph', content: [{ type: 'text', text: '✦ Tip: Use /tabs to show different configuration options side by side.' }] }] },
      ],
    },
  },
};

// --- Fullscreen Mode: Context Inspector (right panel) -------------------------

// Mirrors getEffectiveFontSize — reads the computed `color` off the DOM node at
// the selection so the swatch reflects named theme colors too, not just raw hex.
function getEffectiveTextColor(editor: Editor): string | null {
  try {
    if (!editor?.view) return null;
    const { from } = editor.state.selection;
    let node: Node | null = editor.view.domAtPos(from).node;
    while (node && node.nodeType !== Node.ELEMENT_NODE) node = node.parentNode;
    if (!node) return null;
    return window.getComputedStyle(node as Element).color || null;
  } catch {
    return null;
  }
}

const PanelSectionHeader = ({ label }: { label: string }) => (
  <div className="text-[9px] font-bold uppercase tracking-[0.18em] mb-2 mt-3 first:mt-0 flex items-center gap-2"
    style={{ color: 'var(--ed-accent)', opacity: 0.6 }}>
    <span>{label}</span>
    <div className="flex-1 h-px" style={{ background: 'var(--ed-border)' }} />
  </div>
);

interface FullscreenPropertiesPanelProps {
  editor: Editor;
  showPanelTextColor: boolean;
  setShowPanelTextColor: React.Dispatch<React.SetStateAction<boolean>>;
  showPanelHighlight: boolean;
  setShowPanelHighlight: React.Dispatch<React.SetStateAction<boolean>>;
  isFullScreen?: boolean;
}

const FullscreenPropertiesPanel = ({ editor, showPanelTextColor, setShowPanelTextColor, showPanelHighlight, setShowPanelHighlight, isFullScreen = false }: FullscreenPropertiesPanelProps) => {
  const [width, setWidth] = useState(256);
  const isResizing = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const actualWidth = isFullScreen ? width : 230;

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const rect = panelRef.current?.getBoundingClientRect();
      if (rect) {
        const newWidth = e.clientX - rect.left;
        setWidth(Math.max(200, Math.min(newWidth, 600)));
      }
    };
    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
      }
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const hasActiveFormatting =
    ['bold', 'italic', 'underline', 'strike', 'code', 'subscript', 'superscript', 'link', 'highlight', 'heading', 'blockquote'].some(m => editor.isActive(m)) ||
    !!editor.getAttributes('textStyle').fontFamily ||
    !!editor.getAttributes('textStyle').fontSize ||
    !!editor.getAttributes('textStyle').fontWeight ||
    !!editor.getAttributes('textStyle').letterSpacing ||
    !!editor.getAttributes('textStyle').colorName;

  const colorName = editor.getAttributes('textStyle').colorName;
  const activeThemeColor = useMemo(() => {
    if (!colorName) return null;
    const customColorsStr = typeof window !== 'undefined' ? localStorage.getItem('rte-custom-colors') : null;
    let custom = [];
    try { custom = customColorsStr ? JSON.parse(customColorsStr) : []; } catch(e){}
    return [...TEXT_COLOR_PALETTE, ...custom].find(c => c.name === colorName) || null;
  }, [colorName]);

  if (editor.state.selection.empty && !hasActiveFormatting) {
    return (
      <div ref={panelRef} className="shrink-0 overflow-y-auto custom-scrollbar flex items-center justify-center relative group"
        style={{ width: `${actualWidth}px`, borderRight: `1px solid ${BORDER}`, background: BG_SURFACE, padding: '12px' }}>
        <span className="text-[11px] text-center" style={{ color: 'var(--ed-text-muted)' }}>
          Select text or click a block to inspect
        </span>
        {isFullScreen && (
          <div 
            onMouseDown={(e) => { isResizing.current = true; document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'; e.preventDefault(); }}
            className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-[var(--ed-accent)] transition-colors z-50 opacity-0 group-hover:opacity-100"
          />
        )}
      </div>
    );
  }

  const headingLevel = ([1, 2, 3, 4, 5, 6] as const).find(l => editor.isActive('heading', { level: l }));
  const lhTargetType = editor.isActive('heading') ? 'heading' : 'paragraph';
  const isBlockquote = editor.isActive('blockquote');
  const blockquoteClass: string = editor.getAttributes('blockquote').class || '';
  const effectiveColor = getEffectiveTextColor(editor);
  const highlightColor = editor.getAttributes('highlight').color;

  const miniSelectClass = 'ed-select-mini text-[10px] rounded pl-0.5 pr-3.5 py-1 outline-none cursor-pointer w-7 appearance-none hover:bg-[var(--ed-surface)]';

  return (
    <div ref={panelRef} className="shrink-0 overflow-y-auto custom-scrollbar relative group" style={{ width: `${actualWidth}px`, borderRight: `1px solid ${BORDER}`, background: BG_SURFACE, padding: '12px' }}>
      {isFullScreen && (
        <div 
          onMouseDown={(e) => { isResizing.current = true; document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'; e.preventDefault(); }}
          className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-[var(--ed-accent)] transition-colors z-50 opacity-0 group-hover:opacity-100"
        />
      )}
      <PanelSectionHeader label="Typography" />
      <div className="space-y-1.5">
        <FontFamilyDropdown editor={editor} />

        <div className="flex items-center justify-between gap-2 py-1.5">
          <span className="text-[11px]" style={{ color: 'var(--ed-text-muted)' }}>Size</span>
          <div className="flex items-center gap-1 shrink-0">
            <FontSizeInput editor={editor} />
            <div className="relative shrink-0 flex items-center">
              <select onChange={e => { if (e.target.value) editor.commands.setFontSize(e.target.value + 'px'); }} value="" className={miniSelectClass}>
                <option value="" disabled></option>
                {[10, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 40, 48, 56, 64, 72, 96].map(s => (
                  <option key={s} value={String(s)}>{s}px</option>
                ))}
              </select>
              <ChevronDown className="w-2.5 h-2.5 absolute right-0.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--ed-text-muted)' }} />
            </div>
            <button type="button" onClick={() => editor.commands.unsetFontSize()} className="w-5 h-5 flex items-center justify-center rounded text-xs transition-colors shrink-0 hover:bg-[var(--ed-surface)]" style={{ color: 'var(--ed-text-muted)' }} title="Reset font size">×</button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 py-1.5">
          <span className="text-[11px]" style={{ color: 'var(--ed-text-muted)' }}>Weight</span>
          <div className="flex items-center gap-1 shrink-0">
            <FontWeightInput editor={editor} />
            <div className="relative shrink-0 flex items-center">
              <select onChange={e => { if (e.target.value) editor.commands.setFontWeight(e.target.value); }} value="" className={miniSelectClass}>
                <option value="" disabled></option>
                {[
                  { value: '100', label: '100 · Thin' },
                  { value: '200', label: '200 · Extra Light' },
                  { value: '300', label: '300 · Light' },
                  { value: '400', label: '400 · Regular' },
                  { value: '500', label: '500 · Medium' },
                  { value: '600', label: '600 · Semibold' },
                  { value: '700', label: '700 · Bold' },
                  { value: '800', label: '800 · Extra Bold' },
                  { value: '900', label: '900 · Black' },
                ].map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <ChevronDown className="w-2.5 h-2.5 absolute right-0.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--ed-text-muted)' }} />
            </div>
            <button type="button" onClick={() => editor.commands.unsetFontWeight()} className="w-5 h-5 flex items-center justify-center rounded text-xs transition-colors shrink-0 hover:bg-[var(--ed-surface)]" style={{ color: 'var(--ed-text-muted)' }} title="Reset font weight">×</button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 py-1.5">
          <span className="text-[11px]" style={{ color: 'var(--ed-text-muted)' }}>Spacing</span>
          <div className="flex items-center gap-1 shrink-0">
            <LetterSpacingInput editor={editor} />
            <div className="relative shrink-0 flex items-center">
              <select
                onChange={e => { if (e.target.value) editor.commands.setLetterSpacing(e.target.value); }}
                value=""
                className={miniSelectClass}
              >
                <option value="" disabled></option>
                {['-0.1em', '-0.05em', '-0.02em', '0em', '0.02em', '0.05em', '0.08em', '0.1em', '0.15em', '0.2em', '0.3em', '0.5em'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <ChevronDown className="w-2.5 h-2.5 absolute right-0.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--ed-text-muted)' }} />
            </div>
            <button type="button" onClick={() => editor.commands.unsetLetterSpacing()} className="w-5 h-5 flex items-center justify-center rounded text-xs transition-colors shrink-0 hover:bg-[var(--ed-surface)]" style={{ color: 'var(--ed-text-muted)' }} title="Reset letter spacing">×</button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 py-1.5">
          <span className="text-[11px]" style={{ color: 'var(--ed-text-muted)' }}>Line H.</span>
          <div className="flex items-center gap-1 shrink-0">
            <LineHeightInput editor={editor} />
            <div className="relative shrink-0 flex items-center">
              <select
                onChange={e => {
                  if (e.target.value === 'default') editor.chain().focus().updateAttributes(lhTargetType, { lineHeight: null }).run();
                  else editor.chain().focus().updateAttributes(lhTargetType, { lineHeight: e.target.value }).run();
                }}
                value={editor.getAttributes(lhTargetType).lineHeight || 'default'}
                className={miniSelectClass}
              >
                <option value="default" disabled></option>
                {['1', '1.1', '1.15', '1.2', '1.25', '1.3', '1.4', '1.5', '1.6', '1.75', '1.85', '2', '2.5', '3'].map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
              <ChevronDown className="w-2.5 h-2.5 absolute right-0.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--ed-text-muted)' }} />
            </div>
            <button type="button" onClick={() => editor.chain().focus().updateAttributes(lhTargetType, { lineHeight: null }).run()} className="w-5 h-5 flex items-center justify-center rounded text-xs transition-colors shrink-0 hover:bg-[var(--ed-surface)]" style={{ color: 'var(--ed-text-muted)' }} title="Reset line height">×</button>
          </div>
        </div>
      </div>

      <PanelSectionHeader label="Color" />
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {activeThemeColor ? (
            <div className="w-3.5 h-3.5 rounded-full relative shrink-0" style={{ background: activeThemeColor.light, border: `1px solid ${BORDER}` }}>
              <span className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full border border-white/30" style={{ background: activeThemeColor.dark }} />
            </div>
          ) : (
            <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: effectiveColor || 'transparent', border: `1px solid ${BORDER}` }} />
          )}
          <span className="text-[11px] flex-1" style={{ color: 'var(--ed-text-muted)' }}>Text color</span>
          <div className="relative flex items-center gap-1">
            {/* Quick swatches pull from the theme color system (named, light/dark
                adaptive) so they stay consistent with the sidebar's ThemeColorPicker
                instead of applying raw hex that ignores theme switching. */}
            {TEXT_COLOR_PALETTE.slice(0, 5).map(c => (
              <button key={c.name} type="button" onClick={() => editor.chain().focus().setThemeColor(c.name).run()} title={c.name}
                className="w-4 h-4 rounded-full hover:scale-110 transition-transform shrink-0 relative"
                style={{ background: c.light }}>
                <span className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full border border-white/30" style={{ background: c.dark }} />
              </button>
            ))}
            <ToolBtn onClick={() => { setShowPanelTextColor(v => !v); setShowPanelHighlight(false); }} active={showPanelTextColor} label="More text colors" className="w-5 h-5 p-0 flex items-center justify-center">
              <Plus className="w-3 h-3" />
            </ToolBtn>
            {showPanelTextColor && <div className="absolute right-0 top-full z-[100]"><ThemeColorPicker editor={editor} onClose={() => setShowPanelTextColor(false)} /></div>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: highlightColor || 'transparent', border: `1px solid ${BORDER}` }} />
          <span className="text-[11px] flex-1" style={{ color: 'var(--ed-text-muted)' }}>Highlight</span>
          <div className="relative flex items-center gap-1">
            {COLOR_PALETTE.slice(0, 5).map(c => (
              <button key={c} type="button" onClick={() => editor.chain().focus().toggleHighlight({ color: c }).run()} title={c}
                className="w-4 h-4 rounded-full hover:scale-110 transition-transform shrink-0"
                style={{ background: c, border: c === '#ffffff' ? `1px solid ${BORDER}` : 'none' }} />
            ))}
            <ToolBtn onClick={() => { setShowPanelHighlight(v => !v); setShowPanelTextColor(false); }} active={showPanelHighlight} label="More highlight colors" className="w-5 h-5 p-0 flex items-center justify-center">
              <Plus className="w-3 h-3" />
            </ToolBtn>
            {showPanelHighlight && <div className="absolute right-0 top-full z-[100]"><ColorPickerPopup onSelect={c => editor.chain().focus().toggleHighlight({ color: c }).run()} onClose={() => setShowPanelHighlight(false)} /></div>}
          </div>
        </div>
      </div>

      <PanelSectionHeader label="Alignment" />
      <div className="flex items-center gap-1">
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} label="Align Left"><AlignLeft className="w-4 h-4" /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} label="Align Center"><AlignCenter className="w-4 h-4" /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} label="Align Right"><AlignRight className="w-4 h-4" /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} label="Justify"><JustifyIcon className="w-4 h-4" /></ToolBtn>
      </div>

      {(headingLevel || isBlockquote) && (
        <>
          <PanelSectionHeader label="Block" />
          {headingLevel && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {[1, 2, 3, 4, 5, 6].map(level => (
                <button key={level} type="button"
                  onClick={() => editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 }).run()}
                  className="px-2 py-1 rounded text-[10px] font-bold transition-colors"
                  style={{
                    background: headingLevel === level ? 'var(--ed-accent-dim)' : 'var(--ed-elevated)',
                    color: headingLevel === level ? 'var(--ed-accent)' : 'var(--ed-text-dim)',
                  }}>H{level}</button>
              ))}
            </div>
          )}
          {isBlockquote && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {(['info', 'warning', 'tip', 'danger'] as const).map(type => (
                <button key={type} type="button"
                  onClick={() => editor.chain().focus().updateAttributes('blockquote', { class: `callout-${type}` }).run()}
                  className="px-2 py-1 rounded-full text-[10px] font-medium capitalize transition-colors"
                  style={{
                    background: blockquoteClass === `callout-${type}` ? 'var(--ed-accent-dim)' : 'var(--ed-elevated)',
                    color: blockquoteClass === `callout-${type}` ? 'var(--ed-accent)' : 'var(--ed-text-dim)',
                  }}>{type}</button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// --- Fullscreen Mode: Horizontal Top Toolbar -----------------------------------

interface FullscreenTopToolbarProps {
  editor: Editor;
  showLinkPanel: boolean;
  setShowLinkPanel: React.Dispatch<React.SetStateAction<boolean>>;
  showArticleLinkPanel: boolean;
  setShowArticleLinkPanel: React.Dispatch<React.SetStateAction<boolean>>;
  showGameLinkPanel: boolean;
  setShowGameLinkPanel: React.Dispatch<React.SetStateAction<boolean>>;
  showTextColor: boolean;
  setShowTextColor: React.Dispatch<React.SetStateAction<boolean>>;
  showHighlight: boolean;
  setShowHighlight: React.Dispatch<React.SetStateAction<boolean>>;
  showCalloutMenu: boolean;
  setShowCalloutMenu: React.Dispatch<React.SetStateAction<boolean>>;
  calloutMenuRef: React.RefObject<HTMLDivElement | null>;
  showBadgeMenu: boolean;
  setShowBadgeMenu: React.Dispatch<React.SetStateAction<boolean>>;
  showFindReplace: boolean;
  setShowFindReplace: React.Dispatch<React.SetStateAction<boolean>>;
  setShowShortcutsPanel: (v: boolean) => void;
  activePanel: ActivePanel;
  togglePanel: (p: ActivePanel) => void;
  slug: string;
  handleAddImage: () => void;
  handleYoutube: () => void;
  handleApplyLink: (href: string, newTab: boolean) => void;
  handleApplyArticleLink: (article: PickedArticle) => void;
  handleApplyGameLink: (game: PickedGame) => void;
  insertCallout: (type: 'info' | 'warning' | 'tip' | 'danger') => void;
  handleSlashAction: (action: any) => void;
}

const FullscreenTopToolbar = ({
  editor, showLinkPanel, setShowLinkPanel, showArticleLinkPanel, setShowArticleLinkPanel, showGameLinkPanel, setShowGameLinkPanel, showTextColor, setShowTextColor,
  showHighlight, setShowHighlight, showCalloutMenu, setShowCalloutMenu, calloutMenuRef,
  showBadgeMenu, setShowBadgeMenu,
  showFindReplace, setShowFindReplace, setShowShortcutsPanel, activePanel, togglePanel,
  slug, handleAddImage, handleYoutube, handleApplyLink, handleApplyArticleLink, handleApplyGameLink,
  // Kept in the prop interface for parity with the sidebar's callout API; the
  // dropdown below reuses the richer 6-type `callout` node insertion instead.
  insertCallout: _insertCallout,
  handleSlashAction,
}: FullscreenTopToolbarProps) => {
  return (
    <div className="flex flex-wrap items-center gap-y-1.5 gap-x-1.5 px-3 py-1.5 shrink-0" style={{ background: 'var(--ed-elevated)', borderBottom: `1px solid ${BORDER}` }}>
      <ToolBtn onClick={() => editor.chain().focus().undo().run()} label="Undo"><Undo className="w-4 h-4" /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().redo().run()} label="Redo"><Redo className="w-4 h-4" /></ToolBtn>

      <Divider />

      <select
        onChange={e => {
          const v = e.target.value;
          if (v === 'p') editor.chain().focus().setParagraph().run();
          else if (v.startsWith('h')) editor.chain().focus().toggleHeading({ level: parseInt(v[1]) as 1 | 2 | 3 | 4 | 5 | 6 }).run();
        }}
        value={
          editor.isActive('heading', { level: 1 }) ? 'h1' :
          editor.isActive('heading', { level: 2 }) ? 'h2' :
          editor.isActive('heading', { level: 3 }) ? 'h3' :
          editor.isActive('heading', { level: 4 }) ? 'h4' :
          editor.isActive('heading', { level: 5 }) ? 'h5' :
          editor.isActive('heading', { level: 6 }) ? 'h6' : 'p'
        }
        className="ed-select text-[11px] rounded-lg px-2 py-1.5 outline-none cursor-pointer shrink-0"
        style={{ width: '110px' }}
      >
        <option value="p">Paragraph</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
        <option value="h4">Heading 4</option>
        <option value="h5">Heading 5</option>
        <option value="h6">Heading 6</option>
      </select>

      <Divider />

      <select
        className="ed-select text-[11px] rounded-lg px-2 py-1.5 outline-none cursor-pointer shrink-0"
        style={{ width: '130px' }}
        value=""
        onChange={e => {
          const v = e.target.value;
          if (!v) return;
          const cmd = slashRegistry.getAll().find(c => c.id === v);
          if (cmd) handleSlashAction(cmd.action);
          e.target.value = "";
        }}
      >
        <option value="" disabled>Insert Block...</option>
        {Object.entries(
          slashRegistry.getAll().reduce((acc, cmd) => {
            if (cmd.group === 'Text' || cmd.group === 'Typography') return acc;
            if (!acc[cmd.group]) acc[cmd.group] = [];
            acc[cmd.group].push(cmd);
            return acc;
          }, {} as Record<string, any[]>)
        ).map(([group, commands]) => (
          <optgroup key={group} label={group}>
            {commands.map((cmd: any) => (
              <option key={cmd.id} value={cmd.id}>
                {cmd.icon} {cmd.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      <Divider />

      <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} label="Bold"><Bold className="w-4 h-4" /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} label="Italic"><Italic className="w-4 h-4" /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} label="Underline"><UnderlineIcon className="w-4 h-4" /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} label="Strikethrough"><Strikethrough className="w-4 h-4" /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} label="Inline Code"><Code className="w-4 h-4" /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleSubscript().run()} active={editor.isActive('subscript')} label="Subscript"><SubscriptIcon className="w-4 h-4" /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive('superscript')} label="Superscript"><SuperscriptIcon className="w-4 h-4" /></ToolBtn>

      <Divider />

      <ToolBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} label="Align Left"><AlignLeft className="w-4 h-4" /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} label="Align Center"><AlignCenter className="w-4 h-4" /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} label="Align Right"><AlignRight className="w-4 h-4" /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} label="Justify"><JustifyIcon className="w-4 h-4" /></ToolBtn>

      <Divider />

      <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} label="Bullet List"><List className="w-4 h-4" /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} label="Ordered List"><ListOrdered className="w-4 h-4" /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} label="Task List"><CheckSquare className="w-4 h-4" /></ToolBtn>
      <ToolBtn
        onClick={() => {
          if (editor.isActive('taskItem')) editor.chain().focus().sinkListItem('taskItem').run();
          else if (editor.isActive('listItem')) editor.chain().focus().sinkListItem('listItem').run();
          else {
            const targetType = editor.isActive('heading') ? 'heading' : 'paragraph';
            const current = parseInt(editor.getAttributes(targetType).style?.match(/margin-left:\s*(\d+)px/)?.[1] || '0', 10);
            editor.chain().focus().updateAttributes(targetType, { style: `margin-left: ${Math.min(current + 24, 120)}px` }).run();
          }
        }}
        label="Indent"
      ><IndentIcon className="w-4 h-4" /></ToolBtn>
      <ToolBtn
        onClick={() => {
          if (editor.isActive('taskItem')) editor.chain().focus().liftListItem('taskItem').run();
          else if (editor.isActive('listItem')) editor.chain().focus().liftListItem('listItem').run();
          else {
            const targetType = editor.isActive('heading') ? 'heading' : 'paragraph';
            const current = parseInt(editor.getAttributes(targetType).style?.match(/margin-left:\s*(\d+)px/)?.[1] || '0', 10);
            const next = Math.max(current - 24, 0);
            editor.chain().focus().updateAttributes(targetType, { style: next === 0 ? null : `margin-left: ${next}px` }).run();
          }
        }}
        label="Outdent"
      ><OutdentIcon className="w-4 h-4" /></ToolBtn>

      <Divider />

      <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} label="Blockquote"><Quote className="w-4 h-4" /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} label="Code Block"><Terminal className="w-4 h-4" /></ToolBtn>

      <Divider />

      <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
      <div className="relative shrink-0 flex items-center gap-0.5">
        <ToolBtn onClick={() => {
          setShowLinkPanel((v: boolean) => {
            if (!v) { setShowArticleLinkPanel(false); setShowGameLinkPanel(false); }
            return !v;
          });
        }} active={showLinkPanel || (editor.isActive('link') && !editor.getAttributes('link').href?.startsWith('/'))} label="Link (⌘K)"><LinkIcon className="w-4 h-4" /></ToolBtn>
        
        <ToolBtn onClick={() => {
          setShowArticleLinkPanel(v => {
            if (!v) { setShowLinkPanel(false); setShowGameLinkPanel(false); }
            return !v;
          });
        }} active={showArticleLinkPanel || (editor.isActive('link') && editor.getAttributes('link').href?.match(/^\/(articles|reviews|mod-guides)\//))} label="Article Link"><BookOpen className="w-4 h-4" /></ToolBtn>

        <ToolBtn onClick={() => {
          setShowGameLinkPanel(v => {
            if (!v) { setShowLinkPanel(false); setShowArticleLinkPanel(false); }
            return !v;
          });
        }} active={showGameLinkPanel || (editor.isActive('link') && editor.getAttributes('link').href?.startsWith('/games/'))} label="Game Link"><Gamepad2 className="w-4 h-4" /></ToolBtn>

        {showLinkPanel && (
          <LinkPanel onApply={handleApplyLink} onClose={() => setShowLinkPanel(false)} initialHref={editor.isActive('link') ? (editor.getAttributes('link').href || '') : ''} />
        )}

        {showArticleLinkPanel && (
          <div className="absolute top-full left-0 mt-1 p-2 rounded-lg z-50 shadow-xl w-64" style={{ background: 'var(--ed-surface)', border: '1px solid var(--ed-border)' }}>
            <ArticlePicker 
              onSelect={handleApplyArticleLink} 
              stopProp={(e) => { e.stopPropagation(); }} 
            />
          </div>
        )}

        {showGameLinkPanel && (
          <div className="absolute top-full left-0 mt-1 p-2 rounded-lg z-50 shadow-xl w-64" style={{ background: 'var(--ed-surface)', border: '1px solid var(--ed-border)' }}>
            <GamePicker 
              onSelect={handleApplyGameLink} 
              stopProp={(e) => { e.stopPropagation(); }} 
            />
          </div>
        )}
      </div>
      <ToolBtn onClick={handleAddImage} label="Add Image"><ImageIcon className="w-4 h-4" /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} label="Table"><TableIcon className="w-4 h-4" /></ToolBtn>
      <ToolBtn onClick={handleYoutube} label="YouTube"><VideoIcon className="w-4 h-4" /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} label="Horizontal Rule"><HorizontalRuleIcon className="w-4 h-4" /></ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().insertContent({
          type: 'collapsibleSection',
          attrs: { title: 'Section Title' },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Write your content here…' }] }],
        }).run()}
        label="Collapsible Section"
      ><CollapsibleIcon className="w-4 h-4" /></ToolBtn>
      <div className="relative shrink-0" ref={calloutMenuRef}>
        <ToolBtn onClick={() => setShowCalloutMenu(v => !v)} active={showCalloutMenu} label="Insert Callout"><Info className="w-4 h-4" /></ToolBtn>
        {showCalloutMenu && (
          <div className="absolute top-full left-0 mt-1 rounded-lg overflow-hidden z-50 shadow-xl" style={{ background: BG_SURFACE, border: `1px solid ${BORDER}`, minWidth: '120px' }}>
            {(['quote', 'tip', 'warning', 'hot-take', 'did-you-know', 'spoiler'] as const).map(type => (
              <button key={type} type="button" onClick={() => {
                editor.chain().focus().insertContent({
                  type: 'callout',
                  attrs: { type },
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Write your content here…' }] }]
                }).run();
                setShowCalloutMenu(false);
              }}
                className="w-full text-left px-3 py-2 text-xs transition-colors capitalize hover:bg-[var(--ed-accent-dim)]"
                style={{ color: type === 'warning' ? '#ea580c' : type === 'tip' ? '#16a34a' : type === 'hot-take' ? '#dc2626' : type === 'quote' ? '#7c3aed' : type === 'spoiler' ? '#475569' : '#2563eb' }}>
                → {type.replace('-', ' ')}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="relative shrink-0">
        <ToolBtn onClick={() => setShowBadgeMenu(v => !v)} active={showBadgeMenu} label="Insert Badge"><Tag className="w-4 h-4" /></ToolBtn>
        {showBadgeMenu && (
          <div className="absolute top-full left-0 mt-1 p-2 rounded-lg z-50 shadow-xl w-[220px]" style={{ background: BG_SURFACE, border: `1px solid ${BORDER}` }}>
            <div className="text-[10px] uppercase tracking-wider font-bold mb-1.5" style={{ color: 'var(--ed-text-muted)' }}>Presets</div>
            <div className="flex flex-wrap gap-1">
              {[
                { label: 'PC', variant: 'platform' }, { label: 'PS5', variant: 'platform' }, { label: 'Xbox', variant: 'platform' },
                { label: 'Switch', variant: 'platform' }, { label: 'Mobile', variant: 'platform' },
                { label: '18+', variant: 'rating' }, { label: 'Mature', variant: 'rating' },
                { label: 'Multiplayer', variant: 'genre' }, { label: 'Co-op', variant: 'genre' },
                { label: 'Free to Play', variant: 'status' }, { label: 'Early Access', variant: 'status' },
              ].map(b => (
                <button
                  key={b.label}
                  type="button"
                  onClick={() => {
                    editor.chain().focus().insertContent({ type: 'gamingBadge', attrs: { label: b.label, variant: b.variant } }).run();
                    setShowBadgeMenu(false);
                  }}
                  className={`text-[10px] px-1.5 py-0.5 rounded gaming-badge-${b.variant} opacity-80 hover:opacity-100 border`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <Divider />

      <div className="relative shrink-0">
        <ToolBtn onClick={() => { setShowTextColor(v => !v); setShowHighlight(false); }} active={showTextColor} label="Text Color"><Palette className="w-4 h-4" /></ToolBtn>
        {showTextColor && <ThemeColorPicker editor={editor} onClose={() => setShowTextColor(false)} />}
      </div>
      <div className="relative shrink-0">
        <ToolBtn onClick={() => { setShowHighlight(v => !v); setShowTextColor(false); }} active={showHighlight} label="Highlight"><Highlighter className="w-4 h-4" /></ToolBtn>
        {showHighlight && <ColorPickerPopup onSelect={c => editor.chain().focus().toggleHighlight({ color: c }).run()} onClose={() => setShowHighlight(false)} />}
      </div>
      </div>

      <div className="flex items-center gap-1 ml-auto shrink-0">
        <ToolBtn onClick={() => setShowFindReplace(v => !v)} active={showFindReplace} label="Find & Replace"><Search className="w-4 h-4" /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} label="Clear Formatting"><X className="w-4 h-4" /></ToolBtn>
        {slug ? (
          <ToolBtn onClick={() => togglePanel('history')} active={activePanel === 'history'} label="Version History"><History className="w-4 h-4" /></ToolBtn>
        ) : (
          <ToolBtn onClick={() => setShowShortcutsPanel(true)} label="Keyboard Shortcuts"><KeyboardGlyphIcon className="w-4 h-4" /></ToolBtn>
        )}
      </div>
    </div>
  );
};

// --- Main Component -----------------------------------------------------------

export default function RichTextEditor({
  content,
  onChange,
  placeholder = 'Start writing your article… or type / for commands',
  multiSection = false,
  postTitle = '',
  slug = '',
  pendingDraftId = '',
  onMetaChange,
  modMeta,
  onEditorReady,
}: RichTextEditorProps) {
  const { user } = useAuthStore();
  const { addToast, theme } = useUIStore();

  useEffect(() => {
    const fontId = 'rte-google-fonts-v2';
    if (!document.getElementById(fontId)) {
      const link = document.createElement('link');
      link.id = fontId; link.rel = 'stylesheet'; link.href = GOOGLE_FONTS_URL;
      document.head.appendChild(link);
    }
    const styleId = 'rte-editor-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId; style.textContent = EDITOR_CSS;
      document.head.appendChild(style);
    }
  }, []);

  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>('visual');
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [showTextColor, setShowTextColor] = useState(false);
  const [showHighlight, setShowHighlight] = useState(false);
  const [showPanelTextColor, setShowPanelTextColor] = useState(false);
  const [showPanelHighlight, setShowPanelHighlight] = useState(false);
  const [showShortcutsPanel, setShowShortcutsPanel] = useState(false);
  const [showCalloutMenu, setShowCalloutMenu] = useState(false);
  const [showBadgeMenu, setShowBadgeMenu] = useState(false);
  const calloutMenuRef = useRef<HTMLDivElement>(null);
  const [showLinkPanel, setShowLinkPanel] = useState(false);
  const [showArticleLinkPanel, setShowArticleLinkPanel] = useState(false);
  const [showGameLinkPanel, setShowGameLinkPanel] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serverAutoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Fix #3 (Rules of Hooks): findNextRef must live here, before the early-return guard
  // so it is called unconditionally on every render.
  const findNextRef = useRef<number>(-1);
  const [htmlSourceValue, setHtmlSourceValue] = useState('');
  const [markdownSourceValue, setMarkdownSourceValue] = useState('');
  const [blockModalConfig, setBlockModalConfig] = useState<BlockInsertModalConfig | null>(null);
  const [isMuxModalOpen, setIsMuxModalOpen] = useState(false);


  // v2.3: recovery banner, word target, section template picker
  const [recoveryData, setRecoveryData] = useState<{ 
    json: any; 
    timestamp: number;
    source: 'local' | 'server';
  } | null>(null);

  const [wordTarget, setWordTarget] = useState<number>(() => {
    try { return parseInt(localStorage.getItem('rte-word-target') || '1000', 10) || 1000; } catch { return 1000; }
  });
  const [showWordTarget, setShowWordTarget] = useState(false);
  const [showSectionTemplatePicker, setShowSectionTemplatePicker] = useState(false);

  const [slashMenu, setSlashMenu] = useState<SlashMenuState>({
    visible: false, filter: '', selected: 0, coords: { top: 0, left: 0 },
  });
  const slashMenuRef = useRef<HTMLDivElement>(null);
  // Mirrors slashMenu state so handleKeyDown can read the latest value without
  // making stableEditorProps depend on slashMenu (which would force TipTap to
  // call view.setProps() on every slash filter update, eating Enter keystrokes).
  const slashMenuStateRef = useRef<SlashMenuState>({ visible: false, filter: '', selected: 0, coords: { top: 0, left: 0 } });
  const slashStartPos = useRef<number | null>(null);

  const [sections, setSections] = useState<Section[]>(() => {
    if (multiSection && Array.isArray(content) && content.length > 0) {
      return (content as any[]).map(s => ({ id: s.id || crypto.randomUUID(), label: s.label || 'Untitled', content: s.content || { type: 'doc', content: [] } }));
    }
    return [{ id: 'main', label: 'Main', content: (!multiSection && content) ? content : { type: 'doc', content: [] } }];
  });
  const [activeSection, setActiveSection] = useState(() => sections[0]?.id || 'main');
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [tabEditValue, setTabEditValue] = useState('');
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);

  // ✅ FIX 2 + FIX 8: Corrected extensions array
  // - Removed tiptap-markdown (root cause of HTML escaping)
  // - StarterKit codeBlock: false  → prevents conflict with CodeBlockLowlight
  // - Added comprehensive HTML container nodes
  const extensions = useMemo(() => [
    AdSlotNode,
    StarterKit.configure({
      paragraph: false,
      heading: false, // ✅ Disable default heading to use CustomHeading with IDs
      // ✅ FIX 8: Disable StarterKit's built-in codeBlock to prevent duplicate registration
      codeBlock: false,
      // Disable built-in link and underline to avoid duplicates with custom standalone instances below
      link: false,
      underline: false,
      bulletList: false,
    }),
    CustomHeading.configure({ levels: [1, 2, 3, 4, 5, 6] }),
    CustomParagraph,
    TextStyle,
    ThemeColor,
    FontSize,
    FontWeight,
    LetterSpacing,
    ImageGrid,
    ImageGallery,
    Callout,
    GamingBadge,
    CollapsibleSection,
    FontFamily,
    CustomBulletList,
    Subscript,
    Superscript,
    TaskList,
    TaskItem.configure({ nested: true }),
    CharacterCount,
    // ✅ FIX 1 (Update): Re-added Markdown purely for serialization (Option B)
    // transformPastedText/CopiedText are false so it NEVER intercepts HTML paste!
    Markdown.configure({
      html: true,
      transformPastedText: false,
      transformCopiedText: false,
    }),
    Youtube.configure({ width: 640, height: 480 }),
    // ✅ FIX 8: CodeBlockLowlight is the single source of truth for code blocks
    CodeBlockLowlight.configure({ lowlight }),
    CustomImage.configure({ allowBase64: false }),
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Placeholder.configure({ placeholder }),
    CustomTable.configure({ resizable: true }),
    TableRow,
    TableCell,
    TableHeader,
    CustomStyles,
    // ✅ FIX 9: All HTML container node types
    CustomDiv,
    CustomSection,
    CustomArticle,
    CustomFigure,
    CustomSpan,
    CustomIframe,
    Details,
    Summary,
    CustomLink.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
    Underline,
    // v2.2: New extensions
    TypographyEngine,
    KeyboardShortcutsExtension.configure({
      onLink: () => setShowLinkPanel(true),
    }),
    ColumnLayout, ColumnItem, ComparisonLayout, FeatureGrid, FeatureCard,

    TabsBlock, AccordionBlock, HeroSection,
    MarkdownPaste,
    // v2.4: Migrated Gaming Blocks
    ReviewCardNode,
    MentionedGameNode,
    BenchmarkCardNode,
    PatchNotesNode,
    SystemRequirementsNode,
    ProsConsNode,
    DealCardNode,
    TimelineNode,
    FAQNode,
    ChangelogNode,
    VersionCompareNode,

    ImagePlaceholderNode,
    BossCardNode,
    BuildCardNode,
    WalkthroughContainerNode,
    WalkthroughStepNode,
    VideoEmbed,
    AwardBadgeNode,
    StatCompareNode,
    LootTableNode,
    InlinePollNode,
    ModCardNode,
    VideoTimestampNode,
    SocialEmbedNode,
    SocialEmbedPastePrompt,
    NewsletterCtaNode,
    RelatedArticlesNode,
    HardwareSpecNode,
    PriceHistoryNode,
    ModLoadOrderNode,
    ControversyBlockNode,
    TierListNode,
    InteractiveMapNode,
    MapGenieEmbedNode,
    ComparisonTableNode,
    AchievementBlockNode,
    PriceCompareTableNode,
    // Fix #1: Previously exported but never registered — content would be lost on reload
    SpoilerBlockNode,
    CorrectionNoticeNode,
    PullQuoteNode,
  ], [placeholder]);

  const sectionsRef = useRef(sections);
  const activeSectionRef = useRef(activeSection);
  const onChangeRef = useRef(onChange);
  // `filteredSlash`/`executeSlashCommand` are declared after useEditor() (they need
  // `editor`), so handleKeyDown reads them via ref to avoid a TDZ reference and,
  // more importantly, to avoid depending on values that would otherwise force
  // editorProps to be rebuilt (and the ProseMirror view's props re-applied via
  // setOptions/setProps) on every keystroke — see the useMemo below.
  const filteredSlashRef = useRef<SlashItem[]>([]);
  const executeSlashCommandRef = useRef<(item: SlashItem) => void>(() => {});

  useEffect(() => {
    sectionsRef.current = sections;
    activeSectionRef.current = activeSection;
    onChangeRef.current = onChange;
  }, [sections, activeSection, onChange]);

  // Keep slashMenuStateRef in sync so handleKeyDown always sees the latest state
  // without slashMenu being a dependency of stableEditorProps.
  useEffect(() => {
    slashMenuStateRef.current = slashMenu;
  }, [slashMenu]);

  // Tiptap's useEditor() re-applies options (including editorProps) to the live
  // ProseMirror view whenever any option's identity changes between renders. The
  // `content` option is only meant to seed the *initial* document — ongoing sync
  // is already handled by the explicit setContent() effects below — so we freeze
  // it to its first-render value instead of recomputing it (and therefore handing
  // useEditor a new object reference) on every keystroke.
  const initialEditorContentRef = useRef<any>(
    multiSection
      ? (sections.find(s => s.id === activeSection)?.content as any)
      : (content as any)
  );

  // Tiptap doesn't re-render the React tree by itself — toolbar state
  // (editor.isActive()/getAttributes() checks) only refreshes when something
  // else happens to trigger a re-render. onUpdate's setAutoSaveStatus('saving')
  // looked like it covered content changes, but React bails out of re-rendering
  // when that setter is called with the same 'saving' value it already had (e.g.
  // repeated +/- font-size clicks within the same debounce window) — so the
  // toolbar would visually freeze even though the underlying mark kept changing.
  // onTransaction fires on every transaction (selection-only or content-changing)
  // and is independent of any other state, so bumping a counter here is a
  // reliable way to force the toolbar to re-read fresh editor state every time.
  const [, forceToolbarUpdate] = useState(0);

  const stableOnTransaction = useCallback(() => forceToolbarUpdate(n => n + 1), []);

  const stableOnUpdate = useCallback(({ editor: e }: { editor: any }) => {
    const json = e.getJSON();
    if (multiSection) {
      const updated = sectionsRef.current.map(s =>
        s.id === activeSectionRef.current ? { ...s, content: json } : s,
      );
      setSections(updated);
      onChangeRef.current?.(updated);
    } else {
      onChangeRef.current?.(json);
    }
    setAutoSaveStatus('saving');
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      setAutoSaveStatus('saved');
      try { localStorage.setItem(`rte-recovery-${slug || 'new'}`, JSON.stringify({ _timestamp: Date.now(), _content: json })); } catch { }
    }, 1200);

    // v2.4: Server-side autosave (30s debounce)
    if (serverAutoSaveTimer.current) clearTimeout(serverAutoSaveTimer.current);
    serverAutoSaveTimer.current = setTimeout(async () => {
      const slugOrId = slug || pendingDraftId;
      if (!slugOrId) return;

      try {
        await updateAutosave(slugOrId, {
          content: json,
          savedAt: new Date().toISOString()
        }, !slug);
      } catch (e) {
        // silent fail
      }
    }, 30000);
  }, [multiSection, slug, pendingDraftId]);

  // Memoized so editorProps keeps the same object identity across ordinary typing —
  // it's only rebuilt when isFocusMode toggles or the slash menu's own state changes
  // (both rare compared to every keystroke). See the refs/comment above for why this
  // matters: an unstable editorProps forces Tiptap to re-apply view props via
  // setOptions()/view.setProps() on every render, which was intermittently eating
  // plain Enter/Space keystrokes while they raced with that mid-typing prop churn.
  const stableEditorProps = useMemo(() => ({
    attributes: {
      class: cn('gaming-prose gaming-content focus:outline-none', isFocusMode && 'focus-mode'),
    },
    transformPastedHTML(html: string) {
      return sanitizeHTML(html);
    },
    handleKeyDown(view: any, event: KeyboardEvent) {
      // Read via ref so this memo never depends on slashMenu state — if it did,
      // TipTap would call view.setProps() on every filter/arrow update, and that
      // mid-keystroke prop churn would race with and eat plain Enter keystrokes.
      const currentSlashMenu = slashMenuStateRef.current;
      if (event.key === '/') {
        const { from } = view.state.selection;
        const domPos = view.coordsAtPos(from);
        slashStartPos.current = from;
        setSlashMenu({ visible: true, filter: '', selected: 0, coords: { top: domPos.bottom + 4, left: domPos.left } });
        return false;
      }
      if (currentSlashMenu.visible) {
        const filteredSlash = filteredSlashRef.current;
        if (event.key === 'Escape') { setSlashMenu(m => ({ ...m, visible: false })); return true; }
        if (event.key === 'ArrowDown') { setSlashMenu(m => ({ ...m, selected: Math.min(m.selected + 1, filteredSlash.length - 1) })); return true; }
        if (event.key === 'ArrowUp') { setSlashMenu(m => ({ ...m, selected: Math.max(0, m.selected - 1) })); return true; }
        if (event.key === 'Enter' && filteredSlash.length > 0) {
          executeSlashCommandRef.current(filteredSlash[currentSlashMenu.selected]);
          return true;
        }
        if (event.key === 'Backspace') {
          const newFilter = currentSlashMenu.filter.slice(0, -1);
          if (newFilter.length === 0 && slashStartPos.current !== null) {
            const startPos = view.state.selection.from - 1;
            if (startPos < slashStartPos.current) setSlashMenu(m => ({ ...m, visible: false }));
          }
          setSlashMenu(m => ({ ...m, filter: newFilter, selected: 0 }));
          return false;
        }
        if (event.key.length === 1) {
          setSlashMenu(m => ({ ...m, filter: m.filter + event.key, selected: 0 }));
          return false;
        }
      }
      return false;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [isFocusMode]); // ← slashMenu intentionally removed: handleKeyDown reads slashMenuStateRef instead

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    onTransaction: stableOnTransaction,
    content: initialEditorContentRef.current,
    onUpdate: stableOnUpdate,
    editorProps: stableEditorProps,
  });

  // Expose the TipTap editor instance to the parent (e.g. AI assistant sidebar)
  useEffect(() => {
    onEditorReady?.(editor);
  }, [editor, onEditorReady]);

  // Expose these to slash commands — must be declared AFTER useEditor to avoid TDZ
  const handleSlashAction = useCallback((action: (e: any, setModal: any, addToast: any, openMux: any) => void) => {
    if (editor) action(editor, setBlockModalConfig, addToast, () => setIsMuxModalOpen(true));
  }, [editor, addToast]);


  const filteredSlash = useMemo(() => {
    const q = slashMenu.filter.toLowerCase();
    let commands = slashRegistry.getAll();
    if (user?.role !== 'ADMIN') {
      commands = commands.filter(c => c.id !== 'adslot');
    }
    if (q) return commands.filter(c => c.label.toLowerCase().includes(q) || c.id.toLowerCase().includes(q) || c.group.toLowerCase().includes(q));
    // v2.4: prepend recently used commands as a "Recent" group
    try {
      const raw = localStorage.getItem('rte-recent-commands');
      const recentIds: string[] = raw ? JSON.parse(raw) : [];
      if (recentIds.length > 0) {
        const recentItems = recentIds
          .map(id => commands.find(c => c.id === id))
          .filter(Boolean)
          .map(c => ({ ...c!, group: 'Recent' }));
        const rest = commands.filter(c => !recentIds.includes(c.id));
        return [...recentItems, ...rest];
      }
    } catch { /* ignore */ }
    return commands;
    // Fix #21: removed `addToast` from deps — it's a stable store ref, not needed here
  }, [slashMenu.filter]);

  const executeSlashCommand = useCallback((item: SlashItem) => {
    if (!editor) return;
    const docSize = editor.state.doc.content.size;
    const { from } = editor.state.selection;
    
    let deleteFrom = slashStartPos.current !== null ? slashStartPos.current : (from - 1 - slashMenu.filter.length);
    let deleteTo = from;

    // Clamp values to safe boundaries [0, docSize]
    deleteFrom = Math.max(0, Math.min(deleteFrom, docSize));
    deleteTo = Math.max(0, Math.min(deleteTo, docSize));

    if (deleteFrom < deleteTo) {
      editor.chain().focus().deleteRange({ from: deleteFrom, to: deleteTo }).run();
    } else {
      editor.chain().focus().run();
    }

    item.action(editor, setBlockModalConfig, addToast, () => setIsMuxModalOpen(true));
    setSlashMenu(m => ({ ...m, visible: false }));
    slashStartPos.current = null;
    // v2.3: track recent command usage
    try {
      const raw = localStorage.getItem('rte-recent-commands');
      const recent: string[] = raw ? JSON.parse(raw) : [];
      const updated = [item.id, ...recent.filter(id => id !== item.id)].slice(0, 5);
      localStorage.setItem('rte-recent-commands', JSON.stringify(updated));
    } catch { /* ignore */ }
  }, [editor, slashMenu.filter]);

  // Keep the refs handleKeyDown reads (declared above, before these two exist) in sync.
  useEffect(() => {
    filteredSlashRef.current = filteredSlash;
    executeSlashCommandRef.current = executeSlashCommand;
  }, [filteredSlash, executeSlashCommand]);

  useEffect(() => {
    if (slashMenu.visible && slashMenuRef.current) {
      const container = slashMenuRef.current.querySelector('.slash-menu-scroll-container') as HTMLDivElement | null;
      const selectedEl = slashMenuRef.current.querySelector('[data-selected="true"]') as HTMLButtonElement | null;
      if (container && selectedEl) {
        const containerTop = container.scrollTop;
        const containerBottom = containerTop + container.clientHeight;
        const elemTop = selectedEl.offsetTop;
        const elemBottom = elemTop + selectedEl.offsetHeight;

        if (elemBottom > containerBottom) {
          container.scrollTop = elemBottom - container.clientHeight;
        } else if (elemTop < containerTop) {
          container.scrollTop = elemTop;
        }
      }
    }
  }, [slashMenu.selected, slashMenu.visible]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (slashMenuRef.current && !slashMenuRef.current.contains(e.target as Node)) {
        setSlashMenu(m => ({ ...m, visible: false }));
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!slashMenu.visible) {
      slashStartPos.current = null;
    }
  }, [slashMenu.visible]);

  useEffect(() => {
    if (!editor || !multiSection) return;
    const sec = sections.find(s => s.id === activeSection);
    editor.commands.setContent(sec?.content || '', { emitUpdate: false });
    editor.commands.focus('start');
  }, [activeSection, editor, multiSection]);

  useEffect(() => {
    if (!content || !editor) return;
    const isEmpty = multiSection
      ? (sections.length === 1 && sections[0].id === 'main' && editor.isEmpty)
      : editor.isEmpty;
    if (isEmpty) {
      if (multiSection && Array.isArray(content) && content.length > 0) {
        const mapped = (content as any[]).map(s => ({ id: s.id || crypto.randomUUID(), label: s.label || 'Untitled', content: s.content || { type: 'doc', content: [] } }));
        setSections(mapped);
        setActiveSection(mapped[0].id);
        editor.commands.setContent(mapped[0].content, { emitUpdate: false });
      } else if (!multiSection && content) {
        editor.commands.setContent(content, { emitUpdate: false });
      }
    }
  }, [content, multiSection, editor]);

  // v2.3: Check for autosave recovery on mount
  useEffect(() => {
    const checkRecovery = async () => {
      // 1. Check server first
      const slugOrId = slug || pendingDraftId;
      if (slugOrId) {
        try {
          const res = await fetchAutosave(slugOrId, !slug);
          if (res.success && res.data?.autosaveContent && res.data?.autosavedAt) {
            const serverTs = new Date(res.data.autosavedAt).getTime();
            setRecoveryData({ 
              json: res.data.autosaveContent, 
              timestamp: serverTs,
              source: 'server' 
            });
            return; // Server takes priority
          }
        } catch (e) {}
      }

      // 2. Fallback to localStorage
      try {
        const raw = localStorage.getItem(`rte-recovery-${slug || 'new'}`);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        const ts = parsed._timestamp || parsed.timestamp || 0;
        const age = Date.now() - ts;

        // Only offer recovery if the save is older than 60s (not a fresh save) but under 7 days
        if (age > 60_000 && age < 7 * 24 * 3600 * 1000) {
          setRecoveryData({ json: parsed._content ?? parsed, timestamp: ts, source: 'local' });
        }
      } catch { /* ignore */ }
    };
    
    checkRecovery();
  }, [slug, pendingDraftId]);

  // v2.3: Persist word target to localStorage
  useEffect(() => {
    try { localStorage.setItem('rte-word-target', String(wordTarget)); } catch { /* ignore */ }
  }, [wordTarget]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault(); setIsFocusMode(v => !v);
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault(); setEditorMode(m => m === 'preview' ? 'visual' : 'preview');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (!editor) return (
    <div className="rounded-xl h-96 animate-pulse" style={{ background: BG_SURFACE, border: `1px solid ${BORDER}` }}>
      <div className="h-12 rounded-t-xl" style={{ background: BG_ELEVATED, borderBottom: `1px solid ${BORDER}` }} />
    </div>
  );

  // --- Handlers ----------------------------------------------------------------

  const handleAddImage = () => {
    setBlockModalConfig(buildImageInsertConfig(editor));
  };

  const handleOpenLinkPanel = () => setShowLinkPanel(true);

  const handleApplyLink = (href: string, newTab: boolean) => {
    // Validate the URL through the shared allowlist before it reaches TipTap's
    // setLink(), which bypasses DOMPurify (DOMPurify only sanitises HTML strings,
    // not ProseMirror schema commands).
    const safe = sanitizeUrl(href);
    if (safe === null) {
      addToast({
        type: 'error',
        message: 'Link blocked: only http, https, mailto, and tel URLs are allowed.',
      });
      return;
    }
    const attrs: any = { href: safe };
    if (newTab) {
      attrs.target = '_blank';
      attrs.rel = 'noopener noreferrer';
    }
    editor.chain().focus().setLink(attrs).run();
  };

  const handleApplyArticleLink = (article: PickedArticle) => {
    const contentTypeToPath: Record<string, string> = {
      REVIEW: 'reviews',
      GUIDE: 'guides',
    };
    const path = contentTypeToPath[article.contentType] ?? 'articles';
    const href = `/${path}/${article.slug}`;
    editor.chain().focus().extendMarkRange('link').setLink({ href, target: null, rel: null }).run();
    setShowArticleLinkPanel(false);
  };

  const handleApplyGameLink = (game: PickedGame) => {
    const href = `/games/${game.slug}`;
    editor.chain().focus().extendMarkRange('link').setLink({ href, target: null, rel: null }).run();
    setShowGameLinkPanel(false);
  };

  const handleYoutube = () => {
    setBlockModalConfig({
      title: 'YouTube Embed',
      fields: [{ key: 'url', label: 'YouTube URL', type: 'url', placeholder: 'https://youtube.com/watch?v=...', required: true }],
      onInsert: ({ url }) => editor.chain().focus().setYoutubeVideo({ src: String(url) }).run(),
    });
  };

  // ✅ FIX 6 + FIX 7: Correct HTML source mode — open captures current HTML,
  // apply uses sanitizeHTML then setContent with parseOptions so classes/styles
  // and nested layouts are preserved on round-trip

  const handleOpenHtmlSource = () => {
    setHtmlSourceValue(editor.getHTML());
    setEditorMode('html');
  };

  const handleOpenMarkdownSource = () => {
    // Use the official tiptap-markdown serializer to get pristine Markdown 
    const md = (editor.storage as any).markdown.getMarkdown();
    setMarkdownSourceValue(md);
    setEditorMode('markdown');
  };

  const handleApplyMarkdownSource = () => {
    // We no longer strip {#id} tags because marked-custom-heading-id handles them natively
    const parsedHtml = marked.parse(markdownSourceValue, { async: false }) as string;
    const withTasks = convertMarkdownTaskLists(parsedHtml);
    
    // Restore callout classes that were lost during markdown serialization
    const restoredCallouts = withTasks.replace(/<blockquote>\s*<p>(?:✦\s*)?(?:<strong>)?(Tip|Warning|Info|Danger|Note):?(?:<\/strong>)?/gi, (_match, type) => {
      const typeLower = type.toLowerCase();
      // map note to info
      const calloutType = typeLower === 'note' ? 'info' : typeLower;
      return `<blockquote class="callout-${calloutType}"><p>✦ <strong>${type}:</strong>`;
    });
    
    const clean = sanitizeHTML(restoredCallouts);
    editor.commands.setContent(clean, { emitUpdate: true, parseOptions: { preserveWhitespace: 'full' } });
    setEditorMode('visual');
  };

  const handleApplyHtmlSource = () => {
    // 1. Flatten deeply-nested redundant spans (reduces 2.5MB → ~200KB)
    const flattened = flattenRedundantSpans(htmlSourceValue);
    // 2. Sanitize for XSS
    const clean = sanitizeHTML(flattened);
    // 3. emitUpdate:true ensures onUpdate fires so onChange/state updates with new JSON
    editor.commands.setContent(clean, { emitUpdate: true, parseOptions: { preserveWhitespace: 'full' } });
    setEditorMode('visual');
  };

  // ✅ FIX 5: Correct insertContent() — always pass parseOptions to prevent escaping
  const insertHTML = (html: string) => {
    editor.chain().focus().insertContent(html, {
      parseOptions: { preserveWhitespace: 'full' },
    }).run();
  };

  const insertCallout = (type: 'info' | 'warning' | 'tip' | 'danger') => {
    const configs = {
      info: { cls: 'callout-info', icon: '💡', label: 'Info' },
      warning: { cls: 'callout-warning', icon: '⚠️', label: 'Warning' },
      tip: { cls: 'callout-tip', icon: '✦', label: 'Tip' },
      danger: { cls: 'callout-danger', icon: '🚫', label: 'Danger' },
    };
    const { cls, icon, label } = configs[type];
    insertHTML(`<blockquote class="${cls}"><p>${icon} <strong>${label}:</strong> Write your note here…</p></blockquote>`);
  };

  // Section helpers
  const addSection = () => {
    if (multiSection) {
      setShowSectionTemplatePicker(true);
    } else {
      const id = `section-${Date.now()}`;
      const newSections = [...sections, { id, label: 'New Section', content: null }];
      setSections(newSections); onChange?.(newSections);
      setActiveSection(id); setEditingTabId(id); setTabEditValue('New Section');
    }
  };

  const addSectionFromTemplate = (templateKey: string | null) => {
    setShowSectionTemplatePicker(false);
    const id = `section-${Date.now()}`;
    if (templateKey && SECTION_TEMPLATES[templateKey]) {
      const tpl = SECTION_TEMPLATES[templateKey];
      const newSections = [...sections, { id, label: tpl.label, content: tpl.content }];
      setSections(newSections); onChange?.(newSections);
      setActiveSection(id);
    } else {
      const newSections = [...sections, { id, label: 'New Section', content: null }];
      setSections(newSections); onChange?.(newSections);
      setActiveSection(id); setEditingTabId(id); setTabEditValue('New Section');
    }
  };

  const removeSection = (id: string) => {
    const newSections = sections.filter(s => s.id !== id);
    setSections(newSections); onChange?.(newSections);
    if (activeSection === id) setActiveSection(newSections[0]?.id ?? '');
  };

  const commitTabEdit = () => {
    if (!editingTabId) return;
    setSections(sections.map(s => s.id === editingTabId ? { ...s, label: tabEditValue || s.label } : s));
    setEditingTabId(null);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (!draggedTabId || draggedTabId === id) return;
    const dragIdx = sections.findIndex(s => s.id === draggedTabId);
    const dropIdx = sections.findIndex(s => s.id === id);
    const newSections = [...sections];
    const [removed] = newSections.splice(dragIdx, 1);
    newSections.splice(dropIdx, 0, removed);
    setSections(newSections);
  };

  // Fix #3: Walk ProseMirror doc nodes to find proper text positions instead of
  // using doc.textContent offsets (which ignore node boundaries and are always wrong).
  // (findNextRef is declared above the early-return guard — see Rules of Hooks)
  const findNext = () => {
    if (!findText || !editor) return;
    const doc = editor.state.doc;
    let found = false;
    const startSearch = findNextRef.current >= 0 ? findNextRef.current + 1 : 0;

    // First pass: from current position to end
    doc.nodesBetween(startSearch, doc.content.size, (node, pos) => {
      if (found) return false;
      if (!node.isText) return;
      const text = node.text || '';
      const idx = text.indexOf(findText);
      if (idx !== -1) {
        const from = pos + idx;
        const to = from + findText.length;
        editor.chain().focus().setTextSelection({ from, to }).run();
        findNextRef.current = from;
        found = true;
        return false;
      }
    });

    // Second pass: wrap around from beginning if not found
    if (!found && startSearch > 0) {
      findNextRef.current = -1;
      doc.nodesBetween(0, startSearch, (node, pos) => {
        if (found) return false;
        if (!node.isText) return;
        const text = node.text || '';
        const idx = text.indexOf(findText);
        if (idx !== -1) {
          const from = pos + idx;
          const to = from + findText.length;
          editor.chain().focus().setTextSelection({ from, to }).run();
          findNextRef.current = from;
          found = true;
          return false;
        }
      });
    }
  };

  // Fix #22: replaceAll previously did `.split(findText).join(replaceText)` on raw HTML
  // which would corrupt href/alt attributes. Now we walk text nodes properly.
  const replaceAll = () => {
    if (!findText || !editor) return;
    const { tr } = editor.state;
    let offset = 0;
    editor.state.doc.descendants((node, pos) => {
      if (!node.isText || !node.text) return;
      const text = node.text;
      let idx = text.indexOf(findText);
      while (idx !== -1) {
        const from = pos + idx + offset;
        const to = from + findText.length;
        tr.replaceWith(from, to, editor.state.schema.text(replaceText));
        offset += replaceText.length - findText.length;
        idx = text.indexOf(findText, idx + findText.length);
      }
    });
    editor.view.dispatch(tr);
  };

  const words = editor.storage.characterCount.words();
  const chars = editor.storage.characterCount.characters();
  const activeSectionLabel = sections.find(s => s.id === activeSection)?.label ?? '';
  const previewWidth = { desktop: '100%', tablet: '768px', mobile: '375px' }[previewDevice];

  const modeTabs: { id: EditorMode; label: string; icon: typeof Eye }[] = [
    { id: 'visual', label: 'Write', icon: FileText },
    { id: 'markdown', label: 'Markdown', icon: FileCode },
    { id: 'html', label: 'HTML', icon: Code2 },
    { id: 'preview', label: 'Preview', icon: Eye },
    { id: 'split', label: 'Split', icon: Columns },
  ];

  const togglePanel = (p: ActivePanel) => setActivePanel(a => a === p ? null : p);

  return (
    <div
      data-theme={theme}
      className={cn(
        'gaming-editor flex flex-col overflow-hidden',
        isFullScreen ? 'fixed inset-0 z-[100]' : 'relative rounded-xl h-[900px]',
      )}
      style={{
        background: BG_BASE,
        border: `1px solid ${BORDER}`,
        boxShadow: isFullScreen ? 'none' : '0 0 0 1px var(--ed-accent-dim), 0 24px 60px rgba(0,0,0,0.4)',
      }}
    >

      {/* Top bar */}
      <div className="ed-topbar flex items-center justify-between px-3 py-2 shrink-0">
        <div className="flex items-center gap-0.5 rounded-lg p-0.5" style={{ background: BG_BASE }}>
          {modeTabs.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => {
              if (id === 'html') handleOpenHtmlSource();
              else if (id === 'markdown') handleOpenMarkdownSource();
              else setEditorMode(id);
            }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
              style={{
                color: editorMode === id ? 'var(--ed-text)' : 'var(--ed-text-muted)',
                background: editorMode === id ? BG_ELEVATED : 'transparent',
                border: editorMode === id ? `1px solid ${BORDER}` : '1px solid transparent',
              }}>
              <Icon className="w-3 h-3" />{label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {(editorMode === 'preview' || editorMode === 'split') && (
            <div className="flex items-center gap-0.5 mr-2">
              {([
                { id: 'desktop' as PreviewDevice, icon: Monitor },
                { id: 'tablet' as PreviewDevice, icon: Tablet },
                { id: 'mobile' as PreviewDevice, icon: Smartphone },
              ] as const).map(({ id, icon: Icon }) => (
                <button key={id} type="button" onClick={() => setPreviewDevice(id)}
                  className="p-1.5 rounded-lg transition-all"
                  style={{ color: previewDevice === id ? ACCENT : 'var(--ed-text-muted)', background: previewDevice === id ? 'var(--ed-accent-dim)' : 'transparent' }}>
                  <Icon className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
          )}
          <button type="button" onClick={() => togglePanel('insights')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all"
            style={{ color: activePanel === 'insights' ? ACCENT : 'var(--ed-text-muted)', background: activePanel === 'insights' ? 'var(--ed-accent-dim)' : 'transparent' }}>
            <BarChart2 className="w-3 h-3" /> Stats
          </button>
          <button type="button" onClick={() => togglePanel('seo')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all"
            style={{ color: activePanel === 'seo' ? ACCENT : 'var(--ed-text-muted)', background: activePanel === 'seo' ? 'var(--ed-accent-dim)' : 'transparent' }}>
            <Globe className="w-3 h-3" /> SEO
          </button>
          <button type="button" onClick={() => togglePanel('export')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all"
            style={{ color: activePanel === 'export' ? ACCENT : 'var(--ed-text-muted)', background: activePanel === 'export' ? 'var(--ed-accent-dim)' : 'transparent' }}>
            <Download className="w-3 h-3" /> Export
          </button>
          {slug && (
            <button type="button" onClick={() => togglePanel('history')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all"
              style={{ color: activePanel === 'history' ? ACCENT : 'var(--ed-text-muted)', background: activePanel === 'history' ? 'var(--ed-accent-dim)' : 'transparent' }}>
              <History className="w-3 h-3" /> History
            </button>
          )}
          <div className="w-px h-4 mx-1" style={{ background: BORDER }} />
          <button type="button" onClick={() => setIsFocusMode(v => !v)} title="Focus Mode (⌘⇧F)"
            className="p-1.5 rounded-lg transition-all"
            style={{ color: isFocusMode ? ACCENT : 'var(--ed-text-muted)', background: isFocusMode ? 'var(--ed-accent-dim)' : 'transparent' }}>
            {isFocusMode ? <EyeOff className="w-3.5 h-3.5" /> : <Target className="w-3.5 h-3.5" />}
          </button>
          <button type="button" onClick={() => setIsFullScreen(v => !v)} title="Fullscreen"
            className="p-1.5 rounded-lg transition-all" style={{ color: 'var(--ed-text-muted)', background: 'transparent' }}>
            {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Fullscreen Mode: Horizontal Top Toolbar (replaces left sidebar) */}
      {editorMode === 'visual' && (
        <FullscreenTopToolbar
          editor={editor}
          showLinkPanel={showLinkPanel}
          setShowLinkPanel={setShowLinkPanel}
          showArticleLinkPanel={showArticleLinkPanel}
          setShowArticleLinkPanel={setShowArticleLinkPanel}
          showGameLinkPanel={showGameLinkPanel}
          setShowGameLinkPanel={setShowGameLinkPanel}
          showTextColor={showTextColor}
          setShowTextColor={setShowTextColor}
          showHighlight={showHighlight}
          setShowHighlight={setShowHighlight}
          showCalloutMenu={showCalloutMenu}
          setShowCalloutMenu={setShowCalloutMenu}
          calloutMenuRef={calloutMenuRef}
          showBadgeMenu={showBadgeMenu}
          setShowBadgeMenu={setShowBadgeMenu}
          showFindReplace={showFindReplace}
          setShowFindReplace={setShowFindReplace}
          setShowShortcutsPanel={setShowShortcutsPanel}
          activePanel={activePanel}
          togglePanel={togglePanel}
          slug={slug}
            handleSlashAction={handleSlashAction}
            handleAddImage={handleAddImage}
          handleYoutube={handleYoutube}
          handleApplyLink={handleApplyLink}
          handleApplyArticleLink={handleApplyArticleLink}
          handleApplyGameLink={handleApplyGameLink}
          insertCallout={insertCallout}
        />
      )}

      {/* v2.3: Autosave Recovery Banner */}
      {recoveryData && (
        <RecoveryBanner
          timestamp={recoveryData.timestamp}
          source={recoveryData.source}
          onRestore={() => {
            if (editor && recoveryData.json) {
              // Fix #24: Safely extract the content from both server (autosaveContent directly)
              // and local (_{content, timestamp}) storage formats, so we never load a
              // wrapper object as editor content.
              const raw = recoveryData.json;
              let contentToRestore: any;
              if (raw?._content !== undefined) {
                // Local autosave: { _content: TipTap JSON, _timestamp: number }
                contentToRestore = raw._content;
              } else if (raw?.type === 'doc' || raw?.content) {
                // Looks like a direct TipTap JSON doc or content array
                contentToRestore = raw;
              } else {
                // Unknown shape — log and bail to prevent corruption
                console.warn('[RTE] Recovery: unrecognised autosave format', raw);
                contentToRestore = null;
              }
              if (contentToRestore) {
                editor.commands.setContent(contentToRestore, { emitUpdate: false, parseOptions: { preserveWhitespace: 'full' } });
              }
            }
            if (recoveryData.source === 'server') {
              const slugOrId = slug || pendingDraftId;
              if (slugOrId) deleteAutosave(slugOrId, !slug).catch(() => {});
            }
            setRecoveryData(null);
            try { localStorage.removeItem(`rte-recovery-${slug || 'new'}`); } catch { /* ignore */ }
          }}
          onDismiss={() => {
            if (recoveryData.source === 'server') {
              const slugOrId = slug || pendingDraftId;
              if (slugOrId) deleteAutosave(slugOrId, !slug).catch(() => {});
            }
            setRecoveryData(null);
            try { localStorage.removeItem(`rte-recovery-${slug || 'new'}`); } catch { /* ignore */ }
          }}
        />
      )}

      {/* v2.3: Section Template Picker */}
      {showSectionTemplatePicker && (
        <div className="flex items-center gap-2 px-3 py-2 shrink-0 flex-wrap"
          style={{ background: BG_ELEVATED, borderBottom: `1px solid ${BORDER}` }}>
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: `${ACCENT}60` }}>Pick a template:</span>
          {Object.entries(SECTION_TEMPLATES).map(([key, tpl]) => (
            <button key={key} type="button" onClick={() => addSectionFromTemplate(key)}
              className="px-3 py-1.5 rounded-lg text-xs transition-all"
              style={{ background: BG_BASE, border: `1px solid ${BORDER}`, color: 'var(--ed-text-dim)' }}>
              {tpl.label}
            </button>
          ))}
          <button type="button" onClick={() => addSectionFromTemplate(null)}
            className="px-3 py-1.5 rounded-lg text-xs transition-all"
            style={{ background: 'transparent', border: `1px solid ${BORDER}`, color: 'var(--ed-text-muted)' }}>
            Blank
          </button>
          <button type="button" onClick={() => setShowSectionTemplatePicker(false)} className="ml-auto p-1 rounded" style={{ color: 'var(--ed-text-muted)' }}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Section Tabs */}
      {multiSection && (
        <div className="flex items-center gap-0.5 px-3 pt-2 overflow-x-auto no-scrollbar shrink-0"
          style={{ borderBottom: `1px solid ${BORDER}`, background: `${BG_ELEVATED}60` }}>
          {sections.map(sec => (
            <div key={sec.id} draggable={!editingTabId}
              onDragStart={() => setDraggedTabId(sec.id)}
              onDragOver={(e) => handleDragOver(e, sec.id)}
              onDragEnd={() => { setDraggedTabId(null); onChange?.(sections); }}
              className={cn('flex items-center group transition-all', draggedTabId === sec.id ? 'opacity-30' : '')}>
              {editingTabId === sec.id ? (
                <input autoFocus value={tabEditValue} onChange={e => setTabEditValue(e.target.value)}
                  onBlur={commitTabEdit}
                  onKeyDown={e => { if (e.key === 'Enter') commitTabEdit(); if (e.key === 'Escape') setEditingTabId(null); }}
                  className="text-xs px-2 py-1 rounded focus:outline-none w-28"
                  style={{ background: BG_SURFACE, border: `1px solid ${ACCENT_DIM}`, color: 'var(--ed-text)' }} />
              ) : (
                <button type="button"
                  onDoubleClick={() => { setEditingTabId(sec.id); setTabEditValue(sec.label); }}
                  onClick={() => setActiveSection(sec.id)}
                  className="text-xs px-3 py-2 rounded-t-lg transition-colors whitespace-nowrap"
                  style={{
                    color: activeSection === sec.id ? 'var(--ed-text)' : 'var(--ed-text-muted)',
                    background: activeSection === sec.id ? BG_BASE : 'transparent',
                    borderTop: activeSection === sec.id ? `1px solid ${BORDER}` : 'none',
                    borderLeft: activeSection === sec.id ? `1px solid ${BORDER}` : 'none',
                    borderRight: activeSection === sec.id ? `1px solid ${BORDER}` : 'none',
                  }}>
                  {sec.label}
                </button>
              )}
              {sections.length > 1 && (
                <button type="button" onClick={() => removeSection(sec.id)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 ml-0.5 transition-opacity rounded"
                  style={{ color: 'var(--ed-text-muted)' }}>
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={addSection} className="ml-1 p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--ed-text-muted)' }} title="Add Section">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      )}


      {/* Find & Replace */}
      {showFindReplace && (
        <div className="flex flex-wrap items-center gap-3 px-3 py-2.5 shrink-0"
          style={{ background: BG_ELEVATED, borderBottom: `1px solid ${BORDER}` }}>
          <input type="text" placeholder="Find…" value={findText} onChange={e => setFindText(e.target.value)} onKeyDown={e => e.key === 'Enter' && findNext()}
            className="rounded-lg px-3 py-1.5 text-xs focus:outline-none w-36"
            style={{ background: BG_BASE, border: `1px solid ${BORDER}`, color: 'var(--ed-text)' }} />
          <input type="text" placeholder="Replace…" value={replaceText} onChange={e => setReplaceText(e.target.value)}
            className="rounded-lg px-3 py-1.5 text-xs focus:outline-none w-36"
            style={{ background: BG_BASE, border: `1px solid ${BORDER}`, color: 'var(--ed-text)' }} />
          <button type="button" onClick={findNext} className="px-3 py-1.5 text-xs rounded-lg" style={{ background: BG_BASE, border: `1px solid ${BORDER}`, color: 'var(--ed-text-dim)' }}>Next</button>
          <button type="button" onClick={replaceAll} className="px-3 py-1.5 text-xs rounded-lg font-bold" style={{ background: 'var(--ed-accent-dim)', border: `1px solid ${ACCENT_DIM}`, color: ACCENT }}>Replace All</button>
          <button type="button" onClick={() => setShowFindReplace(false)} className="ml-auto rounded-lg p-1" style={{ color: 'var(--ed-text-muted)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bubble Menu — replaced by the right properties panel in fullscreen */}
      {editorMode === 'visual' && !isFullScreen && (
        <BubbleToolbar editor={editor} addToast={addToast} />
      )}

      {/* Body */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* Fullscreen Mode: Context Inspector (left panel) */}
        {editorMode === 'visual' && (
          <FullscreenPropertiesPanel
            editor={editor}
            showPanelTextColor={showPanelTextColor}
            setShowPanelTextColor={setShowPanelTextColor}
            showPanelHighlight={showPanelHighlight}
            setShowPanelHighlight={setShowPanelHighlight}
            isFullScreen={isFullScreen}
          />
        )}

        {editorMode !== 'preview' && (
        <div className={cn('flex-1 overflow-auto custom-scrollbar relative', editorMode === 'split' && 'border-r')}
          style={editorMode === 'split' ? { borderColor: BORDER } : {}}>

          {/* Contextual Table Toolbar */}
          {editorMode === 'visual' && editor.isActive('table') && (
            <div
              className="sticky top-0 z-20 flex flex-wrap items-center gap-1 px-3 py-1.5 shrink-0 overflow-x-auto no-scrollbar shadow-lg"
              style={{
                background: 'var(--ed-warn-bg)',
                borderTop: '1px solid var(--ed-warn-border)',
                borderBottom: '1px solid var(--ed-warn-border)',
                color: 'var(--ed-warn-text)',
              }}
            >
              <span className="text-[10px] font-bold uppercase tracking-widest mr-2" style={{ color: 'var(--ed-warn-text-dim)' }}>Table</span>

              <ToolBtn onClick={() => editor.chain().focus().addRowBefore().run()} label="Row Above" className="text-[11px] px-2 py-0.5 h-auto" style={{ color: 'var(--ed-warn-text)' }}>↑ Row Above</ToolBtn>
              <ToolBtn onClick={() => editor.chain().focus().addRowAfter().run()} label="Row Below" className="text-[11px] px-2 py-0.5 h-auto" style={{ color: 'var(--ed-warn-text)' }}>↓ Row Below</ToolBtn>
              <ToolBtn onClick={() => editor.chain().focus().deleteRow().run()} label="Delete Row" className="text-[11px] px-2 py-0.5 h-auto" style={{ color: 'var(--ed-danger-text)' }}>✕ Delete Row</ToolBtn>

              <Divider />

              <ToolBtn onClick={() => editor.chain().focus().addColumnBefore().run()} label="Col Left" className="text-[11px] px-2 py-0.5 h-auto" style={{ color: 'var(--ed-warn-text)' }}>← Col Left</ToolBtn>
              <ToolBtn onClick={() => editor.chain().focus().addColumnAfter().run()} label="Col Right" className="text-[11px] px-2 py-0.5 h-auto" style={{ color: 'var(--ed-warn-text)' }}>→ Col Right</ToolBtn>
              <ToolBtn onClick={() => editor.chain().focus().deleteColumn().run()} label="Delete Col" className="text-[11px] px-2 py-0.5 h-auto" style={{ color: 'var(--ed-danger-text)' }}>✕ Delete Col</ToolBtn>

              <Divider />

              <ToolBtn onClick={() => editor.chain().focus().mergeCells().run()} label="Merge Cells" className="text-[11px] px-2 py-0.5 h-auto" style={{ color: 'var(--ed-warn-text)' }}>Merge Cells</ToolBtn>
              <ToolBtn onClick={() => editor.chain().focus().splitCell().run()} label="Split Cell" className="text-[11px] px-2 py-0.5 h-auto" style={{ color: 'var(--ed-warn-text)' }}>Split Cell</ToolBtn>
              <ToolBtn onClick={() => editor.chain().focus().toggleHeaderRow().run()} label="Toggle Header Row" className="text-[11px] px-2 py-0.5 h-auto" style={{ color: 'var(--ed-warn-text)' }}>Toggle Header</ToolBtn>

              <Divider />

              {(() => {
                const stacked = !!editor.getAttributes('table').mobileStacked;
                return (
                  <ToolBtn
                    onClick={() => editor.chain().focus().updateAttributes('table', { mobileStacked: !stacked }).run()}
                    active={stacked}
                    label={stacked ? 'Mobile: Stacked cards (on) — tap to use default table' : 'Mobile: Default table — tap to stack into cards'}
                    className="text-[11px] px-2 py-0.5 h-auto"
                    style={{ color: stacked ? 'var(--ed-accent)' : 'var(--ed-warn-text)' }}
                  >
                    {stacked ? '📱 Stacked ✓' : '📱 Stack on Mobile'}
                  </ToolBtn>
                );
              })()}

              <Divider />

              <ToolBtn onClick={() => editor.chain().focus().deleteTable().run()} label="Delete Table" className="text-[11px] px-2 py-0.5 h-auto font-bold ml-auto" style={{ color: 'var(--ed-danger-text)' }}>🗑 Delete Table</ToolBtn>
            </div>
          )}

          {(editorMode === 'visual' || editorMode === 'split') && (
            <div className="mx-auto h-full" style={{ width: '100%', maxWidth: '849.59px' }}>
              <ErrorBoundary fallbackMessage="Editor render error — click Reload to recover">
                <DragHandleOverlay editor={editor} />
                <EditorContent editor={editor} className={cn('gaming-content gaming-prose-wrapper', isFocusMode && 'focus-mode-active')} />
              </ErrorBoundary>
            </div>
          )}

          {/* ✅ FIX 6: HTML Source Mode */}
          {editorMode === 'html' && (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between px-4 py-2 shrink-0"
                style={{ borderBottom: `1px solid ${BORDER}`, background: BG_ELEVATED }}>
                <span className="text-xs font-medium" style={{ color: 'var(--ed-text-dim)' }}>HTML Source — DOMPurify sanitized on apply</span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setEditorMode('visual')}
                    className="px-3 py-1 rounded-lg text-xs transition-colors"
                    style={{ background: BG_BASE, border: `1px solid ${BORDER}`, color: 'var(--ed-text-dim)' }}>Cancel</button>
                  <button type="button" onClick={handleApplyHtmlSource}
                    className="px-3 py-1 rounded-lg text-xs font-bold transition-colors"
                    style={{ background: 'var(--ed-accent-dim)', border: `1px solid ${ACCENT_DIM}`, color: ACCENT }}>Apply HTML</button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                <div className="mx-auto h-full flex" style={{ minHeight: '420px', width: '100%', maxWidth: '849.59px' }}>
                  <textarea
                    value={htmlSourceValue}
                    onChange={e => setHtmlSourceValue(e.target.value)}
                    className="flex-1 font-mono text-sm resize-none focus:outline-none leading-relaxed ed-html-source custom-scrollbar"
                    style={{ background: 'transparent', color: 'var(--ed-text)', caretColor: ACCENT, padding: '40px 0' }}
                    spellCheck={false}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Markdown Source Mode */}
          {editorMode === 'markdown' && (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between px-4 py-2 shrink-0"
                style={{ borderBottom: `1px solid ${BORDER}`, background: BG_ELEVATED }}>
                <span className="text-xs font-medium" style={{ color: 'var(--ed-text-dim)' }}>Markdown Source</span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setEditorMode('visual')}
                    className="px-3 py-1 rounded-lg text-xs transition-colors"
                    style={{ background: BG_BASE, border: `1px solid ${BORDER}`, color: 'var(--ed-text-dim)' }}>Cancel</button>
                  <button type="button" onClick={handleApplyMarkdownSource}
                    className="px-3 py-1 rounded-lg text-xs font-bold transition-colors"
                    style={{ background: 'var(--ed-accent-dim)', border: `1px solid ${ACCENT_DIM}`, color: ACCENT }}>Apply Markdown</button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                <div className="mx-auto h-full flex" style={{ minHeight: '420px', width: '100%', maxWidth: '849.59px' }}>
                  <textarea
                    value={markdownSourceValue}
                    onChange={e => setMarkdownSourceValue(e.target.value)}
                    className="flex-1 font-mono text-sm resize-none focus:outline-none leading-relaxed ed-html-source custom-scrollbar"
                    style={{ background: 'transparent', color: 'var(--ed-text)', caretColor: ACCENT, padding: '40px 0' }}
                    spellCheck={false}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        )}

        {/* ✅ FIX 11: Preview Mode — renders actual HTML via dangerouslySetInnerHTML (sanitized) */}
        {(editorMode === 'preview' || editorMode === 'split') && (
          <div className="flex-1 overflow-y-auto custom-scrollbar flex justify-center items-start p-6" style={{ background: 'var(--ed-bg)' }}>
            <div style={{ width: previewWidth, maxWidth: '100%', transition: 'width 0.3s ease' }} className="rounded-xl overflow-hidden shrink-0">
              <div
                className="min-h-full gaming-content"
                style={{ background: 'var(--ed-surface)', padding: '40px' }}
                // sanitizeHTML ensures this is XSS-safe while preserving gaming layouts
                dangerouslySetInnerHTML={{ __html: sanitizeHTML(editor.getHTML()) }}
              />
            </div>
          </div>
        )}

        {activePanel === 'insights' && <InsightsPanel editor={editor} />}
        {activePanel === 'seo' && <SEOPanel postTitle={postTitle} onMetaChange={onMetaChange} />}
        {activePanel === 'export' && <ExportPanel editor={editor} onClose={() => setActivePanel(null)} />}
        {activePanel === 'history' && <HistoryPanel slug={slug} editor={editor} onClose={() => setActivePanel(null)} />}


      </div>

      {/* Status Bar */}
      {(editor.isFocused || !editor.isEmpty) && (
        <div className="ed-statusbar px-4 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest" style={{ color: 'var(--ed-text-muted)' }}>
            {/* v2.3: Clickable word count ring with configurable target */}
            <div className="relative">
              <svg className="word-ring cursor-pointer" viewBox="0 0 36 36" onClick={() => setShowWordTarget(v => !v)}>
                <title>Target: {wordTarget} words — click to change</title>
                <circle className="track" cx="18" cy="18" r="15.5" />
                <circle className="fill" cx="18" cy="18" r="15.5"
                  strokeDasharray="97.4" strokeDashoffset={97.4 - (97.4 * Math.min(1, words / wordTarget))} />
              </svg>
              {showWordTarget && (
                <WordTargetPopover
                  current={wordTarget}
                  onClose={() => setShowWordTarget(false)}
                  onSet={setWordTarget}
                />
              )}
            </div>
            <span>{words.toLocaleString()} words</span>
            <span>{chars.toLocaleString()} chars</span>
            {multiSection && <span style={{ color: `${ACCENT}60` }}>{activeSectionLabel}</span>}
            <span>~{estimateReadTime(words)} min read</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest">
            <span className="flex items-center gap-1.5 transition-colors" style={{
              color: autoSaveStatus === 'saving' ? '#FFB300' : autoSaveStatus === 'saved' ? '#00E676' : 'var(--ed-text-muted)',
            }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{
                background: autoSaveStatus === 'saving' ? '#FFB300' : autoSaveStatus === 'saved' ? '#00E676' : 'var(--ed-text-muted)',
                boxShadow: autoSaveStatus === 'saved' ? '0 0 6px #00E676' : 'none',
              }} />
              {autoSaveStatus === 'saving' ? 'Saving…' : autoSaveStatus === 'saved' ? 'Saved' : 'Draft'}
            </span>
            <span style={{ color: 'var(--ed-border)' }}>Gaming CMS</span>
            <span style={{ color: ACCENT, opacity: 0.4 }}>v2.4</span>
          </div>
        </div>
      )}

      {/* Slash Command Menu */}
      {slashMenu.visible && filteredSlash.length > 0 && (
        <div ref={slashMenuRef}
          className="fixed z-50 w-72 rounded-xl overflow-hidden shadow-2xl"
          style={{
            top: slashMenu.coords.top, left: slashMenu.coords.left,
            background: BG_SURFACE, border: `1px solid ${BORDER}`,
            boxShadow: '0 20px 60px var(--ed-bg), 0 0 0 1px var(--ed-accent-dim)',
          }}>
          {slashMenu.filter && (
            <div className="px-3 pt-2 pb-1 text-[10px] font-mono" style={{ color: `${ACCENT}60` }}>
              / {slashMenu.filter}
            </div>
          )}
          <div className="slash-menu-scroll-container overflow-y-auto custom-scrollbar" style={{ maxHeight: '280px' }}>
            {Array.from(new Set(filteredSlash.map(i => i.group))).map(group => {
              const groupItems = filteredSlash.filter(i => i.group === group);
              const groupStart = filteredSlash.indexOf(groupItems[0]);
              return (
                <div key={group}>
                  <div className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: `${ACCENT}40` }}>{group}</div>
                  {groupItems.map((item, j) => {
                    const idx = groupStart + j;
                    return (
                      <button key={item.id} type="button"
                        data-selected={slashMenu.selected === idx}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left transition-colors"
                        style={{
                          background: slashMenu.selected === idx ? 'var(--ed-accent-dim)' : 'transparent',
                          color: slashMenu.selected === idx ? 'var(--ed-text)' : '#5a7090',
                        }}
                        onMouseEnter={() => setSlashMenu(m => ({ ...m, selected: idx }))}
                        onClick={() => executeSlashCommand(item)}>
                        <span className="w-7 h-7 flex items-center justify-center text-sm rounded-lg font-mono font-bold shrink-0"
                          style={{ background: BG_ELEVATED, border: `1px solid ${BORDER}`, color: ACCENT }}>
                          {item.icon}
                        </span>
                        <span className="text-xs font-medium">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Shortcuts Reference Panel */}
      {showShortcutsPanel && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowShortcutsPanel(false)}>
          <div className="border border-[var(--ed-border)] rounded-xl p-6 w-[480px] shadow-2xl" style={{ background: 'var(--ed-surface)' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-[var(--ed-border)]">
              <h3 className="font-bold text-[var(--ed-text)] flex items-center gap-2"><span className="text-[18px]">⌨</span> Keyboard Shortcuts</h3>
              <button type="button" onClick={() => setShowShortcutsPanel(false)} className="text-[#5a7090] hover:text-[var(--ed-text)]"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-xs">
              <div><span className="inline-block w-12 text-right mr-2 font-mono text-[var(--ed-accent)]">⌘B</span> <span className="text-[var(--ed-text-dim)]">Bold</span></div>
              <div><span className="inline-block w-12 text-right mr-2 font-mono text-[var(--ed-accent)]">⌘I</span> <span className="text-[var(--ed-text-dim)]">Italic</span></div>
              <div><span className="inline-block w-12 text-right mr-2 font-mono text-[var(--ed-accent)]">⌘U</span> <span className="text-[var(--ed-text-dim)]">Underline</span></div>
              <div><span className="inline-block w-12 text-right mr-2 font-mono text-[var(--ed-accent)]">⌘K</span> <span className="text-[var(--ed-text-dim)]">Link</span></div>
              <div><span className="inline-block w-12 text-right mr-2 font-mono text-[var(--ed-accent)]">⌘Z</span> <span className="text-[var(--ed-text-dim)]">Undo</span></div>
              <div><span className="inline-block w-12 text-right mr-2 font-mono text-[var(--ed-accent)]">⌘⇧Z</span> <span className="text-[var(--ed-text-dim)]">Redo</span></div>
              <div><span className="inline-block w-12 text-right mr-2 font-mono text-[var(--ed-accent)]">/</span> <span className="text-[var(--ed-text-dim)]">Slash Menu</span></div>
              <div><span className="inline-block w-12 text-right mr-2 font-mono text-[var(--ed-accent)]">⌘⇧F</span> <span className="text-[var(--ed-text-dim)]">Focus Mode</span></div>
              <div><span className="inline-block w-12 text-right mr-2 font-mono text-[var(--ed-accent)]">⌘⇧P</span> <span className="text-[var(--ed-text-dim)]">Preview Mode</span></div>
            </div>
            <div className="mt-6 pt-3 border-t border-[var(--ed-border)] text-center text-[10px] text-[#5a7090]">
              Use Ctrl on Windows/Linux instead of ⌘
            </div>
          </div>
        </div>
      )}

      {/* Block Insert Modal */}
      {blockModalConfig && (
        <BlockInsertModal
          {...blockModalConfig}
          onClose={() => setBlockModalConfig(null)}
        />
      )}

    </div>
  );
}

// --- Editor CSS ---------------------------------------------------------------

const EDITOR_CSS = `
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: var(--ed-accent-dim); border-radius: 2px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--ed-accent-dim); }

.gaming-prose-wrapper .ProseMirror {
  font-family: "IBM Plex Sans", system-ui, sans-serif;
  font-size: 16px; line-height: 1.85; color: var(--ed-text);
  min-height: 900px; padding: 40px 0 !important;
  outline: none; caret-color: var(--ed-accent);
  width: 100%;
}

.gaming-prose-wrapper .ProseMirror h1 {
  font-family: "Rajdhani", sans-serif; font-size: 2.5rem; font-weight: 700;
  letter-spacing: -0.02em; line-height: 1.15; margin: 0 0 1.25rem;
}
.gaming-prose-wrapper .ProseMirror h2 {
  font-family: "Rajdhani", sans-serif; font-size: 24px; font-weight: 600;
  letter-spacing: -0.01em; line-height: 1.2; margin: 2rem 0 1rem;
}
.gaming-prose-wrapper .ProseMirror h3 {
  font-family: "Rajdhani", sans-serif; font-size: 1.25rem; font-weight: 600;
  line-height: 1.25; margin: 1.5rem 0 0.75rem;
}
.gaming-prose-wrapper .ProseMirror h4 {
  font-family: "Rajdhani", sans-serif; font-size: 1rem; font-weight: 600;
  line-height: 1.3; margin: 1.25rem 0 0.5rem;
}
/* Fix #5 addendum: H5 / H6 were missing from editor internal CSS */
.gaming-prose-wrapper .ProseMirror h5 {
  font-family: "Rajdhani", sans-serif; font-size: 0.9rem; font-weight: 600;
  line-height: 1.3; margin: 1rem 0 0.4rem; text-transform: uppercase; letter-spacing: 0.04em;
}
.gaming-prose-wrapper .ProseMirror h6 {
  font-family: "Rajdhani", sans-serif; font-size: 0.8rem; font-weight: 500;
  line-height: 1.35; margin: 0.75rem 0 0.35rem; opacity: 0.75;
}
.gaming-prose-wrapper .ProseMirror p { font-size: 18px; margin-bottom: 1.25rem; }
/* Fix #9: Empty paragraphs were display:none in the editor — authors pressing Enter to space
   content would see nothing happen, which is very confusing. Now they show a subtle placeholder
   so the cursor target is visible. The frontend (gaming-content.css) still hides them. */
.gaming-prose-wrapper .ProseMirror p:empty,
.gaming-prose-wrapper .ProseMirror p:has(> br:only-child) {
  display: block;
  position: relative;
}
.gaming-prose-wrapper .ProseMirror p:empty::after {
  content: '\\200B';
  pointer-events: none;
}
.gaming-prose-wrapper .ProseMirror p:has(> br:only-child)::after {
  content: '';
}
.gaming-prose-wrapper .ProseMirror blockquote {
  border: 1px solid var(--ed-border); border-left: 4px solid var(--ed-accent);
  background: var(--ed-elevated);
  padding: 16px 20px; border-radius: 10px; color: var(--ed-text); font-style: italic; margin: 1.5rem 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}
.gaming-prose-wrapper .ProseMirror blockquote.callout-info,
.gaming-prose-wrapper .ProseMirror div.callout.callout-info {
  border-left-color: var(--ed-accent); background: linear-gradient(90deg, color-mix(in srgb, var(--ed-accent) 12%, transparent), transparent 80%);
}
.gaming-prose-wrapper .ProseMirror blockquote.callout-warning,
.gaming-prose-wrapper .ProseMirror div.callout.callout-warning {
  border-left-color: var(--color-warning); background: linear-gradient(90deg, color-mix(in srgb, var(--color-warning) 12%, transparent), transparent 80%); color: color-mix(in srgb, var(--color-warning) 80%, var(--ed-text));
}
.gaming-prose-wrapper .ProseMirror blockquote.callout-tip,
.gaming-prose-wrapper .ProseMirror div.callout.callout-tip {
  border-left-color: var(--color-success); background: linear-gradient(90deg, color-mix(in srgb, var(--color-success) 12%, transparent), transparent 80%); color: color-mix(in srgb, var(--color-success) 80%, var(--ed-text));
}
.gaming-prose-wrapper .ProseMirror blockquote.callout-danger,
.gaming-prose-wrapper .ProseMirror div.callout.callout-danger {
  border-left-color: var(--color-danger); background: linear-gradient(90deg, color-mix(in srgb, var(--color-danger) 12%, transparent), transparent 80%); color: color-mix(in srgb, var(--color-danger) 80%, var(--ed-text));
}

.gaming-prose-wrapper .ProseMirror div.callout {
  display: flex; gap: 16px; border-radius: 0 10px 10px 0; padding: 14px 20px; margin: 1.5rem 0; align-items: flex-start;
  border-left: 3px solid var(--ed-accent-dim); background: linear-gradient(90deg, var(--ed-accent-dim), transparent 80%);
  color: var(--ed-text-dim); font-style: italic;
}
.gaming-prose-wrapper .ProseMirror div.callout .callout-icon {
  flex-shrink: 0; font-style: normal; font-size: 1.2em; margin-top: -2px;
}
.gaming-prose-wrapper .ProseMirror div.callout .callout-content {
  flex: 1; min-width: 0;
}
.gaming-prose-wrapper .ProseMirror div.callout .callout-content p {
  margin: 0;
}
.gaming-prose-wrapper .ProseMirror pre {
  background: var(--ed-surface); border: 1px solid var(--ed-accent-dim); border-radius: 12px;
  padding: 20px 24px; overflow-x: auto; margin: 1.5rem 0;
}
.gaming-prose-wrapper .ProseMirror pre code {
  font-family: "JetBrains Mono", monospace; font-size: 0.875rem; line-height: 1.8; color: var(--ed-text-muted);
}
.gaming-prose-wrapper .ProseMirror code:not(pre code) {
  font-family: "JetBrains Mono", monospace; font-size: 0.85em;
  background: var(--ed-accent-dim); color: var(--ed-accent); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--ed-accent-dim);
}
.gaming-prose-wrapper .ProseMirror a { color: var(--brand-green); text-decoration: none; border-bottom: 1px solid color-mix(in srgb, var(--brand-green) 30%, transparent); transition: border-color 0.2s; }
.gaming-prose-wrapper .ProseMirror a:hover { border-color: var(--brand-green); }
.gaming-prose-wrapper .ProseMirror ul { padding-left: 1.5rem; margin-bottom: 0.75rem; }
.gaming-prose-wrapper .ProseMirror ul li::marker { color: inherit; }
.gaming-prose-wrapper .ProseMirror ol { padding-left: 1.5rem; margin-bottom: 0.75rem; }
.gaming-prose-wrapper .ProseMirror ol li::marker { color: inherit; font-weight: 600; }
.gaming-prose-wrapper .ProseMirror li { margin-bottom: 0.25rem; }
.gaming-prose-wrapper .ProseMirror li p { margin: 0; line-height: inherit; }

/* Bullet and numbered lists: Black in light mode, White in dark mode */
.gaming-editor[data-theme="light"] .gaming-prose-wrapper .ProseMirror ul,
.gaming-editor[data-theme="light"] .gaming-prose-wrapper .ProseMirror ol {
  color: #000000 !important;
}
.gaming-editor[data-theme="light"] .gaming-prose-wrapper .ProseMirror ul li::marker,
.gaming-editor[data-theme="light"] .gaming-prose-wrapper .ProseMirror ol li::marker {
  color: #000000 !important;
}

.gaming-editor[data-theme="dark"] .gaming-prose-wrapper .ProseMirror ul,
.gaming-editor[data-theme="dark"] .gaming-prose-wrapper .ProseMirror ol {
  color: #ffffff !important;
}
.gaming-editor[data-theme="dark"] .gaming-prose-wrapper .ProseMirror ul li::marker,
.gaming-editor[data-theme="dark"] .gaming-prose-wrapper .ProseMirror ol li::marker {
  color: #ffffff !important;
}

/* Custom list bullet rendering (restored) */
.gaming-prose-wrapper .ProseMirror ul[data-bullet] {
  list-style-type: none !important;
  padding-left: 1.5rem !important;
}
.gaming-prose-wrapper .ProseMirror ul[data-bullet] li {
  position: relative;
}
.gaming-prose-wrapper .ProseMirror ul[data-bullet] li::before {
  content: var(--list-bullet) !important;
  position: absolute;
  left: -1.4rem;
  top: 0;
  display: inline-block;
  text-align: center;
  font-family: sans-serif;
}
.gaming-prose-wrapper .ProseMirror ul[data-bullet] li::marker {
  display: none !important;
  content: "" !important;
}
.gaming-prose-wrapper .ProseMirror table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; font-size: 0.9rem; }
.gaming-prose-wrapper .ProseMirror th {
  background: var(--ed-elevated); color: var(--ed-accent); font-family: "Rajdhani", sans-serif; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.75rem;
  padding: 10px 14px; border: 1px solid var(--ed-accent-dim); text-align: left;
}
.gaming-prose-wrapper .ProseMirror td { padding: 9px 14px; border: 1px solid var(--ed-border); color: var(--ed-text-dim); }
.gaming-prose-wrapper .ProseMirror tr:nth-child(even) td { background: var(--ed-surface); }
.gaming-prose-wrapper .ProseMirror tr:hover td { background: var(--ed-accent-dim); transition: background 0.15s; }
.gaming-prose-wrapper .ProseMirror ul[data-type="taskList"] { padding-left: 0; }
.gaming-prose-wrapper .ProseMirror li[data-type="taskItem"] { display: flex; align-items: flex-start; gap: 10px; }
.gaming-prose-wrapper .ProseMirror li[data-type="taskItem"] input { accent-color: var(--ed-accent); margin-top: 4px; }
.gaming-prose-wrapper .ProseMirror hr {
  border: none; height: 1px;
  background: linear-gradient(90deg, transparent, var(--ed-accent-dim), transparent); margin: 2rem 0;
}
.gaming-prose-wrapper .ProseMirror img { max-width: 100%; border-radius: 10px; border: 1px solid var(--ed-border); margin: 1rem 0; }
.gaming-prose-wrapper .ProseMirror .youtube-embed { margin: 1.5rem 0; border-radius: 12px; overflow: hidden; }

/* Spoiler details */
.gaming-prose-wrapper .ProseMirror details.spoiler-block {
  border: 1px solid #FF4D4D20; background: #FF4D4D06; border-radius: 10px; padding: 14px 18px; margin: 1.25rem 0;
}
.gaming-prose-wrapper .ProseMirror details.spoiler-block summary {
  cursor: pointer; color: #FF8080; font-size: 0.9rem; font-weight: 600; user-select: none;
}

/* TOC block */
.gaming-prose-wrapper .ProseMirror .toc-block {
  background: var(--ed-elevated); border: 1px solid var(--ed-accent-dim); border-radius: 12px; padding: 20px; margin: 1.5rem 0;
}
.gaming-prose-wrapper .ProseMirror .toc-block h4 {
  color: var(--ed-accent); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.15em; margin: 0 0 12px;
}
.gaming-prose-wrapper .ProseMirror .toc-block ul { list-style: none; padding: 0; margin: 0; }
.gaming-prose-wrapper .ProseMirror .toc-block li { padding: 4px 0; font-size: 0.875rem; }
.gaming-prose-wrapper .ProseMirror .toc-block a { color: var(--ed-accent); border: none; }
.gaming-prose-wrapper .ProseMirror .toc-block a:hover { border-bottom: 1px solid var(--ed-accent); }

/* Pros/Cons */
.gaming-prose-wrapper .ProseMirror .pros-cons-block {
  display: grid; grid-template-columns: 1fr 1fr; gap: 0;
  border: 1px solid var(--ed-accent-dim); border-radius: 12px; overflow: hidden; margin: 1.5rem 0;
}
.gaming-prose-wrapper .ProseMirror .pros-cons-block .pros {
  padding: 16px 20px; background: #00E67606; border-right: 1px solid var(--ed-accent-dim);
}
.gaming-prose-wrapper .ProseMirror .pros-cons-block .cons { padding: 16px 20px; background: #FF4D4D06; }

/* Review score card in editor */
.gaming-prose-wrapper .ProseMirror .review-score-card { user-select: none; cursor: default; }
.gaming-prose-wrapper .ProseMirror .review-categories {
  padding: 16px 20px; border-bottom: 1px solid var(--ed-accent-dim); display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px;
}
.gaming-prose-wrapper .ProseMirror .review-category-row {
  display: flex; flex-direction: column; gap: 4px;
}
.gaming-prose-wrapper .ProseMirror .review-category-header {
  display: flex; justify-content: space-between; align-items: center; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;
}
.gaming-prose-wrapper .ProseMirror .review-category-label {
  color: var(--ed-text-dim); font-weight: 600;
}
.gaming-prose-wrapper .ProseMirror .review-category-score {
  color: var(--ed-accent); font-weight: 700;
}
.gaming-prose-wrapper .ProseMirror .review-category-bar {
  height: 6px; background: var(--ed-border); border-radius: 3px; overflow: hidden;
}
.gaming-prose-wrapper .ProseMirror .review-category-fill {
  height: 100%; background: linear-gradient(90deg, var(--ed-accent), #00B8D9); border-radius: 3px;
}

/* Placeholder — use position:absolute (not float:left) so the pseudo-element is
   fully out of text flow. float:left caused the caret to have no insertion point
   at position 0, making the spacebar silently fail on an empty editor. */
.gaming-prose-wrapper .ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder); color: var(--ed-border); pointer-events: none;
  position: absolute; height: 0; font-style: italic; font-size: 0.95rem;
}

/* Selection */
.gaming-prose-wrapper .ProseMirror ::selection { background: var(--ed-accent-dim); }
.gaming-prose-wrapper .ProseMirror .selectedCell { background: var(--ed-accent-dim) !important; }

/* Focus mode */
.focus-mode-active .ProseMirror > *:not(:focus-within) { opacity: 0.25; transition: opacity 0.4s; }
.focus-mode-active .ProseMirror > *:focus-within { opacity: 1 !important; }

/* Preview styles now in gaming-content.css — no duplication here */

/* Block drag handles (removed fake CSS implementation, replaced by DragHandleOverlay) */
.gaming-prose-wrapper .ProseMirror > * { position: relative; }

/* Word count progress ring */
.word-ring { width: 28px; height: 28px; transform: rotate(-90deg); }
.word-ring circle { fill: none; stroke-width: 2.5; stroke-linecap: round; transition: stroke-dashoffset 0.5s ease; }
.word-ring .track { stroke: var(--ed-border); }
.word-ring .fill { stroke: var(--ed-accent); }

/* Buy Recommendation Pill */
.gaming-prose-wrapper .ProseMirror .buy-recommendation-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'Rajdhani', sans-serif;
  font-weight: 700;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 6px 16px;
  border-radius: 20px;
  border: 1px solid transparent;
  user-select: none;
  margin: 4px;
}
.gaming-prose-wrapper .ProseMirror .buy-recommendation-pill.buy-now {
  background: rgba(0, 230, 118, 0.08);
  color: #00E676;
  border-color: rgba(0, 230, 118, 0.2);
  box-shadow: 0 0 10px rgba(0, 230, 118, 0.05);
}
.gaming-prose-wrapper .ProseMirror .buy-recommendation-pill.wait-for-sale {
  background: rgba(255, 179, 0, 0.08);
  color: #FFB300;
  border-color: rgba(255, 179, 0, 0.2);
  box-shadow: 0 0 10px rgba(255, 179, 0, 0.05);
}
.gaming-prose-wrapper .ProseMirror .buy-recommendation-pill.avoid {
  background: rgba(255, 77, 77, 0.08);
  color: #FF4D4D;
  border-color: rgba(255, 77, 77, 0.2);
  box-shadow: 0 0 10px rgba(255, 77, 77, 0.05);
}

/* Twitch Embed (matching youtube-embed) */
.gaming-prose-wrapper .ProseMirror .twitch-embed {
  margin: 1.5rem 0;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--ed-border);
}
.gaming-prose-wrapper .ProseMirror .twitch-embed iframe {
  width: 100%;
  aspect-ratio: 16 / 9;
}

/* Deal Card */
.gaming-prose-wrapper .ProseMirror .deal-card-block {
  background: var(--ed-elevated);
  border: 1px solid rgba(0, 229, 255, 0.15);
  border-radius: 12px;
  padding: 20px;
  margin: 1.5rem 0;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
  max-width: 500px;
}
.gaming-prose-wrapper .ProseMirror .deal-card-header {
  margin-bottom: 12px;
}
.gaming-prose-wrapper .ProseMirror .deal-store-badge {
  background: rgba(0, 229, 255, 0.1);
  border: 1px solid rgba(0, 229, 255, 0.3);
  color: var(--ed-accent);
  font-size: 10px;
  font-family: 'Rajdhani', sans-serif;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding: 3px 8px;
  border-radius: 4px;
}
.gaming-prose-wrapper .ProseMirror .deal-card-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.gaming-prose-wrapper .ProseMirror .deal-product-title {
  margin: 0 !important;
  font-size: 18px;
  font-family: 'Rajdhani', sans-serif;
  font-weight: 700;
  color: #ffffff;
}
.gaming-prose-wrapper .ProseMirror .deal-price-cta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.gaming-prose-wrapper .ProseMirror .deal-price {
  font-size: 24px;
  font-family: 'Rajdhani', sans-serif;
  font-weight: 700;
  color: var(--ed-accent);
}
.gaming-prose-wrapper .ProseMirror .deal-cta-btn {
  background: linear-gradient(135deg, var(--ed-accent), #00B8D9) !important;
  color: #070c18 !important;
  font-family: 'Rajdhani', sans-serif;
  font-weight: 700 !important;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 8px 20px;
  border-radius: 6px;
  border: none !important;
  text-decoration: none !important;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 0 15px rgba(0, 229, 255, 0.2);
}
.gaming-prose-wrapper .ProseMirror .deal-disclosure {
  margin-top: 14px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 10px;
  color: var(--ed-text-dim);
  line-height: 1.4;
}

/* Ad Slot Placeholder */
.gaming-prose-wrapper .ProseMirror .ad-slot-placeholder {
  border: 2px dashed rgba(0, 229, 255, 0.3);
  background: rgba(0, 229, 255, 0.03);
  border-radius: 8px;
  padding: 16px;
  margin: 1.5rem 0;
  text-align: center;
  font-family: 'Rajdhani', sans-serif;
  user-select: none;
}
.gaming-prose-wrapper .ProseMirror .ad-slot-placeholder .ad-placeholder-label {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(0, 229, 255, 0.7);
}
`;
