export type TtsState = 'unsupported' | 'loading_voices' | 'ready' | 'speaking' | 'paused' | 'error';

export interface TtsSettings {
  enabled: boolean;
  autoReadReplies: boolean;
  voiceURI: string;
  rate: number;
  pitch: number;
  volume: number;
}
