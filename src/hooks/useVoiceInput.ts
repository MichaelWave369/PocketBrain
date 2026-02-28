import { useMemo, useRef, useState } from 'react';
import { startRecording, type RecordingSession } from '../voice/recorder';
import { isBrowserTranscriptionSupported, transcribeWithBrowserSpeech } from '../voice/transcription';
import type { VoiceResult, VoiceState } from '../voice/types';

export const useVoiceInput = () => {
  const [state, setState] = useState<VoiceState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const sessionRef = useRef<RecordingSession | null>(null);
  const timerRef = useRef<number | null>(null);

  const cleanupTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const beginRecording = async () => {
    setError(null);
    setState('requesting_permission');
    setElapsedMs(0);

    try {
      const session = await startRecording();
      sessionRef.current = session;
      setState('recording');
      const startedAt = Date.now();
      cleanupTimer();
      timerRef.current = window.setInterval(() => {
        setElapsedMs(Date.now() - startedAt);
      }, 250);
    } catch (reason) {
      setState('error');
      setError(reason instanceof Error ? reason.message : 'Microphone permission denied.');
    }
  };

  const stopRecording = async (): Promise<VoiceResult | null> => {
    if (!sessionRef.current) {
      return null;
    }

    cleanupTimer();
    setState('transcribing');

    try {
      const recording = await sessionRef.current.stop();
      sessionRef.current = null;

      if (!isBrowserTranscriptionSupported()) {
        setState('ready');
        return {
          blob: recording.blob,
          durationMs: recording.durationMs,
          mimeType: recording.mimeType,
          transcriptionSupported: false
        };
      }

      try {
        const transcript = await transcribeWithBrowserSpeech();
        setState('ready');
        return {
          blob: recording.blob,
          durationMs: recording.durationMs,
          mimeType: recording.mimeType,
          transcript,
          transcriptionSupported: true
        };
      } catch {
        setState('ready');
        return {
          blob: recording.blob,
          durationMs: recording.durationMs,
          mimeType: recording.mimeType,
          transcriptionSupported: false
        };
      }
    } catch (reason) {
      setState('error');
      setError(reason instanceof Error ? reason.message : 'Failed to process voice recording.');
      return null;
    }
  };

  const cancelRecording = () => {
    cleanupTimer();
    sessionRef.current?.cancel();
    sessionRef.current = null;
    setElapsedMs(0);
    setState('idle');
  };

  const retry = () => {
    setState('idle');
    setError(null);
  };

  const elapsedLabel = useMemo(() => {
    const seconds = Math.floor(elapsedMs / 1000);
    const mins = Math.floor(seconds / 60);
    const remain = seconds % 60;
    return `${mins}:${remain.toString().padStart(2, '0')}`;
  }, [elapsedMs]);

  return {
    state,
    error,
    elapsedLabel,
    beginRecording,
    stopRecording,
    cancelRecording,
    retry,
    browserTranscriptionSupported: isBrowserTranscriptionSupported()
  };
};
