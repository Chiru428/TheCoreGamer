'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Editor } from '@tiptap/core';
import { TEXT_COLOR_PALETTE, getGroupedPalette, ColorEntry } from '@/config/textColors';

interface ThemeColorPickerProps {
  editor: Editor;
  onClose: () => void;
}

export const ThemeColorPicker = ({ editor, onClose }: ThemeColorPickerProps) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [activeTab, setActiveTab] = useState<string>('All');
  const [customColors, setCustomColors] = useState<ColorEntry[]>([]);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  
  const [newLightHex, setNewLightHex] = useState('#000000');
  const [newDarkHex, setNewDarkHex] = useState('#ffffff');
  const [newName, setNewName] = useState('');

  const ref = useRef<HTMLDivElement>(null);
  
  const currentColor = editor.getAttributes('textStyle').colorName;

  // Load custom colors from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('rte-custom-colors');
      if (stored) {
        setCustomColors(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load custom colors', e);
    }
  }, []);

  // Theme observer
  useEffect(() => {
    const root = document.documentElement;
    const currentTheme = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    setTheme(currentTheme);

    const observer = new MutationObserver(() => {
      setTheme(root.getAttribute('data-theme') === 'light' ? 'light' : 'dark');
    });
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  // Click outside and escape to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);
    
    // Focus trap (simple implementation)
    const focusable = ref.current?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable && focusable.length > 0) {
      (focusable[0] as HTMLElement).focus();
    }

    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [onClose]);

  const groupedPalette = useMemo(() => getGroupedPalette(), []);
  const allGroups = ['All', ...Object.keys(groupedPalette), 'Custom'];

  const displayedColors = useMemo(() => {
    if (activeTab === 'All') return [...TEXT_COLOR_PALETTE, ...customColors];
    if (activeTab === 'Custom') return customColors;
    return groupedPalette[activeTab] || [];
  }, [activeTab, customColors, groupedPalette]);

  const handleSaveCustomColor = () => {
    if (!newName.trim() || !/^#[0-9A-Fa-f]{6}$/.test(newLightHex) || !/^#[0-9A-Fa-f]{6}$/.test(newDarkHex)) return;
    
    const newColor: ColorEntry = {
      name: newName.trim(),
      light: newLightHex,
      dark: newDarkHex,
      group: 'Custom',
      isCustom: true
    };
    
    const updated = [...customColors, newColor];
    setCustomColors(updated);
    localStorage.setItem('rte-custom-colors', JSON.stringify(updated));
    setNewName('');
    setActiveTab('Custom');
    setIsCreatorOpen(false);
  };

  const handleApplyCustomColor = () => {
    if (!/^#[0-9A-Fa-f]{6}$/.test(newLightHex) || !/^#[0-9A-Fa-f]{6}$/.test(newDarkHex)) return;
    editor.commands.setCustomThemeColor(newLightHex, newDarkHex);
    onClose();
  };

  const handleRemoveCustomColor = (e: React.MouseEvent, colorToRemove: ColorEntry) => {
    e.stopPropagation();
    const updated = customColors.filter(c => c.name !== colorToRemove.name);
    setCustomColors(updated);
    localStorage.setItem('rte-custom-colors', JSON.stringify(updated));
  };

  const isValidHex = /^#[0-9A-Fa-f]{6}$/.test(newLightHex) && /^#[0-9A-Fa-f]{6}$/.test(newDarkHex);

  useEffect(() => {
    if (ref.current && ref.current.parentElement) {
      const parentRect = ref.current.parentElement.getBoundingClientRect();
      const popupWidth = 320;
      ref.current.style.position = 'fixed';
      ref.current.style.top = `${parentRect.bottom + 8}px`;
      if (parentRect.left + popupWidth > window.innerWidth) {
        ref.current.style.left = 'auto';
        ref.current.style.right = `${Math.max(8, window.innerWidth - parentRect.right)}px`;
      } else {
        ref.current.style.left = `${parentRect.left}px`;
        ref.current.style.right = 'auto';
      }
    }
  }, []);

  return (
    <div 
      ref={ref} 
      className="mt-2 rounded-xl z-[999] shadow-2xl w-[320px] bg-[var(--bg-surface,#1e293b)] border border-[var(--border,#334155)] text-[var(--text-primary,#f8fafc)] flex flex-col"
      role="dialog"
      aria-label="Theme Color Picker"
      tabIndex={-1}
    >
      <div className="flex justify-between items-center p-3 border-b border-[var(--border,#334155)]">
        <h3 className="font-bold text-xs flex items-center gap-1.5">🎨 Text Color</h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[var(--text-muted,#94a3b8)]">
            Previewing: {theme === 'light' ? '☀️' : '🌙'}
          </span>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close">×</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-[var(--border,#334155)] bg-[var(--bg-elevated,#0f172a)]">
        {allGroups.map(group => (
          <button
            key={group}
            type="button"
            onClick={() => setActiveTab(group)}
            className={`text-[10px] px-2 py-1 rounded transition-colors ${activeTab === group ? 'bg-[var(--accent,#3b82f6)] text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-[var(--border,#334155)]'}`}
            aria-label={`Show ${group} colors`}
          >
            {group}
          </button>
        ))}
      </div>

      {/* Swatches Grid */}
      <div className="p-3">
        <div className="grid grid-cols-8 gap-1.5 mb-3">
          {displayedColors.map(c => {
            const isCustomMatch = currentColor === `custom:${c.light}:${c.dark}`;
            const isNameMatch = currentColor && currentColor.toLowerCase() === c.name.toLowerCase();
            const isActive = c.isCustom ? isCustomMatch : isNameMatch;
            
            return (
              <div key={c.name} className="relative group/swatch">
                <button
                  type="button"
                  onClick={() => {
                    if (c.isCustom) {
                      editor.commands.setCustomThemeColor(c.light, c.dark);
                    } else {
                      editor.commands.setThemeColor(c.name);
                    }
                    onClose();
                  }}
                  className={`w-7 h-7 rounded-full relative flex-shrink-0 ${isActive ? 'ring-2 ring-offset-1 ring-offset-[var(--bg-surface)] ring-white' : 'hover:scale-110 transition-transform'}`}
                  style={{ backgroundColor: c.light }}
                  title={`${c.name} — ☀️ ${c.light} / 🌙 ${c.dark}`}
                  aria-label={c.name}
                >
                  <span 
                    className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-white/30"
                    style={{ backgroundColor: c.dark }}
                  />
                </button>
                {c.isCustom && (
                  <button
                    type="button"
                    onClick={(e) => handleRemoveCustomColor(e, c)}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-3.5 h-3.5 text-[8px] flex items-center justify-center opacity-0 group-hover/swatch:opacity-100 transition-opacity z-10"
                    aria-label={`Remove custom color ${c.name}`}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
          {displayedColors.length === 0 && (
            <div className="col-span-8 text-xs text-center text-gray-500 py-2">No colors found in this group.</div>
          )}
        </div>

        {/* Custom Color Creator */}
        <div className="border border-[var(--border,#334155)] rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setIsCreatorOpen(!isCreatorOpen)}
            className="w-full p-2 text-xs text-left bg-[var(--bg-elevated,#0f172a)] hover:bg-[var(--border,#334155)] flex justify-between items-center transition-colors"
            aria-expanded={isCreatorOpen}
            aria-label="Toggle custom color creator"
          >
            <span>➕ Add Custom Color</span>
            <span className="text-gray-500">{isCreatorOpen ? '▼' : '▶'}</span>
          </button>
          
          {isCreatorOpen && (
            <div className="p-3 bg-[var(--bg-surface,#1e293b)] text-xs flex flex-col gap-3">
              <div className="flex gap-2 items-center">
                <span className="w-16 text-gray-400">☀️ Light:</span>
                <input 
                  type="color" 
                  value={newLightHex} 
                  onChange={e => setNewLightHex(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer p-0 border-0 bg-transparent"
                  aria-label="Light mode color picker"
                />
                <input 
                  type="text" 
                  value={newLightHex} 
                  onChange={e => setNewLightHex(e.target.value)}
                  className="flex-1 bg-black/20 border border-[var(--border,#334155)] rounded px-2 py-1 uppercase"
                  placeholder="#FFFFFF"
                  aria-label="Light mode hex input"
                />
              </div>
              
              <div className="flex gap-2 items-center">
                <span className="w-16 text-gray-400">🌙 Dark:</span>
                <input 
                  type="color" 
                  value={newDarkHex} 
                  onChange={e => setNewDarkHex(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer p-0 border-0 bg-transparent"
                  aria-label="Dark mode color picker"
                />
                <input 
                  type="text" 
                  value={newDarkHex} 
                  onChange={e => setNewDarkHex(e.target.value)}
                  className="flex-1 bg-black/20 border border-[var(--border,#334155)] rounded px-2 py-1 uppercase"
                  placeholder="#000000"
                  aria-label="Dark mode hex input"
                />
              </div>

              <div className="flex gap-2 items-center">
                <span className="w-16 text-gray-400">Name:</span>
                <input 
                  type="text" 
                  value={newName} 
                  onChange={e => setNewName(e.target.value)}
                  className="flex-1 bg-black/20 border border-[var(--border,#334155)] rounded px-2 py-1"
                  placeholder="e.g., Brand Blue"
                  aria-label="Custom color name"
                />
              </div>

              <div className="bg-black/20 p-2 rounded border border-[var(--border,#334155)] flex justify-between gap-2">
                <div className="bg-white px-2 py-1.5 rounded w-1/2 text-center font-semibold flex flex-col items-center justify-center" style={{ color: isValidHex ? newLightHex : 'inherit' }}>
                  <span className="text-[9px] opacity-50 uppercase tracking-wider mb-0.5" style={{ color: isValidHex ? newLightHex : 'inherit' }}>Light Mode</span>
                  Sample
                </div>
                <div className="bg-slate-900 px-2 py-1.5 rounded w-1/2 text-center font-semibold flex flex-col items-center justify-center" style={{ color: isValidHex ? newDarkHex : 'inherit' }}>
                  <span className="text-[9px] opacity-50 uppercase tracking-wider mb-0.5" style={{ color: isValidHex ? newDarkHex : 'inherit' }}>Dark Mode</span>
                  Sample
                </div>
              </div>

              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={handleSaveCustomColor}
                  disabled={!isValidHex || !newName.trim()}
                  className="flex-1 bg-[var(--border,#334155)] hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed py-1.5 rounded transition-colors"
                  aria-label="Save to My Colors"
                >
                  Save to My Colors
                </button>
                <button
                  type="button"
                  onClick={handleApplyCustomColor}
                  disabled={!isValidHex}
                  className="flex-1 bg-[var(--accent,#3b82f6)] hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-1.5 rounded transition-colors"
                  aria-label="Apply Custom Color Now"
                >
                  Apply Now
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-3 border-t border-[var(--border,#334155)]">
        <button 
          type="button" 
          onClick={() => {
            editor.commands.unsetThemeColor();
            onClose();
          }} 
          disabled={!currentColor}
          className="w-full py-1.5 bg-[var(--bg-elevated,#0f172a)] hover:bg-red-500/20 hover:text-red-400 border border-[var(--border,#334155)] hover:border-red-500/50 rounded text-xs transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Remove Color"
        >
          × Remove Color
        </button>
      </div>
    </div>
  );
};
