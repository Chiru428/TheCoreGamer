import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React, { useState, useEffect, useCallback, memo } from 'react';
import { renderMentionedGame, MentionedGameAttrs } from '../../lib/gaming-block-renderers';
import { Gamepad2, X, Settings2, Save, Trash2, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchGame } from '@/lib/api';

// --- Node View Component ------------------------------------------------------

const MentionedGameNodeView = memo((props: NodeViewProps) => {
  const { node, updateAttributes, selected, deleteNode } = props;
  const attrs = node.attrs as MentionedGameAttrs;
  
  // Auto-edit mode if empty
  const [isEditing, setIsEditing] = useState(() => !attrs.title);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleChange = (key: keyof MentionedGameAttrs, value: any) => {
    updateAttributes({ [key]: value });
  };

  const stopProp = (e: React.MouseEvent | React.FocusEvent) => {
    e.stopPropagation();
    if (e.type === 'mousedown' && !['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
      e.preventDefault();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing) {
      e.stopPropagation();
      if (!['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
      }
    }
  };

  // Basic debounce search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/games?search=${encodeURIComponent(searchQuery)}&limit=5`).then(r => r.json());
        setSearchResults(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const selectGame = async (gameSlug: string) => {
    setIsSearching(true);
    try {
      const res = await fetchGame(gameSlug, 0);
      const full = res.data;
      if (full) {
        updateAttributes({
          slug: full.slug,
          title: full.title || '',
          developer: full.developer || '',
          publisher: full.publisher || '',
          releaseDate: full.releaseDate ? new Date(full.releaseDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '',
          platforms: Array.isArray(full.platforms) ? full.platforms.join(', ') : (full.platforms || ''),
          genres: Array.isArray(full.genres) ? full.genres.join(', ') : (full.genres || ''),
          coverImageUrl: full.coverImageUrl || '',
        });
        setSearchQuery('');
        setSearchResults([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <NodeViewWrapper className="mentioned-game-node-wrapper relative group my-8" onMouseDown={handleMouseDown}>
      {/* Visual Parity Rendering */}
      <div 
        className={cn(
          "transition-all duration-200",
          selected && !isEditing && "ring-2 ring-purple-500 rounded-xl shadow-lg scale-[1.01]",
          (!attrs.title && !isEditing) && "opacity-50"
        )}
        dangerouslySetInnerHTML={{ __html: renderMentionedGame(attrs) }} 
      />

      {/* Action Buttons Overlay */}
      <div className={cn(
        "absolute top-4 right-4 flex gap-2 transition-opacity duration-200 z-10",
        (selected || isEditing) ? "opacity-100" : "opacity-0 group-hover:opacity-100"
      )}>
        {!isEditing ? (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="p-2 bg-slate-900/80 hover:bg-slate-800 text-purple-400 rounded-lg border border-purple-500/30 shadow-xl backdrop-blur-md flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-all"
            onMouseDown={stopProp}
          >
            <Settings2 className="w-4 h-4" />
            Edit Block
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="p-2 bg-green-500/80 hover:bg-green-600 text-white rounded-lg border border-green-400/30 shadow-xl backdrop-blur-md flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-all"
            onMouseDown={stopProp}
          >
            <Save className="w-4 h-4" />
            Done
          </button>
        )}
        <button
          type="button"
          onClick={deleteNode}
          className="p-2 bg-red-500/80 hover:bg-red-600 text-white rounded-lg border border-red-400/30 shadow-xl backdrop-blur-md transition-all"
          onMouseDown={stopProp}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Edit Panel */}
      {isEditing && (
        <div 
          className="absolute z-50 top-full left-0 right-0 mt-2 p-6 bg-[#0d1527] border border-purple-500/30 rounded-2xl shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200"
          onMouseDown={stopProp}
        >
          <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
            <div className="flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-purple-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Mentioned Game Config</h3>
            </div>
            <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-6 relative">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Search Game Database to Autofill</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Type a game name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                onFocus={stopProp}
              />
              {isSearching && <Loader2 className="w-4 h-4 absolute right-3 top-3 animate-spin text-purple-400" />}
            </div>
            {searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                {searchResults.map((g) => (
                  <button
                    type="button"
                    key={g.id}
                    className="w-full text-left px-4 py-2 hover:bg-purple-500/20 text-sm text-slate-200 transition-colors flex items-center justify-between"
                    onClick={() => selectGame(g.slug)}
                    onMouseDown={stopProp}
                  >
                    <span className="font-medium">{g.title}</span>
                    {g.releaseYear && <span className="text-xs text-slate-400">{g.releaseYear}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-white/5 pt-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Title</label>
              <input type="text" value={attrs.title} onChange={(e) => handleChange('title', e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white focus:outline-none text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cover Image URL</label>
              <input type="text" value={attrs.coverImageUrl || ''} onChange={(e) => handleChange('coverImageUrl', e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white focus:outline-none text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Developer</label>
              <input type="text" value={attrs.developer} onChange={(e) => handleChange('developer', e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white focus:outline-none text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Publisher</label>
              <input type="text" value={attrs.publisher} onChange={(e) => handleChange('publisher', e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white focus:outline-none text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Genres (comma separated)</label>
              <input type="text" value={attrs.genres} onChange={(e) => handleChange('genres', e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white focus:outline-none text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Release Date</label>
              <input type="text" value={attrs.releaseDate} onChange={(e) => handleChange('releaseDate', e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white focus:outline-none text-sm" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Platforms (comma separated)</label>
              <input type="text" value={attrs.platforms} onChange={(e) => handleChange('platforms', e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white focus:outline-none text-sm" />
            </div>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
});

MentionedGameNodeView.displayName = 'MentionedGameNodeView';

// --- Extension Definition -----------------------------------------------------

export const MentionedGameNode = Node.create({
  name: 'mentionedGame',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      title: { default: '' },
      developer: { default: '' },
      publisher: { default: '' },
      genres: { default: '' },
      releaseDate: { default: '' },
      platforms: { default: '' },
      coverImageUrl: { default: '' },
      slug: { default: '' }
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="mentioned-game"]',
        getAttrs: (element: string | HTMLElement) => {
          if (typeof element === 'string') return {};
          // Fallback parsing from HTML if needed, though TipTap usually stores attrs in JSON
          return {};
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    // We defer to our custom renderer function for public HTML string building
    return ['div', mergeAttributes({ 'data-type': 'mentioned-game' }, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MentionedGameNodeView);
  },
});

export const MentionedGameSlashCommand = {
  id: 'mentioned-game',
  title: 'Mentioned Game',
  description: 'Add a "Mentioned in this article" game card',
  icon: Gamepad2,
  command: ({ editor, range }: any) => {
    editor.chain().focus().deleteRange(range).insertContent({
      type: 'mentionedGame',
      attrs: {
        title: '',
        developer: '',
        publisher: '',
        genres: '',
        releaseDate: '',
        platforms: '',
        coverImageUrl: '',
        slug: ''
      }
    }).run();
  },
};
