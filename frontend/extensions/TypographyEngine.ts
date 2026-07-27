/**
 * TypographyEngine — TipTap extension for advanced text styling.
 * Adds lineHeight, letterSpacing, fontWeight, textTransform, textShadow,
 * textStroke, and gradient text presets to the textStyle mark.
 */

import { Extension } from '@tiptap/react';

// --- Typography Presets ------------------------------------------------------

export const TYPOGRAPHY_PRESETS: Record<string, Record<string, string>> = {
  'Editorial Lead':   { fontSize: '1.25rem', lineHeight: '1.9', fontWeight: '400', letterSpacing: '0.01em' },
  'Pull Quote':       { fontSize: '1.5rem', lineHeight: '1.6', fontWeight: '600', fontStyle: 'italic', color: '#00E5FF' },
  'Esports Headline': { fontSize: '3rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', textShadow: '0 0 30px #00E5FF60' },
  'Cyberpunk Title':  { fontSize: '2rem', fontWeight: '700', gradientText: 'cyber' },
  'Neon Accent':      { color: '#00E5FF', textShadow: '0 0 10px #00E5FF, 0 0 30px #00E5FF60', fontWeight: '700' },
  'Fire Text':        { gradientText: 'fire', fontWeight: '800' },
  'Ice Text':         { gradientText: 'ice', fontWeight: '700' },
  'Gold Text':        { gradientText: 'gold', fontWeight: '700' },
  'Text Glitch':      { class: 'text-glitch', color: '#00E5FF', fontWeight: '700' },
  'Neon Pulse':       { class: 'text-neon-pulse', color: '#00E5FF' },
};

/**
 * Helper to apply a typography preset to the current selection.
 * Call from slash commands or toolbar: applyTypographyPreset(editor, 'Esports Headline')
 */
export function applyTypographyPreset(editor: any, presetName: string): void {
  const preset = TYPOGRAPHY_PRESETS[presetName];
  if (!preset || !editor) return;

  const markAttrs: Record<string, string | null> = {};

  if (preset.fontSize) markAttrs.fontSize = preset.fontSize;
  if (preset.fontWeight) markAttrs.fontWeight = preset.fontWeight;
  if (preset.lineHeight) markAttrs.lineHeight = preset.lineHeight;
  if (preset.letterSpacing) markAttrs.letterSpacing = preset.letterSpacing;
  if (preset.textTransform) markAttrs.textTransform = preset.textTransform;
  if (preset.textShadow) markAttrs.textShadow = preset.textShadow;
  if (preset.color) markAttrs.color = preset.color;
  if (preset.fontStyle) markAttrs.fontStyle = preset.fontStyle;
  if (preset.gradientText) markAttrs.gradientText = preset.gradientText;
  if (preset.class) markAttrs.gradientText = preset.class; // class-based presets use gradientText attr

  editor.chain().focus().setMark('textStyle', markAttrs).run();
}

// --- Extension ---------------------------------------------------------------

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    typographyEngine: {
      setTextLineHeight: (value: string) => ReturnType
      setTextTransform: (value: string) => ReturnType
      setTextShadow: (value: string) => ReturnType
      setGradientText: (preset: string) => ReturnType
      setTextGlow: (color: string) => ReturnType
    }
  }
}

export const TypographyEngine = Extension.create({
  name: 'typographyEngine',

  addGlobalAttributes() {
    return [{
      types: ['textStyle'],
      attributes: {
        lineHeight: {
          default: null,
          parseHTML: (el: HTMLElement) => el.style.lineHeight || null,
          renderHTML: (attrs: Record<string, any>) =>
            attrs.lineHeight ? { style: `line-height: ${attrs.lineHeight}` } : {},
        },
        fontStyle: {
          default: null,
          parseHTML: (el: HTMLElement) => el.style.fontStyle || null,
          renderHTML: (attrs: Record<string, any>) =>
            attrs.fontStyle ? { style: `font-style: ${attrs.fontStyle}` } : {},
        },
        textTransform: {
          default: null,
          parseHTML: (el: HTMLElement) => el.style.textTransform || null,
          renderHTML: (attrs: Record<string, any>) =>
            attrs.textTransform ? { style: `text-transform: ${attrs.textTransform}` } : {},
        },
        textShadow: {
          default: null,
          parseHTML: (el: HTMLElement) => el.style.textShadow || null,
          renderHTML: (attrs: Record<string, any>) =>
            attrs.textShadow ? { style: `text-shadow: ${attrs.textShadow}` } : {},
        },
        textStroke: {
          default: null,
          parseHTML: (el: HTMLElement) => (el.style as any).webkitTextStroke || null,
          renderHTML: (attrs: Record<string, any>) =>
            attrs.textStroke ? { style: `-webkit-text-stroke: ${attrs.textStroke}` } : {},
        },
        gradientText: {
          default: null,
          parseHTML: (el: HTMLElement) => {
            if (el.classList.contains('gradient-cyber')) return 'cyber';
            if (el.classList.contains('gradient-fire')) return 'fire';
            if (el.classList.contains('gradient-ice')) return 'ice';
            if (el.classList.contains('gradient-gold')) return 'gold';
            if (el.classList.contains('text-glitch')) return 'text-glitch';
            if (el.classList.contains('text-neon-pulse')) return 'text-neon-pulse';
            if (el.classList.contains('text-glow-cyan')) return 'text-glow-cyan';
            if (el.classList.contains('text-glow-red')) return 'text-glow-red';
            if (el.classList.contains('text-glow-green')) return 'text-glow-green';
            return null;
          },
          renderHTML: (attrs: Record<string, any>) => {
            if (!attrs.gradientText || attrs.gradientText === 'none') return {};
            // Map preset names to CSS classes
            const classMap: Record<string, string> = {
              cyber: 'gradient-cyber',
              fire: 'gradient-fire',
              ice: 'gradient-ice',
              gold: 'gradient-gold',
              'text-glitch': 'text-glitch',
              'text-neon-pulse': 'text-neon-pulse',
              'text-glow-cyan': 'text-glow-cyan',
              'text-glow-red': 'text-glow-red',
              'text-glow-green': 'text-glow-green',
            };
            const cls = classMap[attrs.gradientText];
            return cls ? { class: cls } : {};
          },
        },
      },
    }];
  },

  addCommands() {
    return {
      setTextLineHeight: (value: string) => ({ chain }: any) =>
        chain().setMark('textStyle', { lineHeight: value }).run(),
      setTextTransform: (value: string) => ({ chain }: any) =>
        chain().setMark('textStyle', { textTransform: value }).run(),
      setTextShadow: (value: string) => ({ chain }: any) =>
        chain().setMark('textStyle', { textShadow: value }).run(),
      setGradientText: (preset: string) => ({ chain }: any) =>
        chain().setMark('textStyle', { gradientText: preset }).run(),
      setTextGlow: (color: string) => ({ chain }: any) => {
        const glowMap: Record<string, string> = {
          cyan: 'text-glow-cyan',
          red: 'text-glow-red',
          green: 'text-glow-green',
          none: 'none',
        };
        return chain().setMark('textStyle', { gradientText: glowMap[color] || 'none' }).run();
      },
    };
  },
});
