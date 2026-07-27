import { ReviewCardNode } from './ReviewCard';
import { MentionedGameNode } from './MentionedGame';
import { BenchmarkCardNode } from './BenchmarkCard';
import { PatchNotesNode } from './PatchNotes';
import { SystemRequirementsNode } from './SystemRequirements';
import { ProsConsNode } from './ProsConsBlock';
import { DealCardNode } from './DealCard';
import { TimelineNode } from './Timeline';
import { FAQNode } from './FAQ';
import { ChangelogNode } from './Changelog';
import { VersionCompareNode } from './VersionCompare';
import { BossCardNode } from './BossCard';
import { BuildCardNode } from './BuildCard';
import { SpoilerBlockNode } from '../SpoilerBlock';
import { CorrectionNoticeNode } from '../CorrectionNotice';
import { PullQuoteNode } from '../PullQuote';
import { VideoEmbed } from './VideoEmbed';
import { AwardBadgeNode } from './AwardBadge';
import { StatCompareNode } from './StatCompare';
import { LootTableNode } from './LootTable';
import { InlinePollNode } from './InlinePoll';
import { ModCardNode } from './ModCard';
import { VideoTimestampNode } from './VideoTimestamp';
import { SocialEmbedNode, SocialEmbedPastePrompt } from './SocialEmbed';
import { detectSocialUrl, oembedResultToAttrs } from '@/lib/oembed';
import { NewsletterCtaNode } from './NewsletterCta';
import { RelatedArticlesNode } from './RelatedArticles';
import { HardwareSpecNode } from './HardwareSpec';
import { PriceHistoryNode } from './PriceHistory';
import { ModLoadOrderNode } from './ModLoadOrder';
import { ControversyBlockNode } from './ControversyBlock';
import { TierListNode } from './TierList';
import { InteractiveMapNode } from './InteractiveMap';
import { MapGenieEmbedNode } from './MapGenieEmbedBlock';
import { ComparisonTableNode } from './ComparisonTable';
import { AchievementBlockNode } from './AchievementBlock';
import { PriceCompareTableNode } from './PriceCompareTable';
import { slashRegistry, SlashItem } from '@/lib/slash-registry';

export const ReviewCardSlashCommand: SlashItem = {
  id: 'review-card',
  label: 'Review Card',
  icon: '⭐',
  group: 'Gaming',
  action: (editor) => editor.chain().focus().insertContent({ type: 'reviewCard' }).run(),
};

export const MentionedGameSlashCommand: SlashItem = {
  id: 'mentioned-game',
  label: 'Mentioned Game',
  icon: '🎮',
  group: 'Gaming',
  action: (editor) => editor.chain().focus().insertContent({ type: 'mentionedGame' }).run(),
};

export const BenchmarkCardSlashCommand: SlashItem = {
  id: 'benchmark-card',
  label: 'Benchmark Card',
  icon: '📊',
  group: 'Gaming',
  action: (editor) => editor.chain().focus().insertContent({ type: 'benchmarkCard' }).run(),
};

export const PatchNotesSlashCommand: SlashItem = {
  id: 'patch-notes',
  label: 'Patch Notes',
  icon: '📋',
  group: 'Gaming',
  action: (editor) => editor.chain().focus().insertContent({ type: 'patchNotes' }).run(),
};

export const SystemRequirementsSlashCommand: SlashItem = {
  id: 'system-requirements',
  label: 'System Requirements',
  icon: '🖥️',
  group: 'Gaming',
  action: (editor) => editor.chain().focus().insertContent({ type: 'systemRequirements' }).run(),
};

export const ProsConsSlashCommand: SlashItem = {
  id: 'proscons-node',
  label: 'Pros & Cons (Atom)',
  icon: '±',
  group: 'Gaming',
  action: (editor) => editor.chain().focus().insertContent({ type: 'prosCons' }).run(),
};

export const DealCardSlashCommand: SlashItem = {
  id: 'deal-card',
  label: 'Deal Card',
  icon: '💰',
  group: 'Gaming',
  action: (editor) => editor.chain().focus().insertContent({ type: 'dealCard' }).run(),
};

