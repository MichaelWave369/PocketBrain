import { useEffect, useRef, useState } from 'react';
import { StatusPill } from '../components/StatusPill';
import { generateReply } from '../model/webllmService';
import { retrieveContext } from '../retrieval/retriever';
import type { ChatMessage, MemorySummary, ModelStatus } from '../types';
import { createId } from '../utils/id';

interface ChatPageProps {
  messages: ChatMessage[];
  summary: MemorySummary | null;
  modelStatus: ModelStatus;
  modelError: string | null;
  onSend: (userMessage: ChatMessage, assistantMessage: ChatMessage) => Promise<void>;
  onClear: () => Promise<void>;
  modelEngineReady: boolean;
  modelEngine: import('../model/webllmService').WebLlmEngine | null;
}

const SYSTEM_PROMPT = 'You are PocketBrain, a concise assistant running locally in a private environment.';

export const ChatPage = ({
  messages,
  summary,
  modelStatus,
  modelError,
  onSend,
  onClear,
  modelEngineReady,
  modelEngine
}: ChatPageProps) => {
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async () => {
    const content = draft.trim();
    if (!content || !modelEngine || !modelEngineReady) {
      return;
    }

    setIsSending(true);
    try {
      const userMessage: ChatMessage = { id: createId(), role: 'user', content, createdAt: Date.now() };
      const context = retrieveContext(messages, summary);
      const result = await generateReply(modelEngine, SYSTEM_PROMPT, context, content);
      const assistantMessage: ChatMessage = {
        id: createId(),
        role: 'assistant',
        content: result.text,
        createdAt: Date.now()
      };

      setDraft('');
      await onSend(userMessage, assistantMessage);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section className="panel chat-panel">
      <div className="chat-toolbar">
        <StatusPill status={isSending ? 'generating' : modelStatus} />
        <button className="ghost" onClick={() => void onClear()}>
          Clear chat
        </button>
      </div>

      {modelError ? <p className="error-text">{modelError}</p> : null}

      <div className="message-list" ref={listRef}>
        {messages.length === 0 ? <p className="helper-text">Start the first conversation turn.</p> : null}
        {messages.map((message) => (
          <article key={message.id} className={`message message-${message.role}`}>
            <strong>{message.role === 'user' ? 'You' : 'PocketBrain'}</strong>
            <p>{message.content}</p>
          </article>
        ))}
      </div>

      <div className="composer">
        <textarea
          placeholder="Type your message"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={2}
        />
        <button onClick={() => void handleSend()} disabled={!modelEngineReady || isSending || !draft.trim()}>
          Send
        </button>
      </div>
    </section>
  );
};
