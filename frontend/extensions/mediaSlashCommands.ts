import { slashRegistry, SlashItem } from '@/lib/slash-registry';
import { AD_ZONES } from '@/lib/constants';
import { buildImageInsertConfig } from '@/lib/image-insert-config';

export const mediaSlashCommands: SlashItem[] = [
  {
    id: 'image-caption',
    label: 'Image',
    icon: '🖼',
    group: 'Media',
    action: (e, setModalConfig) => setModalConfig(buildImageInsertConfig(e)),
  },
  { id: 'gallery', label: 'Image Gallery', icon: '▦', group: 'Media', action: (e) => e.chain().focus().insertContent({ type: 'imageGallery', attrs: {} }).run() },
  {
    id: 'youtube', label: 'YouTube Embed', icon: '▶', group: 'Media',
    action: (e, setModalConfig) => {
      setModalConfig({
        title: 'YouTube Embed',
        fields: [{ key: 'url', label: 'YouTube URL', type: 'url', placeholder: 'https://youtube.com/watch?v=...', required: true }],
        onInsert: ({ url }) => e.chain().focus().setYoutubeVideo({ src: String(url) }).run(),
      });
    },
  },
  { id: 'twitchclip', label: 'Twitch Clip', icon: '🎮', group: 'Media', action: (e, setModalConfig, addToast) => {
      setModalConfig({
        title: 'Twitch Clip Embed',
        fields: [{ key: 'url', label: 'Twitch Clip URL', type: 'url', placeholder: 'https://clips.twitch.tv/...', required: true }],
        onInsert: ({ url }) => {
          const rawUrl = String(url);
          let clipId = "";
          const clipsMatch = rawUrl.match(/clips\.twitch\.tv\/([a-zA-Z0-9_-]+)/);
          if (clipsMatch) clipId = clipsMatch[1];
          else {
            const channelMatch = rawUrl.match(/twitch\.tv\/[a-zA-Z0-9_-]+\/clip\/([a-zA-Z0-9_-]+)/);
            if (channelMatch) clipId = channelMatch[1];
          }
          
          if (!clipId) {
            addToast({ type: 'error', message: 'Invalid Twitch Clip URL' });
            return;
          }
          
          // Fix #2: Use actual hostname \u2014 parent=localhost breaks in production
          const parent = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
          const html = `<div class="twitch-embed"><iframe src="https://clips.twitch.tv/embed?clip=${clipId}&parent=${parent}" frameborder="0" allowfullscreen="true" scrolling="no" height="378" width="620"></iframe></div>`;
          e.chain().focus().insertContent(html, { parseOptions: { preserveWhitespace: 'full' } }).run();
        }
      });
    }
  },
  { id: 'adslot', label: 'Ad Slot', icon: '💰', group: 'Monetisation', action: (e, setModalConfig) => {
      const zoneOptions = Object.keys(AD_ZONES).map(key => ({ label: `${key} - ${AD_ZONES[key].name} (${AD_ZONES[key].width}x${AD_ZONES[key].height})`, value: key }));
      setModalConfig({
        title: 'Insert Ad Slot',
        fields: [{ key: 'zoneId', label: 'Ad Zone', type: 'select', options: zoneOptions, required: true }],
        onInsert: ({ zoneId }) => {
          e.chain().focus().insertContent({
            type: 'adSlot',
            attrs: { zoneId }
          }).run();
        }
      });
    }
  },
  { id: 'muxvideo', label: 'Mux Video', icon: '🎬', group: 'Media', action: (e, setModalConfig, addToast, openMux) => {
      if (openMux) openMux();
    }
  }
];

slashRegistry.register(mediaSlashCommands);
