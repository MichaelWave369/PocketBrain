import type { ProgressReport, WebLlmEngine } from '../model/webllmService';

export type ProviderType = 'local-webllm' | 'ollama-bridge' | 'openai-compatible-bridge';

export interface ProviderSettings {
  type: ProviderType;
  endpointUrl: string;
  modelName: string;
  apiKey: string;
  rememberLocally: boolean;
  fallbackToLocalOnFailure: boolean;
  useWebWorker?: boolean;
  useIndexedDbCache?: boolean;
}

export interface ProviderContext {
  settings: ProviderSettings;
  onProgress?: (report: ProgressReport) => void;
}

export interface ChatProvider {
  id: ProviderType;
  label: string;
  initialize: (context: ProviderContext) => Promise<void>;
  isReady: () => boolean;
  generate: (request: ProviderGenerateRequest) => Promise<string>;
  generateStream: (request: ProviderGenerateRequest) => AsyncGenerator<string>;
  interrupt: () => Promise<void>;
  getModelList?: () => Promise<string[]>;
  testConnection?: () => Promise<{ ok: boolean; message: string }>;
}

export interface ProviderGenerateRequest {
  systemPrompt: string;
  context: string;
  userInput: string;
}

export interface ProviderRegistryResult {
  provider: ChatProvider;
  localEngine: WebLlmEngine | null;
}
