import { Extension, RawCommands } from '@tiptap/core'
import '@tiptap/extension-text-style'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    letterSpacing: {
      setLetterSpacing: (value: string) => ReturnType
      unsetLetterSpacing: () => ReturnType
    }
  }
}

const LetterSpacing = Extension.create({
  name: 'letterSpacing',
  addOptions() { return { types: ['textStyle'] } },

  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        letterSpacing: {
          default: null,
          parseHTML: el => el.style.letterSpacing || null,
          renderHTML: attrs => attrs.letterSpacing
            ? { style: `letter-spacing: ${attrs.letterSpacing}` } : {},
        }
      }
    }]
  },

  addCommands() {
    return {
      setLetterSpacing: (value: string) => ({ chain }) =>
        chain().setMark('textStyle', { letterSpacing: value }).run(),
      unsetLetterSpacing: () => ({ chain }) =>
        chain().setMark('textStyle', { letterSpacing: null })
          .removeEmptyTextStyle().run(),
    } as Partial<RawCommands>
  }
})

export default LetterSpacing
