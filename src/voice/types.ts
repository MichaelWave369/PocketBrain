export type VoiceState =
  | 'idle'
  | 'requesting_permission'
  | 'recording'
  | 'transcribing'
  | 'ready'
  | 'error';

export interface VoiceNote {
  id: string;
  createdAt: number;
  durationMs: number;
  mimeType: string;
  audioBlob: Blob;
  transcript?: string;
  linkedChatId?: string;
}

export interface VoiceResult {
  blob: Blob;
  durationMs: number;
  mimeType: string;
  transcript?: string;
  transcriptionSupported: boolean;
}
