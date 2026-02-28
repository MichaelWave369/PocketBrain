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
const BM25_K1 = 1.5;
const BM25_B = 0.75;

export const tokenizeText = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));

const scoreBm25 = (queryTokens: string[], docs: string[][]): number[] => {
  const avgDocLength = docs.reduce((sum, doc) => sum + doc.length, 0) / Math.max(docs.length, 1);

  const docFreq = new Map<string, number>();
  docs.forEach((doc) => {
    const unique = new Set(doc);
    unique.forEach((token) => docFreq.set(token, (docFreq.get(token) ?? 0) + 1));
  });

  return docs.map((doc) => {
    const freq = new Map<string, number>();
    doc.forEach((token) => freq.set(token, (freq.get(token) ?? 0) + 1));

    let score = 0;
    queryTokens.forEach((token) => {
      const f = freq.get(token) ?? 0;
      if (!f) {
        return;
      }

      const df = docFreq.get(token) ?? 0;
      const idf = Math.log(1 + (docs.length - df + 0.5) / (df + 0.5));
      const denom = f + BM25_K1 * (1 - BM25_B + BM25_B * (doc.length / Math.max(avgDocLength, 1)));
      score += idf * ((f * (BM25_K1 + 1)) / denom);
    });

    return score;
  });
};

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
  userInput: string,
  transcriptMemories: string[] = []
): string => {
  const queryTokens = tokenizeText(userInput);
  const transcriptMessages: ChatMessage[] = transcriptMemories.map((text, index) => ({
    id: `voice-${index}`,
    role: "assistant",
    content: text,
    createdAt: 0
  }));

  const allMessages = [...messages, ...transcriptMessages];
  const docs = allMessages.map((message) => tokenizeText(message.content));
  const scores = scoreBm25(queryTokens, docs);

  const relevant = allMessages
    .map((message, index) => ({ message, score: scores[index] ?? 0 }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, RELEVANT_TOP_K)
    .map((item) => item.message);

  const recent = messages.slice(-RECENT_TURNS);

  const uniqueRelevant = relevant.filter((candidate) => !recent.some((item) => item.id === candidate.id));

  const sections: string[] = [];

  if (summary?.text) {
    sections.push(`Pinned Summary:\n${summary.text}`);
  }

  if (uniqueRelevant.length > 0) {
    sections.push(`Relevant Past Messages:\n${uniqueRelevant.map(formatMessage).join('\n')}`);
  }

  if (recent.length > 0) {
    sections.push(`Most Recent Turns:\n${recent.map(formatMessage).join('\n')}`);
  }

  return truncateToBudget(sections.filter(Boolean));
};

export const searchMessages = (messages: ChatMessage[], query: string): ChatMessage[] => {
  const queryTokens = tokenizeText(query);
  if (!queryTokens.length) {
    return [];
  }

  const scored = messages
    .map((message) => {
      const tokens = tokenizeText(message.content);
      const overlap = queryTokens.filter((token) => tokens.includes(token)).length;
      return { message, overlap };
    })
    .filter((entry) => entry.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap || b.message.createdAt - a.message.createdAt)
    .slice(0, 12)
    .map((entry) => entry.message);

  return scored;
};
