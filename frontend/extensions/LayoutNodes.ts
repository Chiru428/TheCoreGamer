/**
 * LayoutNodes — TipTap node definitions for advanced layout blocks.
 * Each node preserves class, style, and data-type for round-trip fidelity.
 */

import { Node as TiptapNode } from '@tiptap/react';

/** Helper to create a layout block node with standard attrs */
function makeLayoutNode(name: string, tag: string, dataType: string, defaultClass: string) {
  return TiptapNode.create({
    name,
    group: 'block',
    content: 'block+',
    defining: true,

    addAttributes() {
      return {
        class: {
          default: defaultClass,
          parseHTML: (el: HTMLElement) => el.getAttribute('class'),
          renderHTML: (a: Record<string, any>) => a.class ? { class: a.class } : {},
        },
        style: {
          default: null,
          parseHTML: (el: HTMLElement) => el.getAttribute('style'),
          renderHTML: (a: Record<string, any>) => a.style ? { style: a.style } : {},
        },
        'data-type': {
          default: dataType,
          parseHTML: (el: HTMLElement) => el.getAttribute('data-type'),
          renderHTML: (a: Record<string, any>) => a['data-type'] ? { 'data-type': a['data-type'] } : {},
        },
      };
    },

    parseHTML() {
      return [{ tag: `${tag}[data-type="${dataType}"]` }];
    },

    renderHTML({ HTMLAttributes }: any) {
      return [tag, HTMLAttributes, 0];
    },
  });
}

// --- Layout Nodes ------------------------------------------------------------

export const ColumnLayout = makeLayoutNode('columnLayout', 'div', 'columns', 'gc-columns-2');

export const ColumnItem = TiptapNode.create({
  name: 'columnItem',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      class: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute('class'),
        renderHTML: (a: Record<string, any>) => a.class ? { class: a.class } : {},
      },
      style: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute('style'),
        renderHTML: (a: Record<string, any>) => a.style ? { style: a.style } : {},
      },
      'data-type': {
        default: 'column',
        parseHTML: (el: HTMLElement) => el.getAttribute('data-type'),
        renderHTML: (a: Record<string, any>) => a['data-type'] ? { 'data-type': a['data-type'] } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="column"]' }];
  },

  renderHTML({ HTMLAttributes }: any) {
    return ['div', HTMLAttributes, 0];
  },
});

export const ComparisonLayout = makeLayoutNode('comparisonLayout', 'div', 'comparison', 'gc-comparison');
export const FeatureGrid = makeLayoutNode('featureGrid', 'div', 'feature-grid', 'gc-feature-grid');
export const FeatureCard = makeLayoutNode('featureCard', 'div', 'feature-card', 'gc-feature-card');
export const TabsBlock = makeLayoutNode('tabsBlock', 'div', 'tabs', 'gc-tabs');
export const AccordionBlock = makeLayoutNode('accordionBlock', 'div', 'accordion', 'gc-accordion');
export const HeroSection = makeLayoutNode('heroSection', 'div', 'hero', 'gc-hero-section');

import { slashRegistry, SlashItem } from '@/lib/slash-registry';

export const LayoutSlashCommands: SlashItem[] = [
  { id: 'col2', label: '2 Columns', icon: '⫿', group: 'Layout', action: (e) => e.chain().focus().insertContent('<div data-type="columns" class="gc-columns-2"><div data-type="column"><p>Column 1</p></div><div data-type="column"><p>Column 2</p></div></div>', { parseOptions: { preserveWhitespace: 'full' } }).run() },
  { id: 'col3', label: '3 Columns', icon: '⫾', group: 'Layout', action: (e) => e.chain().focus().insertContent('<div data-type="columns" class="gc-columns-3"><div data-type="column"><p>Col 1</p></div><div data-type="column"><p>Col 2</p></div><div data-type="column"><p>Col 3</p></div></div>', { parseOptions: { preserveWhitespace: 'full' } }).run() },
  { id: 'comparison', label: 'Comparison Block', icon: '⇔', group: 'Layout', action: (e) => e.chain().focus().insertContent('<div data-type="comparison" class="gc-comparison"><div class="side-a"><h4>Option A</h4><p>Details here</p></div><div class="vs-divider">VS</div><div class="side-b"><h4>Option B</h4><p>Details here</p></div></div>', { parseOptions: { preserveWhitespace: 'full' } }).run() },
  { id: 'feature-grid', label: 'Feature Grid', icon: '⊞', group: 'Layout', action: (e) => e.chain().focus().insertContent('<div data-type="feature-grid" class="gc-feature-grid"><div data-type="feature-card" class="gc-feature-card"><h4>Feature 1</h4><p>Description</p></div><div data-type="feature-card" class="gc-feature-card"><h4>Feature 2</h4><p>Description</p></div><div data-type="feature-card" class="gc-feature-card"><h4>Feature 3</h4><p>Description</p></div></div>', { parseOptions: { preserveWhitespace: 'full' } }).run() },
  { id: 'hero', label: 'Hero Section', icon: '◈', group: 'Layout', action: (e) => e.chain().focus().insertContent('<div data-type="hero" class="gc-hero-section"><h1>Hero Title</h1><p>Hero subtitle text goes here</p></div>', { parseOptions: { preserveWhitespace: 'full' } }).run() },
  { id: 'tabs', label: 'Tabs Block', icon: '⊟', group: 'Layout', action: (e) => e.chain().focus().insertContent('<div data-type="tabs" class="gc-tabs"><div class="gc-tab-nav"><button class="gc-tab-btn active">Tab 1</button><button class="gc-tab-btn">Tab 2</button></div><div class="gc-tab-panel active"><p>Tab 1 content</p></div><div class="gc-tab-panel"><p>Tab 2 content</p></div></div>', { parseOptions: { preserveWhitespace: 'full' } }).run() },
  { id: 'accordion', label: 'Accordion', icon: '≡', group: 'Layout', action: (e) => e.chain().focus().insertContent('<div data-type="accordion" class="gc-accordion"><div class="gc-accordion-item"><div class="gc-accordion-header">Question 1 ▾</div><div class="gc-accordion-body open"><p>Answer here</p></div></div><div class="gc-accordion-item"><div class="gc-accordion-header">Question 2 ▾</div><div class="gc-accordion-body"><p>Answer here</p></div></div></div>', { parseOptions: { preserveWhitespace: 'full' } }).run() },

];

slashRegistry.register(LayoutSlashCommands);