export const TimelineSlashCommand: SlashItem = {
  id: 'timeline-node',
  label: 'Timeline',
  icon: '⟶',
  group: 'Gaming',
  action: (editor) => editor.chain().focus().insertContent({ type: 'timeline' }).run(),
};

export const FAQSlashCommand: SlashItem = {
  id: 'faq-node',
  label: 'FAQ Block',
  icon: '?',
  group: 'Gaming',
  action: (editor) => editor.chain().focus().insertContent({ type: 'faq' }).run(),
};

export const ChangelogSlashCommand: SlashItem = {
  id: 'changelog-node',
  label: 'Changelog',
  icon: '📝',
  group: 'Gaming',
  action: (editor) => editor.chain().focus().insertContent({ type: 'changelog' }).run(),
};

export const VersionCompareSlashCommand: SlashItem = {
  id: 'version-compare-node',
  label: 'Version Comparison',
  icon: '⇄',
  group: 'Gaming',
  action: (editor) => editor.chain().focus().insertContent({ type: 'versionCompare' }).run(),
};

export const BossCardSlashCommand: SlashItem = {
  id: 'boss-card',
  label: 'Boss/Enemy Card',
  icon: '☠️',
  group: 'Gaming',
  action: (editor) => editor.chain().focus().insertContent({ type: 'bossCard' }).run(),
};

export const BuildCardSlashCommand: SlashItem = {
  id: 'build-card',
  label: 'Game Build Card',
  icon: '⚔️',
  group: 'Gaming',
  action: (editor) => editor.chain().focus().insertContent({ type: 'buildCard' }).run(),
};

export const SpoilerSlashCommand: SlashItem = {
  id: 'spoiler-block',
  label: 'Spoiler Block',
  icon: '🚫',
  group: 'Gaming',
  action: (editor) => editor.chain().focus().insertContent({ type: 'spoilerBlock' }).run(),
};

export const CorrectionNoticeSlashCommand: SlashItem = {
  id: 'correction-notice',
  label: 'Correction Notice',
  icon: '⚠',
  group: 'Gaming',
  action: (editor) => editor.chain().focus().insertContent({ type: 'correctionNotice' }).run(),
};

export const PullQuoteSlashCommand: SlashItem = {
  id: 'pull-quote',
  label: 'Pull Quote',
  icon: '❝',
  group: 'Gaming',
  action: (editor) => editor.chain().focus().insertContent({ type: 'pullQuote' }).run(),
};

// Fix #11: InlineProsConsSlashCommand removed — duplicate of ProsConsSlashCommand (atomic node)
// Use /proscons-node from the slash menu instead. The inline HTML version is kept
// for legacy content compatibility but is no longer offered as a new insert option.

export const PlatformBadgeSlashCommand: SlashItem = {
  id: 'platform-badge', label: 'Platform Badges', icon: '🎮', group: 'Gaming', 
  action: (e) => e.chain().focus().insertContent(
    '<p><span class="platform-badge badge-pc">PC</span><span class="platform-badge badge-ps5">PS5</span><span class="platform-badge badge-xbox">Xbox</span><span class="platform-badge badge-switch">Switch</span></p>', 
    { parseOptions: { preserveWhitespace: 'full' } }
  ).run() 
};

export const BuyRecommendationSlashCommand: SlashItem = {
  id: 'buyrecommendation', label: 'Buy Recommendation', icon: '💰', group: 'Gaming', 
  action: (e, setModalConfig) => {
    setModalConfig({
      title: 'Buy Recommendation',
      fields: [{
        key: 'choice', label: 'Recommendation', type: 'select', required: true,
        options: [
          { label: '★ Buy Now', value: 'buy' },
          { label: '⌛ Wait for Sale', value: 'wait' },
          { label: '🚫 Avoid', value: 'avoid' },
        ]
      }],
      onInsert: ({ choice }) => {
        let className = '';
        let label = '';
        if (choice === 'buy') { className = 'buy-now'; label = '★ Buy Now'; }
        else if (choice === 'wait') { className = 'wait-for-sale'; label = '⌛ Wait for Sale'; }
        else if (choice === 'avoid') { className = 'avoid'; label = '🚫 Avoid'; }
        e.chain().focus().insertContent(`<span class="buy-recommendation-pill ${className}">${label}</span>`, { parseOptions: { preserveWhitespace: 'full' } }).run();
      }
    });
  }
};

