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
  imageMemories?: string[];
  onDeleteVoiceNote: (id: string) => Promise<void>;
  onDeleteImageMemory: (id: string) => Promise<void>;
}

const snippet = (text: string, max = 140) => (text.length <= max ? text : `${text.slice(0, max)}...`);

export const MemoryPage = ({ messages, summary, voiceNotes, imageMemories = [], onDeleteVoiceNote }: MemoryPageProps) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'chat' | 'summary' | 'voice' | 'image'>('all');

  const transcriptMemories = voiceNotes.map((note) => note.transcript).filter((text): text is string => Boolean(text));

  const matches = useMemo(
    () => searchMessages(messages, query, { transcriptMemories, imageMemories }),
    [messages, query, transcriptMemories, imageMemories]
  );

  return (
    <section className="panel">
      <h2>Memory</h2>
      <p className="helper-text">Mixed timeline: chats, summaries, voice notes, image memories.</p>

      <article className="card">
        <h3>Pinned Summary</h3>
        <p>{summary?.text || 'No summary yet. Start chatting to build memory.'}</p>
      </article>

      <article className="card">
        <h3>Search Memory</h3>
        <input
          className="search-input"
          placeholder="Search messages, transcripts, and image memories"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
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
