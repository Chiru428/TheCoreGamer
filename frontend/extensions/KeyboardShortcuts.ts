/**
 * KeyboardShortcuts — TipTap extension adding gaming CMS keyboard shortcuts.
 */

import { Extension } from '@tiptap/react';

interface KeyboardShortcutsOptions {
  onLink?: () => void;
}

export const KeyboardShortcutsExtension = Extension.create<KeyboardShortcutsOptions>({
  name: 'gamingKeyboardShortcuts',

  addOptions() {
    return {
      onLink: undefined,
    };
  },

  addKeyboardShortcuts() {
    return {
      // Mod-k → shortcut callback
      'Mod-k': ({ editor }) => {
        if (this.options.onLink) {
          this.options.onLink();
          return true;
        }
        return false;
      },
      // Mod-Shift-h → toggleHighlight cyan
      'Mod-Shift-h': ({ editor }) => {
        editor.chain().focus().toggleHighlight({ color: '#00E5FF22' }).run();
        return true;
      },
      // Mod-Shift-x → clearNodes + unsetAllMarks
      'Mod-Shift-x': ({ editor }) => {
        editor.chain().focus().clearNodes().unsetAllMarks().run();
        return true;
      },
      // Mod-Shift-c → toggleCodeBlock
      'Mod-Shift-c': ({ editor }) => {
        editor.chain().focus().toggleCodeBlock().run();
        return true;
      },
      // Mod-. → horizontal rule
      'Mod-.': ({ editor }) => {
        editor.chain().focus().setHorizontalRule().run();
        return true;
      },
      // Mod-Shift-1 → heading level 1
      'Mod-Shift-1': ({ editor }) => {
        editor.chain().focus().toggleHeading({ level: 1 }).run();
        return true;
      },
      // Mod-Shift-2 → heading level 2
      'Mod-Shift-2': ({ editor }) => {
        editor.chain().focus().toggleHeading({ level: 2 }).run();
        return true;
      },
      // Mod-Shift-3 → heading level 3
      'Mod-Shift-3': ({ editor }) => {
        editor.chain().focus().toggleHeading({ level: 3 }).run();
        return true;
      },
    };
  },
});
