import type { ChatProvider, ProviderContext, ProviderGenerateRequest } from './types';

const OLLAMA_DEFAULT_MODEL = 'llama3.2:3b-instruct-q4_K_M';

interface OllamaGenerateResponse {
  response?: string;
}

export class OllamaProvider implements ChatProvider {
  id = 'ollama-bridge' as const;
  label = 'Bridge: Ollama';

  private context: ProviderContext | null = null;

  async initialize(context: ProviderContext): Promise<void> {
    this.context = context;
  }

  isReady(): boolean {
    return Boolean(this.context?.settings.endpointUrl);
  }

  private get endpointBase(): string {
    const base = this.context?.settings.endpointUrl?.trim();
    if (!base) {
      throw new Error('Ollama endpoint URL is missing.');
    }
    return base.replace(/\/$/, '');
  }

  async generate(request: ProviderGenerateRequest): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(`${this.endpointBase}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.context?.settings.modelName || OLLAMA_DEFAULT_MODEL,
          prompt: `${request.systemPrompt}\n\nMemory context:\n${request.context}\n\nUser: ${request.userInput}`,
          stream: false
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Ollama bridge failed (${response.status}).`);
      }

      const data = (await response.json()) as OllamaGenerateResponse;
      return data.response?.trim() || 'No response received from Ollama bridge.';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('Ollama bridge timed out. Check LAN reachability and CORS settings.');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async *generateStream(request: ProviderGenerateRequest): AsyncGenerator<string> {
    yield await this.generate(request);
  }

  async interrupt(): Promise<void> {
    return;
  }

  async getModelList(): Promise<string[]> {
    try {
      const response = await fetch(`${this.endpointBase}/api/tags`);
      if (!response.ok) {
        return [];
      }
      const data = (await response.json()) as { models?: Array<{ name?: string }> };
      return (data.models ?? []).map((model) => model.name).filter((name): name is string => Boolean(name));
    } catch {
      return [];
    }
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    try {
      const models = await this.getModelList();
      return {
        ok: models.length > 0,
        message: models.length
          ? `Connected to Ollama (${models.length} models found).`
          : 'No models listed. Verify Ollama is running and reachable.'
      };
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error
            ? `${error.message} Ensure Ollama is on the same LAN and CORS allows browser access.`
            : 'Unable to connect to Ollama bridge endpoint.'
      };
    }
  }

  async transcribeAudio(): Promise<string> {
    throw new Error('Ollama transcription bridge is not implemented yet.');
  }
}
