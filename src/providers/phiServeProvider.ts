// PhiServe browser-to-local bridge: token-authenticated text-only adapter.
import type { ChatProvider, ProviderContext, ProviderGenerateRequest } from './types';

interface OllamaChatResponse {
  message?: { role?: string; content?: string };
  done?: boolean;
  error?: string;
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const TIMEOUT_MS = 180_000;
const MAX_BUFFER = 256 * 1024;

const loopbackBase = (input: string): string => {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error('PhiServe endpoint must be a valid local URL.');
  }
  if (url.protocol !== 'http:' || !LOCAL_HOSTS.has(url.hostname)
      || (url.pathname !== '/' && url.pathname !== '') || url.search || url.hash
      || url.username || url.password) {
    throw new Error('PhiServe v0.5 browser bridge only supports http://127.0.0.1:11435 on this same device.');
  }
  return url.origin;
};

export class PhiServeProvider implements ChatProvider {
  id = 'phiserve-bridge' as const;
  label = 'Bridge: PhiServe (same device)';

  private context: ProviderContext | null = null;
  private pending: AbortController | null = null;

  async initialize(context: ProviderContext): Promise<void> {
    this.context = context;
    if (context.settings.endpointUrl) {
      loopbackBase(context.settings.endpointUrl);
    }
  }

  isReady(): boolean {
    return Boolean(this.context?.settings.endpointUrl && this.context?.settings.apiKey && this.context?.settings.modelName);
  }

  private get base(): string {
    if (!this.context?.settings.endpointUrl) {
      throw new Error('PhiServe endpoint URL is missing.');
    }
    return loopbackBase(this.context.settings.endpointUrl.trim());
  }

  private get token(): string {
    const token = this.context?.settings.apiKey?.trim();
    if (!token) {
      throw new Error('PhiServe browser bridge needs its locally generated bearer token.');
    }
    return token;
  }

  private get model(): string {
    const name = this.context?.settings.modelName?.trim();
    if (!name) {
      throw new Error('Select a registered PhiServe model alias in Settings.');
    }
    return name;
  }

  private headers(): Record<string, string> {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${this.token}` };
  }

  private payload(request: ProviderGenerateRequest, stream: boolean) {
    return {
      model: this.model,
      stream,
      messages: [
        { role: 'system', content: request.systemPrompt },
        { role: 'system', content: `Memory context:\n${request.context}` },
        { role: 'user', content: request.userInput }
      ]
    };
  }

  private async post(request: ProviderGenerateRequest, stream: boolean, signal: AbortSignal): Promise<Response> {
    const response = await fetch(`${this.base}/api/chat`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(this.payload(request, stream)),
      signal
    });
    if (!response.ok) {
      const statusHint = response.status === 401 ? 'Check the local browser-bridge token.'
        : response.status === 403 ? 'This browser origin is not authorized.'
        : response.status === 409 ? 'Another model is serving requests; retry.'
        : response.status === 429 ? 'PhiServe is at its request limit.'
        : response.status === 503 ? 'PhiServe is loading or unavailable; retry.'
        : 'Check the model alias and local daemon.';
      throw new Error(`PhiServe request failed (${response.status}). ${statusHint}`);
    }
    return response;
  }

  async generate(request: ProviderGenerateRequest): Promise<string> {
    const controller = new AbortController();
    this.pending = controller;
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await this.post(request, false, controller.signal);
      const payload = await response.json() as OllamaChatResponse;
      if (payload.error) throw new Error(`PhiServe: ${payload.error}`);
      if (!payload.done || typeof payload.message?.content !== 'string') {
        throw new Error('PhiServe returned an incomplete or unsupported text response.');
      }
      return payload.message.content.trim();
    } finally {
      clearTimeout(timer);
      if (this.pending === controller) this.pending = null;
    }
  }

  async *generateStream(request: ProviderGenerateRequest): AsyncGenerator<string> {
    const controller = new AbortController();
    this.pending = controller;
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    try {
      const response = await this.post(request, true, controller.signal);
      if (!response.body) throw new Error('PhiServe streaming is unavailable in this browser.');
      reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let pending = '';
      let complete = false;
      const parseFrame = (line: string): { text: string; done: boolean } => {
        const frame = JSON.parse(line) as OllamaChatResponse;
        if (frame.error) throw new Error(`PhiServe stream error: ${frame.error}`);
        if (typeof frame.done !== 'boolean') throw new Error('Malformed PhiServe NDJSON event.');
        const content = frame.message?.content ?? '';
        if (typeof content !== 'string') throw new Error('Non-text PhiServe stream event.');
        return { text: content, done: frame.done };
      };
      while (!complete) {
        const next = await reader.read();
        if (next.done) {
          pending += decoder.decode();
          if (pending.trim()) {
            if (pending.length > MAX_BUFFER) throw new Error('PhiServe event exceeded size limit.');
            const event = parseFrame(pending.trim());
            if (event.text) yield event.text;
            complete = event.done;
          }
          break;
        }
        pending += decoder.decode(next.value, { stream: true });
        if (pending.length > MAX_BUFFER) throw new Error('PhiServe event exceeded size limit.');
        while (pending.includes('\n')) {
          const cut = pending.indexOf('\n');
          const line = pending.slice(0, cut).trim();
          pending = pending.slice(cut + 1);
          if (!line) continue;
          const event = parseFrame(line);
          if (event.text) yield event.text;
          if (event.done) {
            complete = true;
            break;
          }
        }
      }
      if (!complete) throw new Error('PhiServe stream ended before the final completion event.');
    } finally {
      clearTimeout(timer);
      if (reader) await reader.cancel().catch(() => undefined);
      if (this.pending === controller) this.pending = null;
    }
  }

  async interrupt(): Promise<void> {
    this.pending?.abort();
    this.pending = null;
  }

  async getModelList(): Promise<string[]> {
    const response = await fetch(`${this.base}/api/tags`, {
      headers: this.headers()
    });
    if (!response.ok) throw new Error(`PhiServe model list failed (${response.status}).`);
    const payload = await response.json() as { models?: Array<{ name?: string }> };
    return (payload.models ?? []).map(model => model.name).filter((name): name is string => Boolean(name));
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    try {
      const response = await fetch(`${this.base}/health`, { headers: this.headers() });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const models = await this.getModelList();
      return { ok: true, message: `Connected to same-device PhiServe (${models.length} registered models). Choose a model alias in Settings.` };
    } catch (error) {
      return {
        ok: false,
        message: `PhiServe not reachable or not authorized: ${error instanceof Error ? error.message : 'Unknown failure'}. Check same-device loopback, token, exact browser origin, CORS and browser local-network permissions.`
      };
    }
  }

  async transcribeAudio(): Promise<string> {
    throw new Error('PhiServe text bridge does not implement transcription.');
  }

  async describeImage(): Promise<string> {
    throw new Error('PhiServe text bridge does not implement image description.');
  }
}
