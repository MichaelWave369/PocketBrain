import type { ChatMessage, MemorySummary } from '../types';

const RECENT_LIMIT = 6;

export const retrieveContext = (messages: ChatMessage[], summary: MemorySummary | null): string => {
  const recent = messages.slice(-RECENT_LIMIT).map((message) => `${message.role}: ${message.content}`).join('\n');

  if (!summary?.text) {
    return recent;
  }

  return [`Pinned summary:\n${summary.text}`, 'Recent turns:', recent].filter(Boolean).join('\n\n');
};
