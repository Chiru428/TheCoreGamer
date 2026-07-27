import { Extension, RawCommands } from '@tiptap/core'
import '@tiptap/extension-text-style'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontWeight: {
      setFontWeight: (value: string) => ReturnType
      unsetFontWeight: () => ReturnType
    }
  }
}

const FontWeight = Extension.create({
  name: 'fontWeight',
  addOptions() { return { types: ['textStyle'] } },

  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        fontWeight: {
          default: null,
          parseHTML: el => el.style.fontWeight || null,
          renderHTML: attrs => attrs.fontWeight
            ? { style: `font-weight: ${attrs.fontWeight}` } : {},
        }
      }
    }]
  },

  addCommands() {
    return {
      setFontWeight: (value: string) => ({ chain }) =>
        chain().setMark('textStyle', { fontWeight: value }).run(),
      unsetFontWeight: () => ({ chain }) =>
        chain().setMark('textStyle', { fontWeight: null })
          .removeEmptyTextStyle().run(),
    } as Partial<RawCommands>
  }
})

export default FontWeight
