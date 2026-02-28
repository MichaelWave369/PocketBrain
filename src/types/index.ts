import type { ProviderType } from '../providers/types';

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
  useWebWorker: boolean;
  useIndexedDbCache: boolean;
  providerType: ProviderType;
  bridgeEndpointUrl: string;
  bridgeModelName: string;
  bridgeApiKey: string;
  rememberBridgeSettings: boolean;
  bridgeFallbackToLocal: boolean;
}

export type ModelStatus = 'idle' | 'loading' | 'ready' | 'generating' | 'error';

export interface ModelResult {
  text: string;
}

export interface DeviceDiagnostics {
  userAgent: string;
  gpuVendor: string;
  maxStorageBufferBindingSize: string;
}
