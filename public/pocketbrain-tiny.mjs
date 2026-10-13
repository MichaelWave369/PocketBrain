/**
 * PocketBrain Tiny experimental browser adapter.
 * This module contains no pretrained weights. Calling createPocketBrainTiny()
 * is an explicit network action: it loads a versioned runtime from jsDelivr
 * and browser-ready ONNX model artifacts from Hugging Face.
 */
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
  if (context.trim()) {
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
 * Explicit initialization. No runtime, model, or prompt leaves the device
 * before the caller invokes this function. Initial artifact downloads
 * contact jsDelivr and the Hugging Face Hub; generation happens on-device.
 * This is an experimental integration, not a verified PhiStream decoder.
 */
export async function createPocketBrainTiny({
  preferredDevice = 'auto',
  onProgress = () => {},
} = {}) {
  const available = typeof navigator !== 'undefined' && Boolean(navigator.gpu);
  const { device, dtype } = selectTinyBackend(preferredDevice, available);
  onProgress({ status: 'runtime-download', device, dtype });
  const { pipeline } = await import(TINY_RUNTIME_URL);
  onProgress({ status: 'model-initializing', device, dtype });
  const generator = await pipeline('text-generation', TINY_MODEL_ID, {
    device,
    dtype,
    progress_callback: (event) => onProgress(event),
  });
  let disposed = false;
  let busy = false;

  return {
    model: TINY_MODEL_ID,
    device,
    dtype,
    async generate(prompt, opts = {}) {
      if (disposed) throw new Error('PocketBrain Tiny runtime has been disposed.');
      if (busy) throw new Error('PocketBrain Tiny already has a generation in progress.');
      const messages = buildTinyMessages(prompt, opts);
      const cap = Number.isFinite(opts.maxNewTokens)
        ? Math.min(TINY_MAX_NEW_TOKENS, Math.max(1, Math.floor(opts.maxNewTokens)))
        : 64;
      busy = true;
      try {
        const output = await generator(messages, {
          max_new_tokens: cap,
          do_sample: false,
          return_full_text: false,
        });
        const reply = extractTinyReply(output);
        if (!reply) throw new Error('The model returned no usable assistant text.');
        return reply;
      } finally {
        busy = false;
      }
    },
    async dispose() {
      if (busy) throw new Error('Cannot dispose during generation.');
      if (disposed) return;
      disposed = true;
      await generator.dispose?.();
    },
  };
}
