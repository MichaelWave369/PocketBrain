import { useMemo, useState } from 'react';
import { ImageMemoryCard } from '../components/ImageMemoryCard';
import { searchMessages } from '../retrieval/retriever';
import type { ImageMemory } from '../camera/types';
import type { ChatMessage, MemorySummary } from '../types';
import type { VoiceNote } from '../voice/types';

interface MemoryPageProps {
  messages: ChatMessage[];
  summary: MemorySummary | null;
  voiceNotes: VoiceNote[];
  imageMemories: ImageMemory[];
  onDeleteVoiceNote: (id: string) => Promise<void>;
  onDeleteImageMemory: (id: string) => Promise<void>;
}

const snippet = (text: string, max = 140) => (text.length <= max ? text : `${text.slice(0, max)}...`);

export const MemoryPage = ({ messages, summary, voiceNotes, imageMemories, onDeleteVoiceNote, onDeleteImageMemory }: MemoryPageProps) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'chat' | 'summary' | 'voice' | 'image'>('all');

  const transcriptMessages = voiceNotes.filter((note) => note.transcript).map((note) => ({ id: `voice-${note.id}`, role: 'assistant' as const, content: note.transcript ?? '', createdAt: note.createdAt }));
  const imageTextMessages = imageMemories.map((image) => ({ id: `image-${image.id}`, role: 'assistant' as const, content: [image.caption, image.notes, image.ocrText, image.analysisSummary].filter(Boolean).join(' ').trim(), createdAt: image.createdAt })).filter((entry) => entry.content);

  const searchable = [...messages, ...transcriptMessages, ...imageTextMessages];
  const matches = useMemo(() => searchMessages(searchable, query), [searchable, query]);

  return (
    <section className="panel">
      <h2>Memory</h2>
      <p className="helper-text">Mixed timeline: chats, summaries, voice notes, image memories.</p>

      <article className="card">
        <h3>Pinned Summary</h3>
        <p>{summary?.text || 'No summary yet. Start chatting to build memory.'}</p>
      </article>

      <article className="card">
        <h3>Filter & Search</h3>
        <label className="settings-row">
          <span>Type filter</span>
          <select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}>
            <option value="all">All</option>
            <option value="chat">Chat</option>
            <option value="summary">Summary</option>
            <option value="voice">Voice</option>
            <option value="image">Image</option>
          </select>
        </label>
        <input className="search-input" placeholder="Search text fields" value={query} onChange={(event) => setQuery(event.target.value)} />
        {query.trim() ? (
          <ul className="memory-list compact">
            {matches.length ? matches.map((message) => <li key={message.id}><strong>{message.id.split('-')[0]}</strong><span>{snippet(message.content)}</span></li>) : <li><span className="helper-text">No matches yet.</span></li>}
          </ul>
        ) : null}
      </article>

      {(filter === 'all' || filter === 'voice') ? (
        <article className="card">
          <h3>Voice Notes ({voiceNotes.length})</h3>
          <ul className="memory-list compact">
            {voiceNotes.map((note) => (
              <li key={note.id}>
                <strong>{new Date(note.createdAt).toLocaleString()}</strong>
                <audio controls src={URL.createObjectURL(note.audioBlob)} />
                <span>{note.transcript ? `Transcript: ${snippet(note.transcript)}` : 'No transcript available.'}</span>
                <button className="ghost danger" onClick={() => void onDeleteVoiceNote(note.id)}>Delete</button>
              </li>
            ))}
          </ul>
        </article>
      ) : null}

      {(filter === 'all' || filter === 'image') ? (
        <article className="card">
          <h3>Image Memories ({imageMemories.length})</h3>
          <div className="image-grid">
            {imageMemories.map((image) => (
              <ImageMemoryCard
                key={image.id}
                image={image}
                onUpdate={async () => {}}
                onDelete={onDeleteImageMemory}
                onAttachToChat={() => {}}
              />
            ))}
          </div>
        </article>
      ) : null}

      {(filter === 'all' || filter === 'chat') ? (
        <article className="card">
          <h3>Recent Turns ({messages.length})</h3>
          <ul className="memory-list">
            {messages.slice(-20).map((message) => (
              <li key={message.id}><strong>{message.role}</strong><span>{message.content}</span></li>
            ))}
          </ul>
        </article>
      ) : null}
    </section>
  );
};
