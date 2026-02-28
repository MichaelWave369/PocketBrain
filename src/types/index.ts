export type Role = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
}

export interface MemorySummary {
  id: string;
  text: string;
  updatedAt: number;
  pinned: boolean;
}

export interface AppSettings {
  localOnlyMode: boolean;
  selectedModel: string;
}

export type ModelStatus = 'idle' | 'loading' | 'ready' | 'generating' | 'error';

export interface ModelResult {
  text: string;
}
