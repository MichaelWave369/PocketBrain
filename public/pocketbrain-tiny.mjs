/**
 * PocketBrain Tiny v0.2 experimental browser adapter.
 * No model bytes bundled. The opt-in loader contacts jsDelivr and Hugging Face.
 */
import { createTinyRunReceipt, selectTinyGeneration } from './pocketbrain-tiny-metrics.mjs';

export const TINY_MODEL_ID = 'onnx-community/SmolLM2-135M-Instruct-ONNX-GQA';
export const TINY_BASE_MODEL = 'HuggingFaceTB/SmolLM2-135M-Instruct';
export const TINY_RUNTIME_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1';
export const TINY_MAX_NEW_TOKENS = 96;

export function selectTinyBackend(preferredDevice = 'auto', webGpuAvailable = false) {
  if (!['auto', 'webgpu', 'wasm'].includes(preferredDevice)) {
    throw new Error('Unknown device. Choose auto, webgpu, or wasm.');
  }
  if (preferredDevice === 'webgpu' && !webGpuAvailable) {
    throw new Error('WebGPU is unavailable. Select WASM explicitly or try another browser.');
  }
  const device = preferredDevice === 'auto'
    ? (webGpuAvailable ? 'webgpu' : 'wasm')
    : preferredDevice;
  return { device, dtype: device === 'webgpu' ? 'q4f16' : 'q8' };
}

export function buildTinyMessages(prompt, { system = 'You are PocketBrain, a concise assistant.', context = '' } = {}) {
  if (typeof prompt !== 'string' || !prompt.trim()) {
    throw new Error('Enter a prompt before generating.');
  }
  const messages = [{ role: 'system', content: String(system).slice(0, 1600) }];
  if (typeof context === 'string' && context.trim()) {
    messages.push({ role: 'system', content: 'User-selected local context: ' + context.slice(0, 3000) });
  }
  messages.push({ role: 'user', content: prompt.trim().slice(0, 4000) });
  return messages;
}

export function extractTinyReply(result) {
  const first = Array.isArray(result) ? result[0] : null;
  const text = first?.generated_text;
  if (typeof text === 'string') return text.trim();
  if (Array.isArray(text)) {
    const assistant = [...text].reverse().find((part) => part?.role === 'assistant' && typeof part.content === 'string');
    return assistant?.content?.trim() ?? '';
  }
  return '';
}

/**
 * Injectable inference harness for deterministic unit tests.
 * No network, model loading, or simulated inference happens here.
 * Generation is performed ONLY by the supplied pretrained model pipeline.
 */
export function createTinyRunner({
  generator, TextStreamer, device, dtype, model = TINY_MODEL_ID,
  initializationMs = null, now = () => performance.now(),
}) {
  if (typeof generator !== 'function' || typeof TextStreamer !== 'function') {
    throw new Error('A real text-generation pipeline and TextStreamer are required.');
  }
  let disposed = false;
  let busy = false;
  let runNumber = 0;

  const generateWithReceipt = async (prompt, opts = {}) => {
    if (disposed) throw new Error('PocketBrain Tiny runtime has been disposed.');
    if (busy) throw new Error('PocketBrain Tiny already has a generation in progress.');
    const messages = buildTinyMessages(prompt, opts);
    const { mode, options } = selectTinyGeneration(opts.mode ?? 'baseline', opts.maxNewTokens, TINY_MAX_NEW_TOKENS);
    const onText = typeof opts.onText === 'function' ? opts.onText : null;
    let stream = '';
    let tokenCallbackEvents = 0;
    let firstTokenAt = null;
    let firstVisibleTextAt = null;
    const startMs = now();

    const streamer = new TextStreamer(generator.tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function: (chunk) => {
        if (typeof chunk !== 'string' || !chunk) return;
        if (firstVisibleTextAt === null) firstVisibleTextAt = now();
        stream += chunk;
        onText?.(stream);
      },
      token_callback_function: () => {
        tokenCallbackEvents += 1;
        if (firstTokenAt === null) firstTokenAt = now();
      },
    });

    busy = true;
    try {
      const output = await generator(messages, { ...options, streamer });
      // The pipeline's final decoded assistant text is authoritative.
      // The streamed view is only an incremental preview.
      const text = extractTinyReply(output);
      if (!text) throw new Error('The model returned no usable assistant text.');
      onText?.(text);
      const receipt = createTinyRunReceipt({
        model, device, dtype, mode, config: options,
        runNumber: ++runNumber,
        startMs, firstTokenMs: firstTokenAt,
        firstVisibleTextMs: firstVisibleTextAt, finishMs: now(),
        tokenCallbackEvents, inputChars: prompt.trim().length, outputChars: text.length,
      });
      return { text, receipt };
    } finally {
      busy = false;
    }
  };

  return {
    model, device, dtype, initializationMs,
    generateWithReceipt,
    async generate(prompt, opts = {}) {
      const result = await generateWithReceipt(prompt, opts);
      return result.text;
    },
    async dispose() {
      if (busy) throw new Error('Cannot dispose during generation.');
      if (disposed) return;
      disposed = true;
      await generator.dispose?.();
    },
  };
}

/**
 * Explicit opt-in loader. Downloads versioned runtime code and model files.
 * The model output is computed in the browser, not at a remote inference API.
 */
export async function createPocketBrainTiny({ preferredDevice = 'auto', onProgress = () => {} } = {}) {
  const available = typeof navigator !== 'undefined' && Boolean(navigator.gpu);
  const { device, dtype } = selectTinyBackend(preferredDevice, available);
  const started = performance.now();
  onProgress({ status: 'runtime-download', device, dtype });
  const { pipeline, TextStreamer } = await import(TINY_RUNTIME_URL);
  onProgress({ status: 'model-initializing', device, dtype });
  const generator = await pipeline('text-generation', TINY_MODEL_ID, {
    device, dtype,
    progress_callback: (event) => onProgress(event),
  });
  return createTinyRunner({
    generator, TextStreamer, device, dtype,
    initializationMs: Math.round((performance.now() - started) * 100) / 100,
  });
}