export const AwardBadgeSlashCommand: SlashItem = {
  id: 'award-badge',
  label: 'Award Badge',
  icon: '🏆',
  group: 'Gaming',
  action: (editor) => editor.chain().focus().insertContent({
    type: 'awardBadge',
    attrs: {
      award: 'Game of the Year',
      year: new Date().getFullYear().toString(),
      category: 'Action RPG',
    },
  }).run(),
};

export const StatCompareSlashCommand: SlashItem = {
  id: 'stat-compare',
  label: 'Stat Comparison',
  icon: '⚖',
  group: 'Gaming',
  action: (editor) => editor.chain().focus().insertContent({
    type: 'statCompare',
    attrs: {
      title: 'Platform Comparison',
      headers: JSON.stringify(['PS5', 'Xbox Series X', 'PC']),
      rows: JSON.stringify([
        { label: 'Resolution', values: ['4K', '4K', '4K+'], winnerIndex: 2 },
        { label: 'Frame Rate', values: ['60fps', '60fps', '120fps'], winnerIndex: 2 },
        { label: 'Load Time', values: ['2s', '2s', '1s'], winnerIndex: 2 },
      ]),
      highlightWinner: true,
    },
  }).run(),
};

export const LootTableSlashCommand: SlashItem = {
  id: 'loot-table',
  label: 'Loot / Drop Table',
  icon: '🎲',
  group: 'Gaming',
  action: (editor) => editor.chain().focus().insertContent({
    type: 'lootTable',
    attrs: {
      gameName: 'Game Title',
      areaName: 'Area Name',
      items: JSON.stringify([
        { name: 'Item Name', source: 'Enemy / Chest', dropRate: '12.5%', rarity: 'Rare', notes: '' },
        { name: 'Rare Drop', source: 'Boss', dropRate: 'Guaranteed', rarity: 'Legendary', notes: 'First kill only' },
      ]),
    },
  }).run(),
};

export const InlinePollSlashCommand: SlashItem = {
  id: 'inline-poll',
  label: 'Inline Poll',
  icon: '📊',
  group: 'Gaming',
  action: (editor) => editor.chain().focus().insertContent({
    type: 'inlinePoll',
    attrs: {
      pollId: '',
      headline: 'What is your favourite platform?',
      displayStyle: 'bar',
    },
  }).run(),
};

export const ModCardSlashCommand: SlashItem = {
  id: 'mod-card',
  label: 'Mod Card',
  icon: '🔧',
  group: 'Gaming',
  action: (editor) => editor.chain().focus().insertContent({
    type: 'modCard',
    attrs: {
      modName: 'Mod Name',
      author: 'Author',
      version: '1.0.0',
      gameVersion: 'v1.0',
      downloadUrl: 'https://nexusmods.com/',
      compatibility: 'Untested',
    },
  }).run(),
};

export const VideoTimestampSlashCommand: SlashItem = {
  id: 'video-timestamp',
  label: 'Video Timestamp',
  icon: '⏱',
  group: 'Gaming',
  action: (editor) => editor.chain().focus().insertContent({
    type: 'videoTimestamp',
    attrs: {
      embedType: 'youtube',
      embedId: '',
      timestamp: 0,
      label: 'Key Moment',
    },
  }).run(),
};

