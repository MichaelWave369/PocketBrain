import { useEffect, useRef, useState } from 'react';
import { StatusPill } from '../components/StatusPill';
import { VoiceButton } from '../components/VoiceButton';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { retrieveContext } from '../retrieval/retriever';
import type { ProviderGenerateRequest } from '../providers/types';
import type { ChatMessage, MemorySummary, ModelStatus } from '../types';
import type { VoiceNote } from '../voice/types';
import { createId } from '../utils/id';

interface ChatPageProps {
  messages: ChatMessage[];
  summary: MemorySummary | null;
  voiceNotes: VoiceNote[];
  transcriptMemories: string[];
  modelStatus: ModelStatus;
  modelError: string | null;
  modelProgressText: string;
  modelProgressPct: number | null;
  activeProviderLabel: string;
  bridgeEnabled: boolean;
  onGenerateWithProvider: (request: ProviderGenerateRequest, onChunk: (chunk: string) => void) => Promise<void>;
  onSend: (userMessage: ChatMessage, assistantMessage: ChatMessage) => Promise<void>;
  onSaveVoiceNote: (note: VoiceNote) => Promise<void>;
  onTranscribeWithBridge: (audioBlob: Blob) => Promise<string>;
  onStopGeneration: () => Promise<void>;
  onClear: () => Promise<void>;
  onResetModel: () => Promise<void>;
}

const SYSTEM_PROMPT =
  'You are PocketBrain, a concise assistant. Keep memory and retrieval local-first, and use bridge providers only when configured by the user.';

export const ChatPage = ({
  messages,
  summary,
  voiceNotes,
  transcriptMemories,
  modelStatus,
  modelError,
  modelProgressText,
  modelProgressPct,
  activeProviderLabel,
  bridgeEnabled,
  onGenerateWithProvider,
  onSend,
  onSaveVoiceNote,
  onTranscribeWithBridge,
  onStopGeneration,
  onClear,
  onResetModel
}: ChatPageProps) => {
  const [draft, setDraft] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingUserMessage, setPendingUserMessage] = useState<ChatMessage | null>(null);
  const [voiceNotice, setVoiceNotice] = useState('');
  const [bridgeTranscribingId, setBridgeTranscribingId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const voice = useVoiceInput();

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, streamingText, voiceNotice]);

  const handleStop = async () => {
    await onStopGeneration();
    setIsStreaming(false);
  };

  const handleVoiceStop = async () => {
    const result = await voice.stopRecording();
    if (!result) {
      return;
    }

    const id = createId();
    const note: VoiceNote = {
      id,
      createdAt: Date.now(),
      durationMs: result.durationMs,
      mimeType: result.mimeType,
      audioBlob: result.blob,
      transcript: result.transcript
    };

    await onSaveVoiceNote(note);

    if (result.transcript) {
      setDraft((previous) => `${previous} ${result.transcript}`.trim());
      setVoiceNotice('✅ Voice transcribed and inserted into draft.');
      return;
    }

    setVoiceNotice('Voice capture saved, transcription unavailable on this browser.');
  };

  const transcribeWithBridge = async (note: VoiceNote) => {
    setBridgeTranscribingId(note.id);
    try {
      const transcript = await onTranscribeWithBridge(note.audioBlob);
      setDraft((previous) => `${previous} ${transcript}`.trim());
      setVoiceNotice('✅ Bridge transcription inserted into draft.');
    } catch (error) {
      setVoiceNotice(error instanceof Error ? error.message : 'Bridge transcription failed.');
    } finally {
      setBridgeTranscribingId(null);
    }
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
        context: retrieveContext(messages, summary, {
          userInput: content,
          draftInput: draft,
          transcriptMemories
        }),
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
          <VoiceButton
            state={voice.state}
            elapsedLabel={voice.elapsedLabel}
            onStart={voice.beginRecording}
            onStop={handleVoiceStop}
            onCancel={voice.cancelRecording}
            onRetry={voice.retry}
          />
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
      {voice.error ? <p className="error-text">{voice.error}</p> : null}
      {voiceNotice ? <p className="helper-text">{voiceNotice}</p> : null}

      {bridgeEnabled ? (
        <div className="voice-note-strip">
          {voiceNotes.filter((note) => !note.transcript).slice(0, 2).map((note) => (
            <button
              key={note.id}
              className="ghost"
              onClick={() => void transcribeWithBridge(note)}
              disabled={bridgeTranscribingId === note.id}
            >
              {bridgeTranscribingId === note.id ? 'Transcribing…' : 'Transcribe using Bridge'}
            </button>
          ))}
        </div>
      ) : null}

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
