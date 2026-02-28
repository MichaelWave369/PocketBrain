import type { ImageMemory } from '../camera/types';
import type { ChatMessage, MemorySummary } from '../types';
import type { VoiceNote } from '../voice/types';
import type { MemoryIndexItem } from './memoryTypes';

export const buildMemoryIndex = (
  messages: ChatMessage[],
  summary: MemorySummary | null,
  voiceNotes: VoiceNote[],
  images: ImageMemory[]
): MemoryIndexItem[] => {
  const indexed: MemoryIndexItem[] = [];

  messages.forEach((message) => {
    indexed.push({ id: message.id, type: 'chat_message', createdAt: message.createdAt, text: message.content });
  });

  if (summary?.text) {
    indexed.push({ id: summary.id, type: 'summary', createdAt: summary.updatedAt, text: summary.text, pinned: true });
  }

  voiceNotes.forEach((note) => {
    if (note.transcript?.trim()) {
      indexed.push({ id: note.id, type: 'voice_note', createdAt: note.createdAt, text: note.transcript });
    }
  });

  images.forEach((image) => {
    const text = [image.caption, image.notes, image.ocrText, image.analysisSummary].filter(Boolean).join('\n').trim();
    if (text) {
      indexed.push({ id: image.id, type: 'image_memory', createdAt: image.createdAt, text, pinned: image.pinned });
    }
  });

  return indexed.sort((a, b) => b.createdAt - a.createdAt);
};