export const SocialEmbedSlashCommand: SlashItem = {
  id: 'social-embed',
  label: 'Social Embed',
  icon: '🔗',
  group: 'Gaming',
  action: (editor, openModal) => {
    openModal({
      title: 'Social Embed',
      insertLabel: 'Insert',
      fields: [],
      tabs: [
        {
          id: 'from-url',
          label: 'From URL',
          fields: [
            {
              key: 'url',
              label: 'Post URL',
              type: 'oembed-url',
              placeholder: 'https://x.com/user/status/12345',
              required: true,
              onOEmbedResult: (result, url) => {
                const detected = detectSocialUrl(url);
                const attrs = oembedResultToAttrs(result, { url, platform: detected?.platform || 'twitter' });
                const out: Record<string, string | number> = { url: attrs.url, platform: attrs.platform };
                if (attrs.authorName) out.authorName = attrs.authorName;
                if (attrs.authorHandle) out.authorHandle = attrs.authorHandle;
                if (attrs.authorUrl) out.authorUrl = attrs.authorUrl;
                if (attrs.content) out.content = attrs.content;
                if (attrs.postDate) out.postDate = attrs.postDate;
                if (attrs.avatarUrl) out.avatarUrl = attrs.avatarUrl;
                if (attrs.mediaUrl) out.mediaUrl = attrs.mediaUrl;
                if (attrs.embedHtml) out.embedHtml = attrs.embedHtml;
                return out;
              },
            },
          ],
        },
        {
          id: 'manual',
          label: 'Manual',
          fields: [
            {
              key: 'platform',
              label: 'Platform',
              type: 'select',
              defaultValue: 'twitter',
              options: [
                { label: 'X / Twitter', value: 'twitter' },
                { label: 'Reddit', value: 'reddit' },
                { label: 'Bluesky', value: 'bluesky' },
              ],
            },
            { key: 'url', label: 'Post URL', type: 'url', placeholder: 'https://x.com/...', required: true },
            { key: 'authorName', label: 'Author Name', type: 'text', placeholder: 'Display name' },
            { key: 'authorHandle', label: 'Author Handle', type: 'text', placeholder: '@handle' },
            { key: 'content', label: 'Post Content', type: 'textarea', placeholder: 'Paste post text here.' },
          ],
        },
      ],
      onInsert: (values) => {
        const attrs: Record<string, string> = {
          platform: String(values.platform || 'twitter'),
          url: String(values.url || ''),
        };
        (['authorName', 'authorHandle', 'authorUrl', 'content', 'postDate', 'avatarUrl', 'mediaUrl', 'embedHtml'] as const).forEach(k => {
          if (values[k]) attrs[k] = String(values[k]);
        });
        editor.chain().focus().insertContent({ type: 'socialEmbed', attrs }).run();
      },
    });
  },
};

export const NewsletterCtaSlashCommand: SlashItem = {
  id: 'newsletter-cta',
  label: 'Newsletter CTA',
  icon: '✉',
  group: 'Gaming',
  action: (editor) => editor.chain().focus().insertContent({
    type: 'newsletterCta',
    attrs: {
      headline: 'Subscribe to Our Newsletter',
      description: 'Get the latest gaming news, reviews, and exclusive guides delivered directly to your inbox.',
      ctaLabel: 'Subscribe',
      variant: 'card',
    },
  }).run(),
};

export const RelatedArticlesSlashCommand: SlashItem = {
  id: 'related-articles',
  label: 'Related Articles',
  icon: '📰',
  group: 'Gaming',
  action: (editor) => editor.chain().focus().insertContent({
    type: 'relatedArticles',
    attrs: {
      headline: 'Related',
      articles: JSON.stringify([]),
    },
  }).run(),
};

export const HardwareSpecSlashCommand: SlashItem = {
  id: 'hardware-spec',
  label: 'Hardware Spec Card',
  icon: '🖥',
  group: 'Gaming',
  action: (editor) => editor.chain().focus().insertContent({
    type: 'hardwareSpec',
    attrs: {
      productName: 'Product Name',
      category: 'GPU',
      specs: JSON.stringify([
        { label: 'VRAM', value: '8 GB GDDR6' },
        { label: 'TDP', value: '120W' },
      ]),
      pros: JSON.stringify([]),
      cons: JSON.stringify([]),
    },
  }).run(),
};

export const PriceHistorySlashCommand: SlashItem = {
  id: 'price-history',
  label: 'Price History',
  icon: '📈',
  group: 'Gaming',
  action: (editor) => editor.chain().focus().insertContent({
    type: 'priceHistory',
    attrs: {
      gameSlug: '',
      gameName: 'Game Title',
    },
  }).run(),
};

export const ModLoadOrderSlashCommand: SlashItem = {
  id: 'mod-load-order',
  label: 'Mod Load Order',
  icon: '📋',
  group: 'Gaming',
  action: (editor) => editor.chain().focus().insertContent({
    type: 'modLoadOrder',
    attrs: {
      title: 'Mod Load Order',
      entries: JSON.stringify([
        { position: 1, modName: 'Unofficial Patch', author: '', notes: '', required: true },
        { position: 2, modName: 'Mod Name', author: '', notes: '', required: false },
      ]),
    },
  }).run(),
};

