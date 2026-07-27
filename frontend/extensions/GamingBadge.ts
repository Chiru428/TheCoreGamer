import { Node, mergeAttributes } from '@tiptap/core'

const GamingBadge = Node.create({
  name: 'gamingBadge',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      label: {
        default: '',
      },
      variant: {
        default: 'platform',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span.gaming-badge',
        contentElement: 'span.badge-text',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: `gaming-badge gaming-badge-${HTMLAttributes.variant}`,
        'data-label': HTMLAttributes.label,
      }),
      HTMLAttributes.label,
    ]
  },
})

export default GamingBadge
