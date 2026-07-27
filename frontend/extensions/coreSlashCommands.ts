import { slashRegistry, SlashItem } from '@/lib/slash-registry';
import { applyTypographyPreset } from '@/extensions/TypographyEngine';

export const coreSlashCommands: SlashItem[] = [
  { id: 'h1', label: 'Heading 1', icon: 'H1', group: 'Text', action: (e) => e.chain().focus().toggleHeading({ level: 1 }).run() },
  { id: 'h2', label: 'Heading 2', icon: 'H2', group: 'Text', action: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { id: 'h3', label: 'Heading 3', icon: 'H3', group: 'Text', action: (e) => e.chain().focus().toggleHeading({ level: 3 }).run() },
  // Fix #6: Added H4, H5, H6 — they were missing from slash menu
  { id: 'h4', label: 'Heading 4', icon: 'H4', group: 'Text', action: (e) => e.chain().focus().toggleHeading({ level: 4 }).run() },
  { id: 'h5', label: 'Heading 5', icon: 'H5', group: 'Text', action: (e) => e.chain().focus().toggleHeading({ level: 5 }).run() },
  { id: 'h6', label: 'Heading 6', icon: 'H6', group: 'Text', action: (e) => e.chain().focus().toggleHeading({ level: 6 }).run() },
  { id: 'task-list', label: 'Task List', icon: '☑', group: 'Text', action: (e) => e.chain().focus().toggleTaskList().run() },
  { id: 'bullet', label: 'Bullet List', icon: '•', group: 'Text', action: (e) => e.chain().focus().toggleBulletList().run() },
  { id: 'ordered', label: 'Numbered List', icon: '1.', group: 'Text', action: (e) => e.chain().focus().toggleOrderedList().run() },
  { id: 'quote', label: 'Quote', icon: '"', group: 'Text', action: (e) => e.chain().focus().insertContent('<blockquote><p></p></blockquote>').run() },
  { id: 'code', label: 'Code Block', icon: '<>', group: 'Text', action: (e) => e.chain().focus().toggleCodeBlock().run() },
  { id: 'table', label: 'Table', icon: '⊞', group: 'Text', action: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3 }).run() },
  { id: 'divider', label: 'Divider', icon: '—', group: 'Text', action: (e) => e.chain().focus().setHorizontalRule().run() },
  {
    id: 'info', label: 'Info Callout', icon: 'ℹ', group: 'Callouts',
    action: (e) => e.chain().focus().insertContent(
      '<blockquote class="callout-info"><p>💡 <strong>Info:</strong> Write your note here…</p></blockquote>',
      { parseOptions: { preserveWhitespace: 'full' } }
    ).run(),
  },
  {
    id: 'warn', label: 'Warning Callout', icon: '⚠', group: 'Callouts',
    action: (e) => e.chain().focus().insertContent(
      '<blockquote class="callout-warning"><p>⚠️ <strong>Warning:</strong> Write your note here…</p></blockquote>',
      { parseOptions: { preserveWhitespace: 'full' } }
    ).run(),
  },
  {
    id: 'tip', label: 'Tip Callout', icon: '✦', group: 'Callouts',
    action: (e) => e.chain().focus().insertContent(
      '<blockquote class="callout-tip"><p>✦ <strong>Tip:</strong> Write your tip here…</p></blockquote>',
      { parseOptions: { preserveWhitespace: 'full' } }
    ).run(),
  },
  {
    id: 'danger', label: 'Danger Callout', icon: '🚫', group: 'Callouts',
    action: (e) => e.chain().focus().insertContent(
      '<blockquote class="callout-danger"><p>🚫 <strong>Danger:</strong> Write your critical warning here…</p></blockquote>',
      { parseOptions: { preserveWhitespace: 'full' } }
    ).run(),
  },
  { id: 'typo-cyber', label: 'Cyberpunk Title', icon: '◈', group: 'Typography', action: (e) => applyTypographyPreset(e, 'Cyberpunk Title') },
  { id: 'typo-neon', label: 'Neon Accent', icon: '◉', group: 'Typography', action: (e) => applyTypographyPreset(e, 'Neon Accent') },
  { id: 'typo-fire', label: 'Fire Text', icon: '🔥', group: 'Typography', action: (e) => applyTypographyPreset(e, 'Fire Text') },
  { id: 'typo-pullquote', label: 'Pull Quote', icon: '"', group: 'Typography', action: (e) => applyTypographyPreset(e, 'Pull Quote') },
];

slashRegistry.register(coreSlashCommands);
