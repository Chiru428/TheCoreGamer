import { Editor } from '@tiptap/core';
import { BlockInsertModalConfig } from '@/types/block-insert';

/**
 * Shared "Insert Image" modal config — used by both the toolbar/sidebar
 * "Add Image" button and the "/image" slash command, so the two entry
 * points stay in sync instead of drifting into near-duplicate forms.
 */
export function buildImageInsertConfig(editor: Editor): BlockInsertModalConfig {
  const captionField = { key: 'caption', label: 'Caption', type: 'text' as const, placeholder: 'Enter image caption...', hint: 'visible under image' };
  const creditField = { key: 'credit', label: 'Credit', type: 'text' as const, placeholder: 'Enter image credit...' };
  const altField = { key: 'alt', label: 'Alt Text', type: 'text' as const, placeholder: 'Describe the image' };

  return {
    title: 'Insert Image',
    fields: [],
    tabs: [
      {
        id: 'upload',
        label: 'Upload',
        fields: [
          { key: 'url', label: 'Image', type: 'image', required: true },
          captionField,
          creditField,
          altField,
        ],
      },
      {
        id: 'from-url',
        label: 'From URL',
        fields: [
          { key: 'url', label: 'Image URL', type: 'url', placeholder: 'https://...', required: true },
          captionField,
          creditField,
          altField,
        ],
      },
    ],
    onInsert: ({ url, caption, credit, alt }) => {
      editor.chain().focus().setImage({ 
        src: String(url), 
        alt: String(alt || ''), 
        title: caption ? String(caption) : undefined,
        credit: credit ? String(credit) : undefined
      } as any).run();
    },
  };
}
