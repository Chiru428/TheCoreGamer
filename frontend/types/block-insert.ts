/**
 * Shared types for the BlockInsertModal system.
 *
 * Kept in types/ (not components/) so that lib/slash-registry.ts can import
 * them without creating a lib → components dependency inversion.
 * BlockInsertModal.tsx imports from here too, so the types stay in one place.
 */

import type { OEmbedResult } from '@/lib/oembed';

export interface FieldConfig {
  key: string;
  label: string;
  type: 'text' | 'url' | 'number' | 'select' | 'textarea' | 'image' | 'oembed-url';
  placeholder?: string;
  defaultValue?: string | number;
  /** Options for select fields */
  options?: { label: string; value: string }[];
  /** Numeric field constraints */
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
  /** Short helper text shown beside the field label (e.g. "visible under image") */
  hint?: string;
  /** For 'oembed-url' fields: maps a fetched oEmbed result (or null on failure) into extra field values to merge into the form */
  onOEmbedResult?: (result: OEmbedResult | null, url: string) => Record<string, string | number>;
}

export interface BlockInsertModalConfig {
  title: string;
  fields: FieldConfig[];
  onInsert: (values: Record<string, string | number>) => void;
  /** Label for the primary action button (default: "Insert") */
  insertLabel?: string;
  /** Optional tabs — when present, the modal shows a tab bar and uses the active tab's fields instead of `fields` */
  tabs?: { id: string; label: string; fields: FieldConfig[] }[];
}
