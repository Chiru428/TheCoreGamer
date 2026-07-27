import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { marked } from 'marked';
import { sanitizeHTML, convertMarkdownTaskLists } from '@/lib/sanitize';

export const MarkdownPaste = Extension.create({
  name: 'markdownPaste',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('markdownPaste'),
        props: {
          handlePaste: (view, event) => {
            // 1. Get clipboard data
            const html = event.clipboardData?.getData('text/html');
            const text = event.clipboardData?.getData('text/plain');

            // 2. PRESERVE EXISTING BEHAVIOR: If there is HTML, let TipTap handle it natively.
            if (html && html.trim().length > 0) {
              return false;
            }

            if (!text || text.trim().length === 0) {
              return false;
            }

            // 3. SAFE MARKDOWN DETECTION: Only intercept if the plain text contains common markdown syntax
            // Look for standard markdown: headings, lists, quotes, codeblocks, links, bold, italic
            const isMarkdown = /^(#{1,6}\s|\* |\+ |- |\d+\.\s|> |```|\[.+\]\(.+\)|\*\*.+\*\*|_.+_|`[^`]+`)/m.test(text);
            if (!isMarkdown) {
              return false;
            }

            // 4. CONVERT TO HTML
            // We no longer strip {#id} tags because marked-custom-heading-id handles them natively
            // marked.parse returns a string when used synchronously
            const parsedHtml = marked.parse(text, { async: false }) as string;
            
            // Restore callout classes that were lost during markdown parsing
            const restoredCallouts = parsedHtml.replace(/<blockquote>\s*<p>(?:✦\s*)?(?:<strong>)?(Tip|Warning|Info|Danger|Note):?(?:<\/strong>)?/gi, (_match, type) => {
              const typeLower = type.toLowerCase();
              const calloutType = typeLower === 'note' ? 'info' : typeLower;
              return `<blockquote class="callout-${calloutType}"><p>✦ <strong>${type}:</strong>`;
            });
            
            // 5. CONVERT TASK LISTS TO TIPTAP SCHEMA
            const withTasks = convertMarkdownTaskLists(restoredCallouts);

            // 6. SANITIZE (using the existing robust DOMPurify setup)
            const cleanHtml = sanitizeHTML(withTasks);

            // 6. INJECT INTO TIPTAP safely
            // This natively triggers TipTap's schema checks and parsing logic
            this.editor.commands.insertContent(cleanHtml);

            // 7. PREVENT DEFAULT PASTE
            return true;
          },
        },
      }),
    ];
  },
});
