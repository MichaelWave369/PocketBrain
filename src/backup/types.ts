import type { AppSettings, ChatMessage, MemorySummary } from '../types';
import type { VoiceNote } from '../voice/types';

export interface BackupData {
  version: 1;
  createdAt: string;
  appVersion: string;
  messages: ChatMessage[];
  summary: MemorySummary | null;
  settings: AppSettings | null;
  trustedBridgeEndpoints: string[];
  voiceNotes: Array<{
    id: string;
    createdAt: number;
    durationMs: number;
    mimeType: string;
    transcript?: string;
    linkedChatId?: string;
    base64Audio?: string;
  }>;
}

export interface EncryptedBackupEnvelope {
  version: 1;
  createdAt: string;
  appVersion: string;
  encrypted: true;
  cipher: 'AES-GCM';
  kdf: 'PBKDF2';
  iterations: number;
  salt: string;
  iv: string;
  payload: string;
}

export type BackupPackage = BackupData | EncryptedBackupEnvelope;

export type ImportMode = 'merge' | 'replace';

export interface BackupSummary {
  messageCount: number;
  summaryCount: number;
  voiceNoteCount: number;
  settingsIncluded: boolean;
  createdAt: string;
}

export const summarizeBackup = (backup: BackupData): BackupSummary => ({
  messageCount: backup.messages.length,
  summaryCount: backup.summary ? 1 : 0,
  voiceNoteCount: backup.voiceNotes.length,
  settingsIncluded: Boolean(backup.settings),
  createdAt: backup.createdAt
});

export const toVoiceNoteData = async (note: VoiceNote) => ({
  id: note.id,
  createdAt: note.createdAt,
  durationMs: note.durationMs,
  mimeType: note.mimeType,
  transcript: note.transcript,
  linkedChatId: note.linkedChatId,
  base64Audio: await blobToBase64(note.audioBlob)
});

export const fromVoiceNoteData = (entry: BackupData['voiceNotes'][number]): VoiceNote => ({
  id: entry.id,
  createdAt: entry.createdAt,
  durationMs: entry.durationMs,
  mimeType: entry.mimeType,
  transcript: entry.transcript,
  linkedChatId: entry.linkedChatId,
  audioBlob: base64ToBlob(entry.base64Audio ?? '', entry.mimeType)
});

const blobToBase64 = async (blob: Blob): Promise<string> => {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const base64ToBlob = (value: string, mimeType: string): Blob => {
  const binary = atob(value || '');
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new Blob([bytes], { type: mimeType || 'audio/webm' });
};
