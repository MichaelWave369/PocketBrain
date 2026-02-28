import type { ChatMessage, MemorySummary } from '../types';

interface MemoryPageProps {
  messages: ChatMessage[];
  summary: MemorySummary | null;
}

export const MemoryPage = ({ messages, summary }: MemoryPageProps) => (
  <section className="panel">
    <h2>Memory</h2>
    <p className="helper-text">Simple retrieval uses this pinned summary and recent turns.</p>

    <article className="card">
      <h3>Pinned Summary</h3>
      <p>{summary?.text || 'No summary yet. Start chatting to build memory.'}</p>
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
