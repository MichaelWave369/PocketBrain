import { useMemo, useState } from 'react';
import { searchMessages, tokenizeText } from '../retrieval/retriever';
import type { ChatMessage, MemorySummary } from '../types';
import type { VoiceNote } from '../voice/types';
import type { ImageMemory } from '../camera/types';

interface MemoryPageProps {
  messages: ChatMessage[];
  summary: MemorySummary | null;
  voiceNotes: VoiceNote[];
  imageMemories?: ImageMemory[];
  onDeleteVoiceNote: (id: string) => Promise<void>;
  onDeleteImageMemory?: (id: string) => Promise<void>;
}

const PINNED_KEY = 'pocketbrain-pinned-memory-ids';

const snippet = (text: string, max = 140) => (text.length <= max ? text : `${text.slice(0, max)}...`);

const getDayMs = () => 24 * 60 * 60 * 1000;

const estimateTokens = (text: string) => Math.ceil(text.trim().split(/\s+/).filter(Boolean).length * 1.3);

export const MemoryPage = ({ messages, summary, voiceNotes, imageMemories = [], onDeleteVoiceNote, onDeleteImageMemory }: MemoryPageProps) => {
  const [query, setQuery] = useState('');
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(PINNED_KEY);
      return new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      return new Set<string>();
    }
  });
  const [expandedImageId, setExpandedImageId] = useState<string | null>(null);

  const transcriptMemories = voiceNotes.map((note) => note.transcript).filter((text): text is string => Boolean(text));

  // Derive text snippets from ImageMemory objects for search
  const imageMemoryTexts = imageMemories
    .flatMap((m) => [m.analysisSummary, m.caption, m.notes])
    .map((t) => t?.trim() ?? '')
    .filter((t): t is string => Boolean(t));

  const matches = useMemo(
    () => searchMessages(messages, query, { transcriptMemories, imageMemories: imageMemoryTexts }),
    [messages, query, transcriptMemories, imageMemoryTexts]
  );

  const togglePinned = (id: string) => {
    const next = new Set(pinnedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setPinnedIds(next);
    localStorage.setItem(PINNED_KEY, JSON.stringify([...next]));
  };

  const sevenDaysAgo = Date.now() - 7 * getDayMs();
  const timelineMessages = messages.filter((message) => message.createdAt >= sevenDaysAgo).slice(-30).reverse();
  const timelineVoice = voiceNotes.filter((note) => note.createdAt >= sevenDaysAgo);
  const timelineImages = imageMemories.filter((img) => img.createdAt >= sevenDaysAgo);

  const totalTokenEstimate = useMemo(
    () => messages.reduce((sum, message) => sum + estimateTokens(message.content), 0) + transcriptMemories.reduce((sum, text) => sum + estimateTokens(text), 0),
    [messages, transcriptMemories]
  );

  const topInterests = useMemo(() => {
    const freq = new Map<string, number>();
    messages
      .filter((message) => message.role === 'user')
      .flatMap((message) => tokenizeText(message.content))
      .forEach((token) => freq.set(token, (freq.get(token) ?? 0) + 1));

    return [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([token]) => token);
  }, [messages]);

  const recurringThemes = useMemo(() => {
    const freq = new Map<string, number>();
    messages
      .flatMap((message) => tokenizeText(message.content))
      .forEach((token) => freq.set(token, (freq.get(token) ?? 0) + 1));

    return [...freq.entries()]
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([token]) => token);
  }, [messages]);

  return (
    <section className="panel settings-panel">
      <h2>Memory</h2>
      <p className="helper-text">Timeline + pinned snippets make memory behavior visible and trustworthy.</p>

      <article className="card">
        <h3>Memory Snapshot</h3>
        <p>
          I know about your <strong>{topInterests.length}</strong> interests ({topInterests.join(', ') || 'growing...'}), and{' '}
          <strong>{recurringThemes.length}</strong> recurring themes ({recurringThemes.join(', ') || 'none yet'}).
        </p>
        <ul className="memory-list compact">
          <li>
            <strong>{voiceNotes.length}</strong>
            <span>Voice notes</span>
          </li>
          <li>
            <strong>{imageMemories.length}</strong>
            <span>Image memories</span>
          </li>
          <li>
            <strong>{messages.length}</strong>
            <span>Chat messages</span>
          </li>
          <li>
            <strong>~{totalTokenEstimate}</strong>
            <span>Estimated memory tokens</span>
          </li>
        </ul>
      </article>

      <article className="card">
        <h3>Pinned Summary</h3>
        <p>{summary?.text || 'No summary yet. Start chatting to build memory.'}</p>
      </article>

      <article className="card">
        <h3>Memory Timeline (last 7 days)</h3>
        <ul className="memory-list compact">
          {timelineMessages.length || timelineVoice.length || timelineImages.length ? (
            <>
              {timelineImages.map((img) => (
                <li key={`img-${img.id}`}>
                  <strong>{new Date(img.createdAt).toLocaleString()} · image</strong>
                  <div className="memory-image-row">
                    <img
                      src={URL.createObjectURL(img.blob)}
                      alt={img.caption || 'Memory image'}
                      className="memory-thumb"
                      onClick={() => setExpandedImageId(expandedImageId === img.id ? null : img.id)}
                    />
                    <span>{img.caption || img.analysisSummary || 'No description'}</span>
                  </div>
                  {expandedImageId === img.id ? (
                    <div className="memory-image-expanded">
                      <img src={URL.createObjectURL(img.blob)} alt={img.caption || 'Memory image'} className="memory-image-full" />
                      {img.notes ? <p className="helper-text">{img.notes}</p> : null}
                      {onDeleteImageMemory ? (
                        <button className="ghost danger" onClick={() => void onDeleteImageMemory(img.id)}>Delete image</button>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              ))}
              {timelineMessages.map((message) => (
                <li key={message.id}>
                  <strong>
                    {new Date(message.createdAt).toLocaleString()} · {message.role}
                  </strong>
                  <span>{snippet(message.content)}</span>
                  <button className="ghost" onClick={() => togglePinned(message.id)}>
                    {pinnedIds.has(message.id) ? 'Unpin' : 'Pin'}
                  </button>
                </li>
              ))}
              {timelineVoice.map((note) => (
                <li key={`voice-${note.id}`}>
                  <strong>{new Date(note.createdAt).toLocaleString()} · voice note</strong>
                  <span>{note.transcript ? `Transcript: ${snippet(note.transcript)}` : 'No transcript available.'}</span>
                </li>
              ))}
            </>
          ) : (
            <li>
              <span className="helper-text">No memory activity in the last 7 days.</span>
            </li>
          )}
        </ul>
      </article>

      {/* Image memories gallery */}
      {imageMemories.length > 0 ? (
        <article className="card">
          <h3>Image Memories ({imageMemories.length})</h3>
          <div className="image-memory-grid">
            {imageMemories.map((img) => (
              <div key={img.id} className="image-memory-tile">
                <img
                  src={URL.createObjectURL(img.blob)}
                  alt={img.caption || 'Memory image'}
                  className="image-memory-tile-img"
                  onClick={() => setExpandedImageId(expandedImageId === img.id ? null : img.id)}
                />
                <p className="image-memory-tile-label">{img.caption || img.analysisSummary || 'Untitled'}</p>
                {expandedImageId === img.id ? (
                  <div className="memory-image-expanded">
                    <img src={URL.createObjectURL(img.blob)} alt={img.caption || 'Memory image'} className="memory-image-full" />
                    {img.analysisSummary ? <p className="helper-text"><strong>Analysis:</strong> {img.analysisSummary}</p> : null}
                    {img.notes ? <p className="helper-text"><strong>Notes:</strong> {img.notes}</p> : null}
                    <p className="helper-text">{new Date(img.createdAt).toLocaleString()} · {img.source}</p>
                    {onDeleteImageMemory ? (
                      <button className="ghost danger" onClick={() => void onDeleteImageMemory(img.id)}>Delete image</button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </article>
      ) : null}

      <article className="card">
        <h3>Pinned Memories</h3>
        <ul className="memory-list compact">
          {[...pinnedIds].length ? (
            [...pinnedIds].map((id) => {
              const message = messages.find((item) => item.id === id);
              if (!message) {
                return null;
              }
              return (
                <li key={`pinned-${id}`}>
                  <strong>{message.role}</strong>
                  <span>{snippet(message.content)}</span>
                  <button className="ghost" onClick={() => togglePinned(id)}>
                    Unpin
                  </button>
                </li>
              );
            })
          ) : (
            <li>
              <span className="helper-text">Pin a memory from timeline to keep it handy.</span>
            </li>
          )}
        </ul>
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

      <article className="card">
        <h3>Voice Notes ({voiceNotes.length})</h3>
        <ul className="memory-list compact">
          {voiceNotes.length ? voiceNotes.map((note) => (
            <li key={note.id}>
              <strong>{new Date(note.createdAt).toLocaleString()}</strong>
              <audio controls src={URL.createObjectURL(note.audioBlob)} />
              <span>{note.transcript ? `Transcript: ${snippet(note.transcript)}` : 'No transcript available.'}</span>
              <button className="ghost danger" onClick={() => void onDeleteVoiceNote(note.id)}>Delete</button>
            </li>
          )) : (
            <li>
              <span className="helper-text">No voice notes stored yet.</span>
            </li>
          )}
        </ul>
      </article>
    </section>
  );
};
