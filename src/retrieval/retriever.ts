import type { ChatMessage, MemorySummary } from '../types';

const STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'the',
  'to',
  'for',
  'of',
  'in',
  'on',
  'at',
  'is',
  'it',
  'be',
  'as',
  'are',
  'this',
  'that',
  'with',
  'or',
  'by',
  'from',
  'i',
  'you',
  'we',
  'they'
]);

const RELEVANT_TOP_K = 6;
const RECENT_TURNS = 6;
const CONTEXT_BUDGET = 2600;

const toMemoryMessages = (items: string[] | undefined, prefix: 'voice' | 'image'): ChatMessage[] =>
  (items ?? [])
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text, index) => ({
      id: `${prefix}-${index}`,
      role: 'assistant' as const,
      content: prefix === 'image' ? `Image memory: ${text}` : text,
      createdAt: 0
    }));

export const tokenizeText = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));

const truncateToBudget = (parts: string[]): string => {
  let total = 0;
  const kept: string[] = [];

  for (const part of parts) {
    if (total + part.length > CONTEXT_BUDGET) {
      break;
    }
    kept.push(part);
    total += part.length;
  }

  return kept.join('\n\n');
};

const formatMessage = (message: ChatMessage): string => `${message.role}: ${message.content}`;

export const retrieveContext = (
  messages: ChatMessage[],
  summary: MemorySummary | null,
  draft = '',
  extraMemories: string[] = []
): string => {
  const recent = messages.slice(-RECENT_TURNS);
  const sections: string[] = [];

  if (summary?.text) {
    sections.push(`Pinned Summary:\n${summary.text}`);
  }

  const normalizedDraft = draft.trim();
  if (normalizedDraft) {
    sections.push(`Current Input:\n${normalizedDraft}`);
  }

  const extras = extraMemories.map((text) => text.trim()).filter(Boolean).slice(0, RELEVANT_TOP_K);
  if (extras.length) {
    sections.push(`Extra Memory Signals:\n${extras.map((text) => `assistant: ${text}`).join('\n')}`);
  }

  if (recent.length > 0) {
    sections.push(`Most Recent Turns:\n${recent.map(formatMessage).join('\n')}`);
  }

  return truncateToBudget(sections);
};

export const searchMessages = (
  messages: ChatMessage[],
  query: string,
  options?: { transcriptMemories?: string[]; imageMemories?: string[] }
): ChatMessage[] => {
  const queryTokens = tokenizeText(query);
  if (!queryTokens.length) {
    return [];
  }

  const allMessages = [
    ...messages,
    ...toMemoryMessages(options?.transcriptMemories, 'voice'),
    ...toMemoryMessages(options?.imageMemories, 'image')
  ];

  return allMessages
    .map((message) => {
      const tokens = tokenizeText(message.content);
      const overlap = queryTokens.filter((token) => tokens.includes(token)).length;
      return { message, overlap };
    })
    .filter((entry) => entry.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap || b.message.createdAt - a.message.createdAt)
    .slice(0, 12)
    .map((entry) => entry.message);
};
