import { Paragraph } from '@tiptap/extension-paragraph'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    customParagraph: {
      setParagraphBullet: (bullet: string) => ReturnType
      unsetParagraphBullet: () => ReturnType
      setLineHeight: (height: string) => ReturnType
      unsetLineHeight: () => ReturnType
    }
  }
}

const CustomParagraph = Paragraph.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      lineHeight: {
        default: null,
        parseHTML: el => el.style.lineHeight || null,
        renderHTML: attrs => attrs.lineHeight
          ? { style: `line-height: ${attrs.lineHeight}` } : {},
      },
      bullet: {
        default: null,
        parseHTML: el => el.getAttribute('data-bullet') || null,
        renderHTML: attrs => attrs.bullet
          ? { 'data-bullet': attrs.bullet } : {},
      }
    }
  },
  addCommands() {
    return {
      ...this.parent?.(),
      setLineHeight: (height: string) => ({ commands }: any) =>
        commands.updateAttributes('paragraph', { lineHeight: height }),
      unsetLineHeight: () => ({ commands }: any) =>
        commands.updateAttributes('paragraph', { lineHeight: null }),
      setParagraphBullet: (bullet: string) => ({ commands }: any) =>
        commands.updateAttributes('paragraph', { bullet }),
      unsetParagraphBullet: () => ({ commands }: any) =>
        commands.updateAttributes('paragraph', { bullet: null }),
    }
  }
})

export default CustomParagraph
