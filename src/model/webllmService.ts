import type { ChatMessage, ModelResult } from '../types';

export interface ProgressReport {
  text?: string;
  progress?: number;
}

export interface WebLlmEngine {
  chat: {
    completions: {
      create: (request: {
        messages: Array<{ role: string; content: string }>;
        temperature?: number;
        stream?: boolean;
      }) => Promise<{ choices?: Array<{ message?: { content?: string } }> }> | AsyncIterable<unknown>;
    };
  };
  interruptGenerate?: () => void;
  resetChat?: (keepStats?: boolean) => Promise<void>;
  unload?: () => Promise<void>;
}

interface AppConfigModel {
  model_id?: string;
}

interface WebLlmModule {
  CreateMLCEngine: (modelId: string | string[], options?: Record<string, unknown>) => Promise<WebLlmEngine>;
  CreateWebWorkerMLCEngine: (
    worker: Worker,
    modelId: string | string[],
    options?: Record<string, unknown>
  ) => Promise<WebLlmEngine>;
  prebuiltAppConfig?: { model_list?: AppConfigModel[] };
}

const MODEL_FALLBACKS = [
  'Llama-3.2-1B-Instruct-q4f16_1-MLC',
  'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
  'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
  'SmolLM2-1.7B-Instruct-q4f16_1-MLC'
];

let cachedEngine: WebLlmEngine | null = null;
let cachedKey: string | null = null;
let failedState = false;

const loadWebllm = async (): Promise<WebLlmModule> => (await import('@mlc-ai/web-llm')) as unknown as WebLlmModule;

const toChatMessages = (systemPrompt: string, context: string, userInput: string): ChatMessage[] => [
  { id: 'system', role: 'system', content: systemPrompt, createdAt: Date.now() },
  { id: 'context', role: 'system', content: `Memory context:\n${context}`, createdAt: Date.now() },
  { id: 'user-input', role: 'user', content: userInput, createdAt: Date.now() }
];

const engineKey = (modelId: string, useWorker: boolean, useIndexedDbCache: boolean) =>
  `${modelId}::${useWorker ? 'worker' : 'main'}::${useIndexedDbCache ? 'cache' : 'no-cache'}`;

export const getCuratedModelList = async (): Promise<string[]> => {
  try {
    const webllm = await loadWebllm();
    const discovered = (webllm.prebuiltAppConfig?.model_list ?? [])
      .map((entry) => entry.model_id)
      .filter((modelId): modelId is string => Boolean(modelId))
      .filter((modelId) => /instruct/i.test(modelId) && /(0\.5b|1b|1\.5b|1\.7b|2b)/i.test(modelId));

    const merged = [...MODEL_FALLBACKS, ...discovered];
    return [...new Set(merged)].slice(0, 6);
  } catch {
    return MODEL_FALLBACKS;
  }
};

export const bootstrapModel = async (
  modelId: string,
  onProgress: (report: ProgressReport) => void,
  options?: { useWebWorker?: boolean; useIndexedDbCache?: boolean }
): Promise<WebLlmEngine> => {
  const useWebWorker = options?.useWebWorker ?? true;
  const useIndexedDbCache = options?.useIndexedDbCache ?? false;
  const key = engineKey(modelId, useWebWorker, useIndexedDbCache);

  if (!failedState && cachedEngine && cachedKey === key) {
    return cachedEngine;
  }

  const webllm = await loadWebllm();

  try {
    if (useWebWorker) {
      const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
      cachedEngine = await webllm.CreateWebWorkerMLCEngine(worker, modelId, {
        useIndexedDBCache: useIndexedDbCache,
        initProgressCallback: onProgress
      });
    } else {
      cachedEngine = await webllm.CreateMLCEngine(modelId, {
        useIndexedDBCache: useIndexedDbCache,
        initProgressCallback: onProgress
      });
    }
  } catch (workerError) {
    console.warn('Worker model bootstrap failed, falling back to main thread engine.', workerError);
    cachedEngine = await webllm.CreateMLCEngine(modelId, {
      useIndexedDBCache: useIndexedDbCache,
      initProgressCallback: onProgress
    });
  }

  cachedKey = key;
  failedState = false;
  return cachedEngine;
};

