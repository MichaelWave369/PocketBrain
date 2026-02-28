import { useMemo, useState } from 'react';
import { searchMessages } from '../retrieval/retriever';
import type { ChatMessage, MemorySummary } from '../types';

interface MemoryPageProps {
  messages: ChatMessage[];
  summary: MemorySummary | null;
}

const snippet = (text: string, max = 140) => (text.length <= max ? text : `${text.slice(0, max)}...`);

export const MemoryPage = ({ messages, summary }: MemoryPageProps) => {
  const [query, setQuery] = useState('');

  const matches = useMemo(() => searchMessages(messages, query), [messages, query]);

  return (
    <section className="panel">
      <h2>Memory</h2>
      <p className="helper-text">Super-brain retrieval uses pinned summary + BM25-style relevance + recency.</p>

      <article className="card">
        <h3>Pinned Summary</h3>
        <p>{summary?.text || 'No summary yet. Start chatting to build memory.'}</p>
      </article>

      <article className="card">
        <h3>Search Memory</h3>
        <input
          className="search-input"
          placeholder="Search past messages"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query.trim() ? (
          <ul className="memory-list compact">
            {matches.length ? (
              matches.map((message) => (
                <li key={message.id}>
                  <strong>{message.role}</strong>
                  <span>{snippet(message.content)}</span>
                </li>
              ))
            ) : (
              <li>
                <span className="helper-text">No matches yet.</span>
              </li>
            )}
          </ul>
        ) : (
          <p className="helper-text">Enter a search term to find relevant memory snippets.</p>
        )}
      </article>

      <article className="card">
        <h3>Recent Turns ({messages.length})</h3>
        <ul className="memory-list">
          {messages.slice(-20).map((message) => (
            <li key={message.id}>
              <strong>{message.role}</strong>
              <span>{message.content}</span>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
};
