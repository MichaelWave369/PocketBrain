import { useEffect, useRef, useState } from 'react';
import { StatusPill } from '../components/StatusPill';
import { generateReplyStream, stopGeneration } from '../model/webllmService';
import { retrieveContext } from '../retrieval/retriever';
import type { ChatMessage, MemorySummary, ModelStatus } from '../types';
import { createId } from '../utils/id';

interface ChatPageProps {
  messages: ChatMessage[];
  summary: MemorySummary | null;
  modelStatus: ModelStatus;
  modelError: string | null;
  modelProgressText: string;
  modelProgressPct: number | null;
  onSend: (userMessage: ChatMessage, assistantMessage: ChatMessage) => Promise<void>;
  onClear: () => Promise<void>;
  onResetModel: () => Promise<void>;
  modelEngineReady: boolean;
  modelEngine: import('../model/webllmService').WebLlmEngine | null;
  setModelStatus: (status: ModelStatus) => void;
}

const SYSTEM_PROMPT = 'You are PocketBrain, a concise assistant running locally in a private environment.';

export const ChatPage = ({
  messages,
  summary,
  modelStatus,
  modelError,
  modelProgressText,
  modelProgressPct,
  onSend,
  onClear,
  onResetModel,
  modelEngineReady,
  modelEngine,
  setModelStatus
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
    if (!modelEngine) {
      return;
    }

    await stopGeneration(modelEngine);
    setIsStreaming(false);
    setModelStatus('ready');
  };

  const handleSend = async () => {
    const content = draft.trim();
    if (!content || !modelEngine || !modelEngineReady || isStreaming) {
      return;
    }

    const userMessage: ChatMessage = { id: createId(), role: 'user', content, createdAt: Date.now() };
    setPendingUserMessage(userMessage);
    setDraft('');
    setStreamingText('');
    setIsStreaming(true);
    setModelStatus('generating');

    try {
      const context = retrieveContext(messages, summary, content);

      let generated = '';
      for await (const chunk of generateReplyStream(modelEngine, SYSTEM_PROMPT, context, content)) {
        generated += chunk;
        setStreamingText(generated);
      }

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
      setStreamingText('Generation stopped or failed. Try resetting the model.');
    } finally {
      setPendingUserMessage(null);
      setIsStreaming(false);
      setModelStatus('ready');
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
        <StatusPill status={isStreaming ? 'generating' : modelStatus} />
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
            Reset model
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
        {renderedMessages.length === 0 ? <p className="helper-text">Start the first conversation turn.</p> : null}
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
        <button onClick={() => void handleSend()} disabled={!modelEngineReady || isStreaming || !draft.trim()}>
          Send
        </button>
      </div>
    </section>
  );
};
