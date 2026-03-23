// packages/shared/src/types/status.ts
// StatusPreset 및 StatusAttribute 타입 — Phase 2-A

// ---- StatusAttribute ----

export interface StatusAttribute {
  name: string;
  type: 'number' | 'text' | 'gauge';
  max_value?: number | null;
}

// ---- StatusPreset ----

export interface StatusPreset {
  id: string;
  title: string;
  genre: string;
  attributes: StatusAttribute[];
  created_at: string;
  updated_at: string;
}

export type StatusPresetCreateInput = Omit<StatusPreset, 'id' | 'created_at' | 'updated_at'>;
export type StatusPresetUpdateInput = Partial<StatusPresetCreateInput>;
