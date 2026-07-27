import { Editor } from '@tiptap/core';
import { BlockInsertModalConfig } from '../types/block-insert';

export type { BlockInsertModalConfig } from '../types/block-insert';
export type { FieldConfig } from '../types/block-insert';

export type OpenModalFn = (config: BlockInsertModalConfig | null) => void;
export type AddToastFn = (toast: { type: 'success' | 'error' | 'info' | 'warning', message: string }) => void;

export type OpenMuxFn = () => void;

export interface SlashItem {
  id: string;
  label: string;
  icon: string;
  group: string;
  description?: string;
  action: (editor: Editor, openModal: OpenModalFn, addToast: AddToastFn, openMux?: OpenMuxFn) => void;
}

export interface SlashRegistry {
  register(items: SlashItem[]): void;
  getAll(): SlashItem[];
  getByGroup(group: string): SlashItem[];
}

class Registry implements SlashRegistry {
  private items: Map<string, SlashItem> = new Map();

  register(items: SlashItem[]): void {
    for (const item of items) {
      if (this.items.has(item.id)) {
        console.warn(`[SlashRegistry] Duplicate command id: '${item.id}'. Overwriting.`);
      }
      this.items.set(item.id, item);
    }
  }

  getAll(): SlashItem[] {
    return Array.from(this.items.values());
  }

  getByGroup(group: string): SlashItem[] {
    return this.getAll().filter(item => item.group === group);
  }
}

export const slashRegistry = new Registry();
