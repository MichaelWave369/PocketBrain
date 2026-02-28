import type { ChatProvider, ProviderContext, ProviderGenerateRequest } from './types';

const OPENAI_FALLBACK_MODEL = 'gpt-4o-mini';

interface OpenAiCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Unable to read image payload.'));
    reader.readAsDataURL(blob);
  });

export class OpenAiCompatibleProvider implements ChatProvider {
  id = 'openai-compatible-bridge' as const;
  label = 'Bridge: OpenAI-compatible';

  private context: ProviderContext | null = null;

  async initialize(context: ProviderContext): Promise<void> {
    this.context = context;
  }

  isReady(): boolean {
    return Boolean(this.context?.settings.endpointUrl);
  }

  private get endpoint(): string {
    const base = this.context?.settings.endpointUrl?.trim();
    if (!base) {
      throw new Error('Bridge endpoint URL is missing.');
    }
    return base.endsWith('/v1') ? `${base}/chat/completions` : `${base}/v1/chat/completions`;
  }

  private buildPayload(request: ProviderGenerateRequest) {
    return {
      model: this.context?.settings.modelName || OPENAI_FALLBACK_MODEL,
      messages: [
        { role: 'system', content: request.systemPrompt },
        { role: 'system', content: `Memory context:\n${request.context}` },
        { role: 'user', content: request.userInput }
      ]
    };
  }

  async generate(request: ProviderGenerateRequest): Promise<string> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.context?.settings.apiKey ? { Authorization: `Bearer ${this.context.settings.apiKey}` } : {})
      },
      body: JSON.stringify(this.buildPayload(request))
    });

    if (!response.ok) {
      throw new Error(`OpenAI-compatible request failed (${response.status}).`);
    }

    const data = (await response.json()) as OpenAiCompletionResponse;
    return data.choices?.[0]?.message?.content?.trim() || 'No response received from bridge model.';
  }

  async *generateStream(request: ProviderGenerateRequest): AsyncGenerator<string> {
    yield await this.generate(request);
  }

  async interrupt(): Promise<void> {
    return;
  }

  async getModelList(): Promise<string[]> {
    if (!this.context?.settings.endpointUrl) {
      return [];
    }

    const base = this.context.settings.endpointUrl.endsWith('/v1')
      ? this.context.settings.endpointUrl
      : `${this.context.settings.endpointUrl}/v1`;

    const response = await fetch(`${base}/models`, {
      headers: this.context.settings.apiKey ? { Authorization: `Bearer ${this.context.settings.apiKey}` } : undefined
    });

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as { data?: Array<{ id?: string }> };
    return (data.data ?? []).map((item) => item.id).filter((id): id is string => Boolean(id));
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    try {
      const models = await this.getModelList();
      return { ok: true, message: models.length ? `Connected (${models.length} models visible).` : 'Connected.' };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Unable to connect to OpenAI-compatible endpoint.'
      };
    }
  }

  async transcribeAudio(): Promise<string> {
    throw new Error('Bridge transcription endpoint contract not configured yet.');
  }

  async describeImage(imageBlob: Blob, options?: { prompt?: string }): Promise<string> {
    const dataUrl = await blobToDataUrl(imageBlob);
    const prompt = options?.prompt?.trim() || 'Describe this image for a private memory note.';

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.context?.settings.apiKey ? { Authorization: `Bearer ${this.context.settings.apiKey}` } : {})
      },
      body: JSON.stringify({
        model: this.context?.settings.modelName || OPENAI_FALLBACK_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: dataUrl } }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error('Image description failed on bridge endpoint. Check model vision support and API compatibility.');
    }

    const data = (await response.json()) as OpenAiCompletionResponse;
    return data.choices?.[0]?.message?.content?.trim() || 'No image description returned by bridge provider.';
  }
}
