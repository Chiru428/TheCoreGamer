import { Node, mergeAttributes } from '@tiptap/core'

const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      type: {
        default: 'tip',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div.callout',
        contentElement: 'div.callout-content',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const type = HTMLAttributes.type || 'tip'
    let icon = '✓'
    if (type === 'quote') icon = '"'
    else if (type === 'warning') icon = '⚠'
    else if (type === 'hot-take') icon = '🔥'
    else if (type === 'did-you-know') icon = 'ℹ'
    else if (type === 'spoiler') icon = '👁'

    const calloutContent = ['div', { class: 'callout-content' }, 0]

    if (type === 'spoiler') {
      return [
        'div',
        mergeAttributes(HTMLAttributes, { class: `callout callout-${type}`, 'data-type': type }),
        ['span', { class: 'callout-icon' }, icon],
        ['div', { class: 'callout-spoiler-wrap' },
          ['div', { class: 'callout-content spoiler-blur' }, 0],
          ['button', { class: 'spoiler-reveal-btn' }, '👁 Reveal Spoiler']
        ]
      ]
    }

    return [
      'div',
      mergeAttributes(HTMLAttributes, { class: `callout callout-${type}`, 'data-type': type }),
      ['span', { class: 'callout-icon' }, icon],
      ['div', { class: 'callout-content' }, 0],
    ]
  },
})

export default Callout
