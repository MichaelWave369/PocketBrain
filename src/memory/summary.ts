import type { ChatMessage, MemorySummary } from '../types';
import { createId } from '../utils/id';

const MAX_SUMMARY_CHARS = 700;

export const updateRollingSummary = (
  existing: MemorySummary | null,
  userMessage: ChatMessage,
  assistantMessage: ChatMessage
): MemorySummary => {
  const previous = existing?.text ? `${existing.text}\n` : '';
  const nextChunk = `User: ${userMessage.content}\nAssistant: ${assistantMessage.content}`;
  const merged = `${previous}${nextChunk}`;

  return {
    id: existing?.id ?? createId(),
    text: merged.slice(-MAX_SUMMARY_CHARS),
    updatedAt: Date.now(),
    pinned: true
  };
};
