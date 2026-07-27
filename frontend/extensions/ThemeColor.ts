import { Extension } from '@tiptap/core';
import '@tiptap/extension-text-style';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    themeColor: {
      setThemeColor: (colorName: string) => ReturnType;
      setCustomThemeColor: (lightHex: string, darkHex: string) => ReturnType;
      unsetThemeColor: () => ReturnType;
    };
  }
}

export const ThemeColor = Extension.create({
  name: 'themeColor',

  addOptions() {
    return {
      types: ['textStyle'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          colorName: {
            default: null,
            parseHTML: (element) => {
              const match = element.className.match(/theme-color-([\w-]+)/);
              if (match) {
                if (match[1] === 'custom') {
                  const style = element.getAttribute('style') || '';
                  const lightMatch = style.match(/--color-light:\s*(#[0-9a-fA-F]{6})/);
                  const darkMatch = style.match(/--color-dark:\s*(#[0-9a-fA-F]{6})/);
                  if (lightMatch && darkMatch) {
                    return `custom:${lightMatch[1]}:${darkMatch[1]}`;
                  }
                } else {
                  return match[1].split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                }
              }
              return null;
            },
            renderHTML: (attributes) => {
              if (!attributes.colorName) {
                return {};
              }

              if (attributes.colorName.startsWith('custom:')) {
                const parts = attributes.colorName.split(':');
                if (parts.length === 3) {
                  return {
                    class: 'theme-color theme-color-custom',
                    style: `--color-light: ${parts[1]}; --color-dark: ${parts[2]};`,
                  };
                }
              }

              const slug = attributes.colorName.toLowerCase().replace(/\s+/g, '-');
              return {
                class: `theme-color theme-color-${slug}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setThemeColor:
        (colorName: string) =>
        ({ chain }) => {
          return chain().setMark('textStyle', { colorName }).run();
        },
      setCustomThemeColor:
        (lightHex: string, darkHex: string) =>
        ({ chain }) => {
          return chain().setMark('textStyle', { colorName: `custom:${lightHex}:${darkHex}` }).run();
        },
      unsetThemeColor:
        () =>
        ({ chain }) => {
          return chain()
            .setMark('textStyle', { colorName: null })
            .removeEmptyTextStyle()
            .run();
        },
    };
  },
});

export default ThemeColor;
