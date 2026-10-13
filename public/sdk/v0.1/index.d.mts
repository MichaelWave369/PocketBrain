export type TinyPhase = 'idle' | 'loading' | 'ready' | 'generating' | 'error' | 'disposed';
export type TinyBackend = 'auto' | 'webgpu' | 'wasm';
export type TinyMode = 'baseline' | 'guarded';
export type TinyReceipt = {
  schema: 'POCKETBRAIN_TINY_RUN_V2';
  evidence: string;
  model: string;
  backend: string;
  dtype: string;
  mode: TinyMode;
  generation_wall_ms: number;
  time_to_first_token_callback_ms: number | null;
  time_to_first_visible_text_ms: number | null;
  observed_token_callback_events: number;
  callback_events_per_second_full_wall: number | null;
  prompt_or_output_text_in_receipt: boolean;
  external_reference_parity: string;
  [other: string]: unknown;
};
export type TinyStatus = Readonly<{
  phase: TinyPhase;
  version: string;
  ready: boolean;
  model: string | null;
  device: string | null;
  dtype: string | null;
  completedRuns: number;
  error: string | null;
}>;
export type TinyRuntime = {
  model: string;
  device: string;
  dtype: string;
  generateWithReceipt(prompt: string, options?: {
    mode?: TinyMode;
    maxNewTokens?: number;
    onText?: (accumulatedText: string) => void;
  }): Promise<{ text: string; receipt: TinyReceipt }>;
  dispose(): Promise<void>;
};
export declare const POCKETBRAIN_TINY_SDK_VERSION: '0.1.0-experimental';
export declare function createPocketBrainTinyClient(options?: {
  /** Test injection only; default loader downloads a real model on explicit load(). */
  loadRuntime?: (options: {
    preferredDevice: TinyBackend;
    onProgress: (event: unknown) => void;
  }) => Promise<TinyRuntime>;
  onStateChange?: (status: TinyStatus) => void;
}): Readonly<{
  getStatus(): TinyStatus;
  /** Must be invoked only after a clear user action/consent. */
  load(options?: {
    preferredDevice?: TinyBackend;
    onProgress?: (event: unknown) => void;
  }): Promise<TinyStatus>;
  generate(prompt: string, options?: {
    mode?: TinyMode;
    maxNewTokens?: number;
    onText?: (accumulatedText: string) => void;
  }): Promise<{ text: string; receipt: TinyReceipt }>;
  dispose(): Promise<void>;
}>;
