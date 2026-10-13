/**
 * PocketBrain Tiny SDK candidate v0.1.
 * No remote service or model is contacted by importing this module.
 * The host application must call load() as an explicit user action.
 * Experimental: not a stable release or verified cross-origin package.
 */
import { createPocketBrainTiny } from '../../pocketbrain-tiny.mjs';

export const POCKETBRAIN_TINY_SDK_VERSION = '0.1.0-experimental';

export function createPocketBrainTinyClient({
  loadRuntime = createPocketBrainTiny,
  onStateChange = () => {},
} = {}) {
  if (typeof loadRuntime !== 'function' || typeof onStateChange !== 'function') {
    throw new TypeError('loadRuntime and onStateChange must be functions.');
  }

  let phase = 'idle';
  let session = null;
  let loadPromise = null;
  let error = null;
  let runCount = 0;

  const snapshot = () => Object.freeze({
    phase,
    version: POCKETBRAIN_TINY_SDK_VERSION,
    ready: phase === 'ready',
    model: session?.model ?? null,
    device: session?.device ?? null,
    dtype: session?.dtype ?? null,
    completedRuns: runCount,
    error,
  });

  const transition = (next, message = null) => {
    phase = next;
    error = message;
    // Observers must never change the model's lifecycle or generation outcome.
    try { onStateChange(snapshot()); } catch { /* observer isolation */ }
  };

  return Object.freeze({
    getStatus: snapshot,

    /**
     * Explicit permission boundary. The default loader fetches Transformers.js
     * code and pretrained ONNX artifacts from external hosts after this call.
     * Call from a host application's user-click handler, not at app startup.
     */
    async load({ preferredDevice = 'auto', onProgress = () => {} } = {}) {
      if (phase === 'disposed') throw new Error('Client is disposed; create a new client.');
      if (phase === 'generating') throw new Error('Cannot load during generation.');
      if (phase === 'ready') return snapshot();
      if (loadPromise) return loadPromise;
      if (typeof onProgress !== 'function') throw new TypeError('onProgress must be a function.');
      transition('loading');

      loadPromise = (async () => {
        try {
          const loaded = await loadRuntime({ preferredDevice, onProgress });
          if (typeof loaded?.generateWithReceipt !== 'function' || typeof loaded?.dispose !== 'function') {
            throw new Error('Model runtime does not satisfy the SDK contract.');
          }
          session = loaded;
          transition('ready');
          return snapshot();
        } catch (reason) {
          transition('error', reason instanceof Error ? reason.message : String(reason));
          throw reason;
        } finally {
          loadPromise = null;
        }
      })();
      return loadPromise;
    },

    /** Runs the actual loaded model, returning its text and honest receipt. */
    async generate(prompt, {
      mode = 'baseline', maxNewTokens = 64, onText,
    } = {}) {
      if (phase !== 'ready' || !session) {
        throw new Error('Model is not ready. Load it explicitly first.');
      }
      if (typeof prompt !== 'string' || !prompt.trim()) {
        throw new Error('Enter a non-empty prompt.');
      }
      if (onText !== undefined && typeof onText !== 'function') {
        throw new TypeError('onText must be a function.');
      }
      transition('generating');
      try {
        const result = await session.generateWithReceipt(prompt, { mode, maxNewTokens, onText });
        if (typeof result?.text !== 'string' || !result.text.trim() ||
            !result.receipt || typeof result.receipt !== 'object') {
          throw new Error('Model returned an invalid generation/receipt.');
        }
        runCount += 1;
        transition('ready');
        return { text: result.text, receipt: result.receipt };
      } catch (reason) {
        // A failed generation does not silently switch to a different model.
        transition('ready', reason instanceof Error ? reason.message : String(reason));
        throw reason;
      }
    },

    /** Release the model. Create a new client instance to load it again. */
    async dispose() {
      if (phase === 'disposed') return;
      if (phase === 'loading' || phase === 'generating') {
        throw new Error('Cannot dispose during loading or generation.');
      }
      if (session) await session.dispose();
      session = null;
      transition('disposed');
    },
  });
}
