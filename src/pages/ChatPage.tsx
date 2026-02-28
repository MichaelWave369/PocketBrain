import { useEffect, useRef, useState } from 'react';
import { StatusPill } from '../components/StatusPill';
import { retrieveContext } from '../retrieval/retriever';
import type { ProviderGenerateRequest } from '../providers/types';
import type { ChatMessage, MemorySummary, ModelStatus } from '../types';
import { createId } from '../utils/id';

interface ChatPageProps {
  messages: ChatMessage[];
  summary: MemorySummary | null;
  modelStatus: ModelStatus;
  modelError: string | null;
  modelProgressText: string;
  modelProgressPct: number | null;
  activeProviderLabel: string;
  onGenerateWithProvider: (request: ProviderGenerateRequest, onChunk: (chunk: string) => void) => Promise<void>;
  onSend: (userMessage: ChatMessage, assistantMessage: ChatMessage) => Promise<void>;
  onStopGeneration: () => Promise<void>;
  onClear: () => Promise<void>;
  onResetModel: () => Promise<void>;
}

const SYSTEM_PROMPT =
  'You are PocketBrain, a concise assistant. Keep memory and retrieval local-first, and use bridge providers only when configured by the user.';

export const ChatPage = ({
  messages,
  summary,
  modelStatus,
  modelError,
  modelProgressText,
  modelProgressPct,
  activeProviderLabel,
  onGenerateWithProvider,
  onSend,
  onStopGeneration,
  onClear,
  onResetModel
}: ChatPageProps) => {
  const [draft, setDraft] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingUserMessage, setPendingUserMessage] = useState<ChatMessage | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, streamingText]);

  const handleStop = async () => {
    await onStopGeneration();
    setIsStreaming(false);
  };

  const handleSend = async () => {
    const content = draft.trim();
    if (!content || isStreaming || modelStatus === 'loading') {
      return;
    }

    const userMessage: ChatMessage = { id: createId(), role: 'user', content, createdAt: Date.now() };
    setPendingUserMessage(userMessage);
    setDraft('');
    setStreamingText('');
    setIsStreaming(true);

    try {
      const request: ProviderGenerateRequest = {
        systemPrompt: SYSTEM_PROMPT,
        context: retrieveContext(messages, summary, content),
        userInput: content
      };

      let generated = '';
      await onGenerateWithProvider(request, (chunk) => {
        generated += chunk;
        setStreamingText(generated);
      });

      const assistantContent = generated.trim() || 'I could not generate a response.';
      const assistantMessage: ChatMessage = {
        id: createId(),
        role: 'assistant',
        content: assistantContent,
        createdAt: Date.now()
      };

      await onSend(userMessage, assistantMessage);
    } catch (error) {
      console.error(error);
      setStreamingText('Generation stopped or failed. Try provider connection test or reset model.');
    } finally {
      setPendingUserMessage(null);
      setIsStreaming(false);
      setTimeout(() => setStreamingText(''), 500);
    }
  };

  const renderedMessages = [...messages];
  if (pendingUserMessage && isStreaming) {
    renderedMessages.push(pendingUserMessage);
  }

  return (
    <section className="panel chat-panel">
      <div className="chat-toolbar">
        <div className="provider-badge-wrap">
          <StatusPill status={isStreaming ? 'generating' : modelStatus} />
          <span className="provider-badge">{activeProviderLabel}</span>
        </div>
        <div className="chat-actions">
          {isStreaming ? (
            <button className="ghost danger" onClick={() => void handleStop()}>
              Stop
            </button>
          ) : null}
          <button className="ghost" onClick={() => void onClear()}>
            Clear chat
          </button>
          <button className="ghost" onClick={() => void onResetModel()}>
            Reset runtime
          </button>
        </div>
      </div>

      {modelStatus === 'loading' ? (
        <div className="progress-wrap" role="status">
          <p className="helper-text">{modelProgressText}</p>
          <div className="progress-bar" aria-hidden>
            <span style={{ width: `${Math.round((modelProgressPct ?? 0) * 100)}%` }} />
          </div>
        </div>
      ) : null}

      {modelError ? <p className="error-text">{modelError}</p> : null}

      <div className="message-list" ref={listRef}>
        {renderedMessages.length === 0 ? (
          <p className="helper-text">Small phone, big brain: your memory stays local, provider can be local or bridge.</p>
        ) : null}
        {renderedMessages.map((message) => (
          <article key={message.id} className={`message message-${message.role}`}>
            <strong>{message.role === 'user' ? 'You' : 'PocketBrain'}</strong>
            <p>{message.content}</p>
          </article>
        ))}

        {isStreaming ? (
          <article className="message message-assistant">
            <strong>PocketBrain</strong>
            <p>{streamingText || 'Thinking…'}</p>
          </article>
        ) : null}
      </div>

      <div className="composer">
        <textarea
          placeholder="Type your message"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={2}
        />
        <button onClick={() => void handleSend()} disabled={isStreaming || !draft.trim() || modelStatus === 'loading'}>
          Send
        </button>
      </div>
    </section>
  );
};
