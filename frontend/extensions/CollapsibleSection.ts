import { Node, mergeAttributes } from '@tiptap/core'

const CollapsibleSection = Node.create({
  name: 'collapsibleSection',
  group: 'block',
  content: 'block+',

  addAttributes() {
    return {
      title: {
        default: 'Section Title',
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'details.collapsible-section',
        contentElement: 'div.collapsible-body',
        getAttrs: (node) => {
          if (typeof node === 'string') return {}
          const summary = (node as HTMLElement).querySelector('summary')
          return {
            title: summary?.textContent || 'Section Title'
          }
        }
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'details',
      mergeAttributes(HTMLAttributes, { class: 'collapsible-section', open: 'true' }),
      ['summary', { class: 'collapsible-title' }, HTMLAttributes.title || 'Section Title'],
      ['div', { class: 'collapsible-body' }, 0],
    ]
  },
})

export default CollapsibleSection