export const ControversyBlockSlashCommand: SlashItem = {
  id: 'controversy-block',
  label: 'Controversy Timeline',
  icon: '⚡',
  group: 'Gaming',
  action: (editor) => editor.chain().focus().insertContent({
    type: 'controversyBlock',
    attrs: {
      title: 'The Controversy',
      events: JSON.stringify([
        { date: '2025-01-01', actor: 'Developer', actorType: 'developer', description: 'Event description here.', sentiment: 'neutral' },
      ]),
      outcomeSentiment: 'mixed',
    },
  }).run(),
};

export const TierListSlashCommand: SlashItem = {
  id: 'tier-list',
  label: 'Tier List',
  icon: '🥇',
  group: 'Gaming',
  action: (editor) => editor.chain().focus().insertTierList().run(),
};

export const InteractiveMapSlashCommand: SlashItem = {
  id: 'interactive-map',
  label: 'Interactive Map',
  icon: '🗺️',
  group: 'Gaming',
  action: (editor) => editor.chain().focus().insertInteractiveMap().run(),
};

export const MapGenieEmbedSlashCommand: SlashItem = {
  id: 'mapgenie-embed',
  label: 'MapGenie Map',
  icon: '🗺️',
  group: 'Gaming',
  action: (editor) => editor.chain().focus().insertMapGenieEmbed().run(),
};

export const ComparisonTableSlashCommand: SlashItem = {
  id: 'comparison-table',
  label: 'Comparison Table',
  icon: '📊',
  group: 'Gaming',
  action: (editor) => editor.chain().focus().insertContent({ type: 'comparisonTable' }).run(),
};

export const AchievementBlockSlashCommand: SlashItem = {
  id: 'achievement-block',
  label: 'Achievement / Trophy',
  icon: '🏆',
  group: 'Gaming',
  action: (editor) => editor.chain().focus().insertContent({ type: 'achievementBlock' }).run(),
};

export const PriceCompareTableSlashCommand: SlashItem = {
  id: 'price-compare-table',
  label: 'Price Comparison Table',
  icon: '💲',
  group: 'Gaming',
  action: (editor) => editor.chain().focus().insertContent({ type: 'priceCompareTable' }).run(),
};

// Use globalThis so the flag survives Turbopack/HMR module re-evaluation.
// A module-level `let` resets on every hot reload; globalThis persists for the
// lifetime of the browser tab.
const _g = globalThis as typeof globalThis & { __gamingCommandsRegistered?: boolean };
if (!_g.__gamingCommandsRegistered) {
  _g.__gamingCommandsRegistered = true;
  slashRegistry.register([
    ReviewCardSlashCommand,
    MentionedGameSlashCommand,
    BenchmarkCardSlashCommand,
    PatchNotesSlashCommand,
    SystemRequirementsSlashCommand,
    ProsConsSlashCommand,
    DealCardSlashCommand,
    TimelineSlashCommand,
    FAQSlashCommand,
    ChangelogSlashCommand,
    VersionCompareSlashCommand,
    BossCardSlashCommand,
    BuildCardSlashCommand,
    SpoilerSlashCommand,
    CorrectionNoticeSlashCommand,
    PullQuoteSlashCommand,
    // Fix #11: InlineProsConsSlashCommand removed (was a duplicate entry)
    PlatformBadgeSlashCommand,
    BuyRecommendationSlashCommand,
    AwardBadgeSlashCommand,
    StatCompareSlashCommand,
    LootTableSlashCommand,
    InlinePollSlashCommand,
    ModCardSlashCommand,
    VideoTimestampSlashCommand,
    SocialEmbedSlashCommand,
    NewsletterCtaSlashCommand,
    RelatedArticlesSlashCommand,
    HardwareSpecSlashCommand,
    PriceHistorySlashCommand,
    ModLoadOrderSlashCommand,
    ControversyBlockSlashCommand,
    TierListSlashCommand,
    InteractiveMapSlashCommand,
    MapGenieEmbedSlashCommand,
    ComparisonTableSlashCommand,
    AchievementBlockSlashCommand,
    PriceCompareTableSlashCommand,
  ]);
}

export {
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
  BossCardNode,
  BuildCardNode,
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
};
