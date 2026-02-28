import { useEffect, useMemo, useRef, useState } from 'react';
import { isSpeechSynthesisSupported, waitForVoices } from '../tts/speech';
import type { TtsSettings, TtsState } from '../tts/types';

export const useSpeechSynthesis = (settings: TtsSettings) => {
  const [state, setState] = useState<TtsState>(isSpeechSynthesisSupported() ? 'loading_voices' : 'unsupported');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const speakingTextRef = useRef('');

  useEffect(() => {
    if (!isSpeechSynthesisSupported()) {
      setState('unsupported');
      return;
    }

    void (async () => {
      setState('loading_voices');
      const nextVoices = await waitForVoices();
      setVoices(nextVoices);
      setState(nextVoices.length ? 'ready' : 'error');
      if (!nextVoices.length) setError('No speech voices available.');
    })();
  }, []);

  const speak = (text: string) => {
    if (!settings.enabled || !isSpeechSynthesisSupported()) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = settings.rate;
      utterance.pitch = settings.pitch;
      utterance.volume = settings.volume;
      const selected = voices.find((voice) => voice.voiceURI === settings.voiceURI);
      if (selected) utterance.voice = selected;
      utterance.onstart = () => setState('speaking');
      utterance.onend = () => setState('ready');
      utterance.onerror = () => {
        setState('error');
        setError('Speech output failed.');
      };
      speakingTextRef.current = text;
      window.speechSynthesis.speak(utterance);
    } catch (reason) {
      setState('error');
      setError(reason instanceof Error ? reason.message : 'Unable to start speech synthesis.');
    }
  };

  const pause = () => {
    if (!isSpeechSynthesisSupported()) return;
    window.speechSynthesis.pause();
    setState('paused');
  };

  const resume = () => {
    if (!isSpeechSynthesisSupported()) return;
    window.speechSynthesis.resume();
    setState('speaking');
  };

  const stop = () => {
    if (!isSpeechSynthesisSupported()) return;
    window.speechSynthesis.cancel();
    setState(voices.length ? 'ready' : 'error');
  };

  const isSpeakingText = (text: string) => state === 'speaking' && speakingTextRef.current === text;

  return {
    state,
    voices,
    error,
    speak,
    pause,
    resume,
    stop,
    isSpeakingText,
    statusLabel: useMemo(() => state.replace('_', ' '), [state])
  };
};