const extractChunkText = (chunk: unknown): string => {
  if (!chunk || typeof chunk !== 'object') {
    return '';
  }

  const maybeChunk = chunk as {
    choices?: Array<{ delta?: { content?: string }; message?: { content?: string } }>;
  };

  return maybeChunk.choices?.[0]?.delta?.content ?? maybeChunk.choices?.[0]?.message?.content ?? '';
};

export async function* generateReplyStream(
  modelEngine: WebLlmEngine,
  systemPrompt: string,
  context: string,
  userInput: string
): AsyncGenerator<string> {
  const messages = toChatMessages(systemPrompt, context, userInput);
  const stream = await modelEngine.chat.completions.create({
    messages: messages.map((message) => ({ role: message.role, content: message.content })),
    temperature: 0.7,
    stream: true
  });

  if (!stream || typeof stream !== 'object' || !(Symbol.asyncIterator in stream)) {
    return;
  }

  for await (const chunk of stream as AsyncIterable<unknown>) {
    const text = extractChunkText(chunk);
    if (text) {
      yield text;
    }
  }
}

export const generateReply = async (
  modelEngine: WebLlmEngine,
  systemPrompt: string,
  context: string,
  userInput: string
): Promise<ModelResult> => {
  const messages = toChatMessages(systemPrompt, context, userInput);
  const response = (await modelEngine.chat.completions.create({
    messages: messages.map((message) => ({ role: message.role, content: message.content })),
    temperature: 0.7
  })) as { choices?: Array<{ message?: { content?: string } }> };

  const text = response.choices?.[0]?.message?.content?.trim() ?? 'I could not generate a response.';
  return { text };
};

export const stopGeneration = async (modelEngine: WebLlmEngine): Promise<void> => {
  try {
    modelEngine.interruptGenerate?.();
    await modelEngine.resetChat?.(true);
  } catch (error) {
    console.warn('Model stop/reset failed. Unloading engine for safety.', error);
    failedState = true;
    try {
      await modelEngine.unload?.();
    } catch {
      // no-op
    }
    cachedEngine = null;
    cachedKey = null;
  }
};

export const resetModelEngine = async (): Promise<void> => {
  if (!cachedEngine) {
    cachedKey = null;
    return;
  }

  try {
    await cachedEngine.unload?.();
  } catch {
    // no-op
  }

  cachedEngine = null;
  cachedKey = null;
  failedState = false;
};

export const getDeviceDiagnostics = async (): Promise<{ gpuVendor: string; maxStorageBufferBindingSize: string }> => {
  if (!('gpu' in navigator)) {
    return {
      gpuVendor: 'Unavailable (WebGPU not detected)',
      maxStorageBufferBindingSize: 'Unavailable'
    };
  }

  try {
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } }).gpu;
    const adapter = await gpu?.requestAdapter();
    if (!adapter) {
      return {
        gpuVendor: 'Unavailable (no adapter)',
        maxStorageBufferBindingSize: 'Unavailable'
      };
    }

    const adapterWithDetails = adapter as {
      requestAdapterInfo?: () => Promise<{ vendor?: string }>;
      limits?: { maxStorageBufferBindingSize?: number };
    };
    const info = await adapterWithDetails.requestAdapterInfo?.();
    return {
      gpuVendor: info?.vendor ?? 'Unknown vendor',
      maxStorageBufferBindingSize: `${adapterWithDetails.limits?.maxStorageBufferBindingSize ?? 'Unavailable'}`
    };
  } catch {
    return {
      gpuVendor: 'Unavailable',
      maxStorageBufferBindingSize: 'Unavailable'
    };
  }
};
