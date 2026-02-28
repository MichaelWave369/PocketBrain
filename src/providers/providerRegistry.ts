import { LocalWebLlmProvider } from './localWebllmProvider';
import { OllamaProvider } from './ollamaProvider';
import { OpenAiCompatibleProvider } from './openaiCompatibleProvider';
import type { ChatProvider, ProviderSettings, ProviderType } from './types';

const localProvider = new LocalWebLlmProvider();
const ollamaProvider = new OllamaProvider();
const openAiProvider = new OpenAiCompatibleProvider();

const providers: Record<ProviderType, ChatProvider> = {
  'local-webllm': localProvider,
  'ollama-bridge': ollamaProvider,
  'openai-compatible-bridge': openAiProvider
};

export const getProvider = (providerType: ProviderSettings['type']): ChatProvider => providers[providerType];

export const getProviderLabel = (providerType: ProviderSettings['type']): string => providers[providerType].label;

export const getProviderOptions = () =>
  [
    { value: 'local-webllm', label: 'Local WebLLM' },
    { value: 'ollama-bridge', label: 'Ollama Bridge' },
    { value: 'openai-compatible-bridge', label: 'OpenAI-Compatible Bridge' }
  ] as const;
